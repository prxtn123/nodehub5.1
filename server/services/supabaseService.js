/**
 * Supabase Service – Incident metadata operations
 * ────────────────────────────────────────────────────────────────
 * Manages incident metadata storage in Supabase PostgreSQL database.
 *
 * Data Flow:
 *   Jetson device → Uploads clip to S3 → Calls API to store metadata in Supabase
 *   Backend → Generates presigned S3 URL → Stores URL + metadata in Supabase
 *   Dashboard → Queries backend API → Backend fetches from Supabase → Returns enriched data
 *
 * Table Schema (incidents):
 *   - id: text (primary key, format: "timestamp-camera_id")
 *   - timestamp: timestamptz (ISO 8601 timestamp of incident)
 *   - incident_type: text (matches SCORING_RULES keys)
 *   - camera_id: text
 *   - building_name: text
 *   - floor_num: integer
 *   - location: text (area/zone within building)
 *   - clip_s3_key: text (S3 object key, e.g., "clips/2026-03-15/cam-01-14:32:45.mp4")
 *   - duration_seconds: numeric
 *   - created_at: timestamptz (auto-set by Supabase)
 *
 * SECURITY: This module uses service role key for backend operations.
 *           NEVER expose this module or Supabase credentials to frontend.
 */

const supabase = require('../config/supabase');
const { SCORING_RULES } = require('../config/scoring');
const { makeCache } = require('../utils/cache');

const TABLE_NAME = 'incidents';
const cache = makeCache();

// ─── Helper: Enrich incident with scoring data ───────────────────────────────
function enrichIncident(row) {
  const rule = SCORING_RULES[row.incident_type];
  if (!rule) {
    console.warn(`[Supabase] Unknown incident_type "${row.incident_type}" – using defaults`);
  }

  const timestamp = new Date(row.timestamp);
  const h = timestamp.getUTCHours();
  let shift = 'night';
  if (h >= 6 && h < 14) shift = 'morning';
  else if (h >= 14 && h < 22) shift = 'afternoon';

  return {
    id: row.id,
    timestamp: row.timestamp,
    date: row.timestamp.slice(0, 10),
    time: row.timestamp.slice(11, 19),
    incident_type: row.incident_type,
    safety_event_type: row.incident_type, // frontend compatibility alias
    camera_id: row.camera_id,
    building_name: row.building_name,
    floor_num: row.floor_num,
    location: row.location,
    clip_s3_key: row.clip_s3_key,
    video_url: null, // populated by addPresignedUrls() in incidentService.js
    duration: row.duration_seconds ? `${parseFloat(row.duration_seconds).toFixed(1)}s` : null,
    duration_seconds: parseFloat(row.duration_seconds) || 0,
    risk_score: rule?.risk_score || 50,
    severity: rule?.severity || 'medium',
    label: rule?.label || row.incident_type,
    description: rule?.description || '',
    emoji: rule?.emoji || '⚠️',
    group: rule?.group || 'other',
    deduction: rule?.deduction || 0,
    shift,
  };
}

// ─── Create incident ──────────────────────────────────────────────────────────
/**
 * Store a new incident in Supabase.
 * Called when Jetson device reports a new safety incident.
 *
 * @param {Object} incident - Incident data
 * @param {string} incident.timestamp - ISO 8601 timestamp
 * @param {string} incident.incident_type - Type (must match SCORING_RULES)
 * @param {string} incident.camera_id - Camera identifier
 * @param {string} incident.building_name - Building name
 * @param {number} incident.floor_num - Floor number
 * @param {string} incident.location - Location within building
 * @param {string} incident.clip_s3_key - S3 key for video clip
 * @param {number} incident.duration_seconds - Clip duration
 * @returns {Promise<Object>} Created incident record
 */
async function createIncident(incident) {
  if (!supabase) {
    throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  // Validate incident_type
  if (!SCORING_RULES[incident.incident_type]) {
    throw new Error(`Invalid incident_type: "${incident.incident_type}". Must match SCORING_RULES.`);
  }

  const id = `${incident.timestamp}-${incident.camera_id}`;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      id,
      timestamp: incident.timestamp,
      incident_type: incident.incident_type,
      camera_id: incident.camera_id,
      building_name: incident.building_name,
      floor_num: incident.floor_num,
      location: incident.location,
      clip_s3_key: incident.clip_s3_key,
      duration_seconds: incident.duration_seconds,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Create incident error:', error);
    throw error;
  }

  // Clear cache on write
  cache.clearAll();

  return enrichIncident(data);
}

// ─── Fetch incidents by date range ────────────────────────────────────────────
/**
 * Fetch all incidents within a date range.
 *
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {Promise<Array>} Array of enriched incident objects
 */
async function getIncidentsByDateRange(startDate, endDate) {
  if (!supabase) {
    console.warn('[Supabase] Not configured, returning empty array');
    return [];
  }

  const cacheKey = `range:${startDate.toISOString()}-${endDate.toISOString()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[Supabase] Query error:', error);
    return [];
  }

  const enriched = (data || []).map(enrichIncident);
  cache.set(cacheKey, enriched);
  return enriched;
}

// ─── Fetch incidents for specific date ────────────────────────────────────────
/**
 * Fetch all incidents for a specific date (UTC).
 *
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of enriched incident objects
 */
async function getIncidentsByDate(dateStr) {
  if (!supabase) {
    console.warn('[Supabase] Not configured, returning empty array');
    return [];
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    console.warn(`[Supabase] Invalid date format: "${dateStr}"`);
    return [];
  }

  const cacheKey = `date:${dateStr}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const startDate = new Date(`${dateStr}T00:00:00.000Z`);
  const endDate = new Date(`${dateStr}T23:59:59.999Z`);

  const incidents = await getIncidentsByDateRange(startDate, endDate);
  cache.set(cacheKey, incidents);
  return incidents;
}

// ─── Bulk insert incidents ────────────────────────────────────────────────────
/**
 * Bulk insert multiple incidents (useful for CSV migration).
 *
 * @param {Array<Object>} incidents - Array of incident objects
 * @returns {Promise<Object>} Result with count of inserted records
 */
async function bulkInsertIncidents(incidents) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  if (!incidents || incidents.length === 0) {
    return { inserted: 0 };
  }

  // Transform incidents to database schema
  const records = incidents.map(inc => ({
    id: `${inc.timestamp}-${inc.camera_id}`,
    timestamp: inc.timestamp,
    incident_type: inc.incident_type,
    camera_id: inc.camera_id,
    building_name: inc.building_name,
    floor_num: inc.floor_num,
    location: inc.location,
    clip_s3_key: inc.clip_s3_key,
    duration_seconds: inc.duration_seconds || 0,
  }));

  // Insert in batches of 1000 (Supabase limit)
  const batchSize = 1000;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .upsert(batch, { onConflict: 'id' })
      .select();

    if (error) {
      console.error(`[Supabase] Bulk insert error (batch ${i / batchSize + 1}):`, error);
      throw error;
    }

    totalInserted += data?.length || 0;
  }

  // Clear cache after bulk insert
  cache.clearAll();

  return { inserted: totalInserted };
}

// ─── Delete incidents by date range ───────────────────────────────────────────
/**
 * Delete incidents within a date range (admin operation).
 *
 * @param {Date} startDate - Start of range
 * @param {Date} endDate - End of range
 * @returns {Promise<Object>} Result with count of deleted records
 */
async function deleteIncidentsByDateRange(startDate, endDate) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .gte('timestamp', startDate.toISOString())
    .lte('timestamp', endDate.toISOString())
    .select();

  if (error) {
    console.error('[Supabase] Delete error:', error);
    throw error;
  }

  // Clear cache after delete
  cache.clearAll();

  return { deleted: data?.length || 0 };
}

module.exports = {
  createIncident,
  getIncidentsByDateRange,
  getIncidentsByDate,
  bulkInsertIncidents,
  deleteIncidentsByDateRange,
};
