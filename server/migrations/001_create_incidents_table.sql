-- ============================================================================
-- Supabase Database Schema for Node Safety Dashboard
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to create the incidents table
-- Dashboard → SQL Editor → New Query → Paste → Run

-- ============================================================================
-- INCIDENTS TABLE
-- ============================================================================
-- Stores metadata for safety incidents detected by Jetson devices
-- Video clips are stored in S3, only metadata and S3 keys stored here

CREATE TABLE IF NOT EXISTS incidents (
  -- Primary key: timestamp-camera_id format
  id TEXT PRIMARY KEY,

  -- Incident timestamp (ISO 8601, UTC)
  timestamp TIMESTAMPTZ NOT NULL,

  -- Incident type (must match server/config/scoring.js keys)
  -- Examples: 'no-high-vis', 'mhe-close-2.5m', 'walkway-exit', etc.
  incident_type TEXT NOT NULL,

  -- Camera identifier
  camera_id TEXT NOT NULL,

  -- Building information
  building_name TEXT NOT NULL,
  floor_num INTEGER NOT NULL DEFAULT 1,
  location TEXT,

  -- S3 storage reference for video clip
  -- Format: clips/<YYYY-MM-DD>/<camera-id>-<timestamp>.mp4
  clip_s3_key TEXT,

  -- Clip duration in seconds
  duration_seconds NUMERIC,

  -- Auto-set creation timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR QUERY PERFORMANCE
-- ============================================================================

-- Primary query pattern: fetch incidents by date range
CREATE INDEX IF NOT EXISTS idx_incidents_timestamp
ON incidents (timestamp DESC);

-- Filter by camera
CREATE INDEX IF NOT EXISTS idx_incidents_camera_id
ON incidents (camera_id);

-- Filter by building (common dashboard query)
CREATE INDEX IF NOT EXISTS idx_incidents_building
ON incidents (building_name);

-- Filter by incident type (for analytics)
CREATE INDEX IF NOT EXISTS idx_incidents_type
ON incidents (incident_type);

-- Composite index for building + date queries
CREATE INDEX IF NOT EXISTS idx_incidents_building_timestamp
ON incidents (building_name, timestamp DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS to ensure only backend service role can access data
-- Frontend users cannot directly query Supabase, must go through backend API

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- No policies needed - service role key bypasses RLS by default
-- This ensures:
--   ✅ Backend API (with service role key) has full access
--   ❌ Direct client connections (with anon/publishable key) are blocked
--   ❌ Unauthorized access attempts are rejected

-- Optional: If you want to allow authenticated users to read via Supabase client
-- (Not recommended - use backend API instead)
-- CREATE POLICY "Allow authenticated read" ON incidents
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE incidents IS
'Safety incident metadata storage. Video clips stored in S3, referenced by clip_s3_key.';

COMMENT ON COLUMN incidents.id IS
'Primary key format: {timestamp}-{camera_id} for uniqueness';

COMMENT ON COLUMN incidents.timestamp IS
'UTC timestamp when incident occurred (ISO 8601)';

COMMENT ON COLUMN incidents.incident_type IS
'Incident classification - must match scoring rules in backend';

COMMENT ON COLUMN incidents.clip_s3_key IS
'S3 object key for video clip. Backend generates presigned URL for playback.';

COMMENT ON COLUMN incidents.duration_seconds IS
'Video clip duration in seconds';

-- ============================================================================
-- VERIFY INSTALLATION
-- ============================================================================
-- Run these queries to verify table was created correctly

-- Check table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'incidents';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'incidents';

-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'incidents';

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Insert a few sample incidents to verify everything works

INSERT INTO incidents (
  id,
  timestamp,
  incident_type,
  camera_id,
  building_name,
  floor_num,
  location,
  clip_s3_key,
  duration_seconds
) VALUES
  (
    '2026-03-15T10:30:00.000Z-cam-01',
    '2026-03-15T10:30:00.000Z',
    'no-high-vis',
    'cam-01',
    'Clark Building',
    1,
    'Main Entrance',
    'clips/2026-03-15/cam-01-10:30:00.mp4',
    3.5
  ),
  (
    '2026-03-15T11:45:00.000Z-cam-02',
    '2026-03-15T11:45:00.000Z',
    'mhe-close-2.5m',
    'cam-02',
    'Clark Building',
    1,
    'Loading Dock',
    'clips/2026-03-15/cam-02-11:45:00.mp4',
    5.2
  ),
  (
    '2026-03-15T14:20:00.000Z-cam-03',
    '2026-03-15T14:20:00.000Z',
    'walkway-exit',
    'cam-03',
    'Smith Warehouse',
    2,
    'Aisle 5',
    'clips/2026-03-15/cam-03-14:20:00.mp4',
    4.1
  )
ON CONFLICT (id) DO NOTHING;

-- Verify sample data
SELECT
  id,
  timestamp,
  incident_type,
  camera_id,
  building_name,
  floor_num,
  location
FROM incidents
ORDER BY timestamp DESC
LIMIT 5;

-- ============================================================================
-- USEFUL QUERIES FOR MONITORING
-- ============================================================================

-- Count incidents by type
SELECT incident_type, COUNT(*) as count
FROM incidents
GROUP BY incident_type
ORDER BY count DESC;

-- Count incidents by building
SELECT building_name, COUNT(*) as count
FROM incidents
GROUP BY building_name
ORDER BY count DESC;

-- Recent incidents (last 24 hours)
SELECT *
FROM incidents
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Daily incident counts (last 7 days)
SELECT
  DATE(timestamp) as date,
  COUNT(*) as count
FROM incidents
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Archive old incidents (optional - move to separate table)
-- CREATE TABLE incidents_archive AS
-- SELECT * FROM incidents
-- WHERE timestamp < NOW() - INTERVAL '90 days';

-- Delete old incidents (caution - ensure backups exist)
-- DELETE FROM incidents
-- WHERE timestamp < NOW() - INTERVAL '90 days';

-- Vacuum table to reclaim space after bulk deletes
-- VACUUM ANALYZE incidents;

-- Reindex for performance
-- REINDEX TABLE incidents;

-- ============================================================================
-- BACKUP & RESTORE
-- ============================================================================

-- Export to CSV (requires superuser or appropriate permissions)
-- COPY (SELECT * FROM incidents ORDER BY timestamp DESC)
-- TO '/tmp/incidents_backup.csv'
-- WITH (FORMAT CSV, HEADER);

-- Import from CSV
-- COPY incidents (id, timestamp, incident_type, camera_id, building_name,
--                 floor_num, location, clip_s3_key, duration_seconds)
-- FROM '/tmp/incidents_backup.csv'
-- WITH (FORMAT CSV, HEADER);

-- ============================================================================
-- COMPLETE! Your Supabase database is ready.
-- Next: Configure server/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
-- ============================================================================
