/**
 * Incident Service – Supabase-based metadata fetch with S3 presigned URLs
 * ────────────────────────────────────────────────────────────────────────────
 * Data pipeline (NEW with Supabase):
 *   Jetson device → Uploads clip to S3 → Calls backend API → Stores metadata in Supabase
 *   Dashboard → Queries backend API → Fetches from Supabase → Generates S3 presigned URLs
 *
 * This replaces the CSV-based approach with a proper database.
 *
 * Required env vars (server/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AWS_REGION, AWS_ACCESS_KEY_ID,
 *   AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME, S3_CLIPS_PRESIGN_EXPIRES
 */

const {
  getIncidentsByDateRange,
  getIncidentsByDate,
} = require('./supabaseService');

// AWS SDK loaded lazily so the app still starts if the package isn't installed yet
let S3Client, GetObjectCommand, getSignedUrl;
try {
  ({ S3Client, GetObjectCommand } = require('@aws-sdk/client-s3'));
  ({ getSignedUrl }               = require('@aws-sdk/s3-request-presigner'));
} catch {
  // SDK not installed – S3 features disabled
}

const { computeScore } = require('../config/scoring');

// ─── Config ───────────────────────────────────────────────────────────────────
const BUCKET          = process.env.S3_BUCKET_NAME;
const PRESIGN_EXPIRES = parseInt(process.env.S3_CLIPS_PRESIGN_EXPIRES || '3600', 10);

const s3 = (S3Client && BUCKET)
  ? new S3Client({ region: process.env.AWS_REGION || 'eu-west-2' })
  : null;

// ─── In-memory cache (5-minute TTL) ──────────────────────────────────────────
const _cache    = {};
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
  const e = _cache[key];
  if (!e) return null;
  if (Date.now() - e.at > CACHE_TTL) { delete _cache[key]; return null; }
  return e.v;
}
function setCached(key, v) { _cache[key] = { v, at: Date.now() }; }

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toDateStr(d)   { return d.toISOString().slice(0, 10); }
function startOfDay(d)  { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function startOfWeek(d) {
  const r = new Date(d); r.setHours(0,0,0,0);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); // roll back to Monday
  return r;
}
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

// ─── Range query (delegates to Supabase) ─────────────────────────────────────
async function getIncidentsForRange(startDate, endDate) {
  return getIncidentsByDateRange(startDate, endDate);
}

// ─── Presigned URL generation ─────────────────────────────────────────────────
async function addPresignedUrls(incidents) {
  if (!s3 || !BUCKET || !getSignedUrl) return incidents; // no S3 config

  return Promise.all(incidents.map(async (inc) => {
    if (!inc.clip_s3_key)                   return inc;
    if (inc.clip_s3_key.startsWith('http')) return { ...inc, video_url: inc.clip_s3_key };

    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: inc.clip_s3_key }),
        { expiresIn: PRESIGN_EXPIRES }
      );
      return { ...inc, video_url: url };
    } catch (err) {
      console.warn(`[incidents] Presign failed for ${inc.clip_s3_key}:`, err.message);
      return inc;
    }
  }));
}

// ─── Safety score computation ─────────────────────────────────────────────────
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Compute all safety score periods + 7-day history for the dashboard panel.
 * Returns the same shape as MOCK.safetyScores in dashboardApi.js.
 */
async function getSafetyScores() {
  const cacheKey = 'scores';
  const hit = getCached(cacheKey);
  if (hit) return hit;

  const now        = new Date();
  const todayStart = startOfDay(now);
  const weekStart  = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // Comparison periods for deltas
  const yStart  = new Date(todayStart.getTime() - 86400000); // yesterday same time window
  const yEnd    = new Date(now.getTime()         - 86400000);
  const lwStart = new Date(weekStart.getTime()  -  7 * 86400000);
  const lwEnd   = new Date(weekStart.getTime()  -  1);
  const lmStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1);
  const lmEnd   = new Date(monthStart.getTime() - 1);

  const [todayIncs, yIncs, weekIncs, lwIncs, monthIncs, lmIncs] = await Promise.all([
    getIncidentsForRange(todayStart, now),
    getIncidentsForRange(yStart,     yEnd),
    getIncidentsForRange(weekStart,  now),
    getIncidentsForRange(lwStart,    lwEnd),
    getIncidentsForRange(monthStart, now),
    getIncidentsForRange(lmStart,    lmEnd),
  ]);

  const todayScore = computeScore(todayIncs);
  const weekScore  = computeScore(weekIncs);
  const monthScore = computeScore(monthIncs);

  // 7-day daily score history (oldest → newest)
  const historyDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });
  const historyScores = await Promise.all(historyDates.map(async (d) => {
    const ds = startOfDay(d);
    const de = new Date(ds.getTime() + 86400000 - 1);
    return computeScore(await getIncidentsForRange(ds, de));
  }));
  const history = historyDates.map((d, i) => ({
    label: DAY_NAMES[d.getDay()],
    score: historyScores[i],
  }));

  const avgHistory = Math.round(historyScores.reduce((a, b) => a + b, 0) / historyScores.length);
  const UK_AVG     = 74; // TODO: replace with real market data feed

  const result = {
    today:        todayScore,
    week:         weekScore,
    month:        monthScore,
    today_delta:  Math.round((todayScore - computeScore(yIncs))  * 10) / 10,
    week_delta:   Math.round((weekScore  - computeScore(lwIncs)) * 10) / 10,
    month_delta:  Math.round((monthScore - computeScore(lmIncs)) * 10) / 10,
    history,
    uk_market_avg: UK_AVG,
    uk_percentile: Math.min(99, Math.max(1,
      todayScore >= UK_AVG
        ? Math.round(50 + ((todayScore - UK_AVG) / (100 - UK_AVG)) * 49)
        : Math.round((todayScore / UK_AVG) * 50)
    )),
    internal_avg: avgHistory,
    site_rank:    3,   // TODO: replace with real multi-site ranking
    total_sites:  12,
  };

  setCached(cacheKey, result);
  return result;
}

module.exports = { getSafetyScores, getIncidentsForRange, addPresignedUrls, toDateStr };
