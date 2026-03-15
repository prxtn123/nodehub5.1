# Supabase Integration Setup Guide

This guide explains how to set up Supabase for the Node Safety Dashboard to store incident metadata and S3 URLs.

## Architecture Overview

### Data Storage Split:
- **Supabase (PostgreSQL)**: Incident metadata (timestamps, types, locations, S3 keys)
- **AWS S3**: Actual video clip files (.mp4)

### Data Flow:
1. Jetson device detects safety incident
2. Device uploads video clip to S3
3. Device calls backend API `POST /v1/api/incidents` with metadata
4. Backend stores metadata in Supabase
5. Dashboard queries backend API
6. Backend fetches metadata from Supabase + generates S3 presigned URLs
7. Dashboard displays incidents with video playback

## Security Model

✅ **Backend Only**: All Supabase operations happen server-side
✅ **Service Role Key**: Backend uses privileged key for full access
✅ **No Frontend Exposure**: Customers never see Supabase credentials
✅ **JWT Auth**: All API endpoints require authentication
✅ **Input Validation**: All incident data is sanitized before storage

## Supabase Project Setup

### 1. Create Supabase Project

Your project details:
- **URL**: https://nmquuxbnqewoknbqijqg.supabase.co
- **Publishable Key**: `sb_publishable_5gMP9lsnxBOZ0HpAb_HBpg_qAQKtdpZ` (NOT USED - frontend doesn't access Supabase)
- **Service Role Key**: Get from Supabase Dashboard → Settings → API → Service Role Key

### 2. Create Database Table

Run this SQL in Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  incident_type TEXT NOT NULL,
  camera_id TEXT NOT NULL,
  building_name TEXT NOT NULL,
  floor_num INTEGER NOT NULL DEFAULT 1,
  location TEXT,
  clip_s3_key TEXT,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX idx_incidents_timestamp ON incidents (timestamp DESC);
CREATE INDEX idx_incidents_camera_id ON incidents (camera_id);
CREATE INDEX idx_incidents_building ON incidents (building_name);
CREATE INDEX idx_incidents_type ON incidents (incident_type);

-- Enable Row Level Security (RLS) but allow service role to bypass
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- No policies needed - service role key bypasses RLS
-- This ensures only backend can access data, not direct client connections
```

### 3. Configure Environment Variables

Add to `server/.env` (NOT `/.env` - backend only!):

```bash
# Supabase Configuration (Backend Only)
SUPABASE_URL=https://nmquuxbnqewoknbqijqg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# AWS S3 Configuration (for video clips)
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BUCKET_NAME=your-bucket-name
S3_CLIPS_PREFIX=clips/
S3_CLIPS_PRESIGN_EXPIRES=3600
```

**⚠️ SECURITY WARNING**:
- Never commit `.env` files to git
- Never put Supabase credentials in frontend `.env` or code
- Use service role key (not anon/publishable key) in backend

### 4. Verify Installation

```bash
cd server
npm install
node index.js
```

You should see:
```
[Supabase] Configuration loaded
Database connected
Server running on port 3002
```

## API Endpoints

### Report Incident (Jetson → Backend)

```bash
POST /v1/api/incidents
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "timestamp": "2026-03-15T14:32:45.000Z",
  "incident_type": "no-high-vis",
  "camera_id": "cam-01",
  "building_name": "Clark Building",
  "floor_num": 1,
  "location": "Main Entrance",
  "clip_s3_key": "clips/2026-03-15/cam-01-14:32:45.mp4",
  "duration_seconds": 3.2
}
```

**Valid incident_types** (must match `server/config/scoring.js`):
- `no-high-vis`
- `mhe-close-2.5m`
- `mhe-close-1m`
- `walkway-exit`
- `walkway-congregation-2`
- `walkway-congregation-3`
- `dock-door-open`

### Fetch Incidents (Dashboard → Backend)

```bash
GET /v1/api/incidents?date=2026-03-15
Authorization: Bearer <jwt-token>
```

Returns enriched incident data with presigned S3 URLs for video playback.

### Safety Scores (Dashboard → Backend)

```bash
GET /v1/api/safety-scores
Authorization: Bearer <jwt-token>
```

Returns computed safety scores (today, week, month) based on incidents in Supabase.

## Migration from CSV

If you have existing CSV incident data in S3, use the migration script:

```bash
node server/scripts/migrateCSVToSupabase.js
```

This will:
1. Fetch all CSV files from S3 `incidents/` prefix
2. Parse incident data
3. Bulk insert into Supabase
4. Log progress and errors

## Testing

### Test Incident Creation

```bash
curl -X POST http://localhost:3002/v1/api/incidents \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-03-15T14:32:45.000Z",
    "incident_type": "no-high-vis",
    "camera_id": "cam-test-01",
    "building_name": "Test Building",
    "floor_num": 1,
    "location": "Test Area",
    "clip_s3_key": "clips/2026-03-15/test.mp4",
    "duration_seconds": 5.0
  }'
```

### Verify in Supabase

1. Open Supabase Dashboard → Table Editor
2. Select `incidents` table
3. Verify new row appears

## Monitoring

### Check Supabase Logs
- Dashboard → Logs → Postgres Logs
- Monitor query performance and errors

### Backend Logs
```bash
[Supabase] Query time: 45ms
[Supabase] Create incident: 2026-03-15T14:32:45.000Z-cam-01
[incidents] Presigned URL generated for clips/2026-03-15/cam-01-14:32:45.mp4
```

## Troubleshooting

### "Supabase not configured" Error
- Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `server/.env`
- Restart server after adding env vars

### "Invalid incident_type" Error
- Check incident type matches keys in `server/config/scoring.js`
- Valid types: `no-high-vis`, `mhe-close-2.5m`, etc.

### Presigned URL Failures
- Verify AWS credentials in `server/.env`
- Check S3 bucket name and region
- Ensure IAM permissions include `s3:GetObject`

### Empty Incidents Array
- Check if table has data: `SELECT COUNT(*) FROM incidents;`
- Verify date format in query: `YYYY-MM-DD`
- Check timezone handling (all timestamps are UTC)

## Performance Optimization

### Caching
- Backend caches Supabase queries for 5 minutes
- Safety scores cached for 5 minutes
- Presigned URLs valid for 1 hour (configurable)

### Indexes
All query patterns are indexed:
- `timestamp DESC` - for date range queries
- `camera_id` - for camera-specific filtering
- `building_name` - for building-specific queries
- `incident_type` - for type-based filtering

### Batch Operations
For bulk imports, use `bulkInsertIncidents()` which:
- Batches inserts (1000 records per batch)
- Uses `upsert` to handle duplicates
- Clears cache after completion

## Backup & Recovery

### Automatic Backups
Supabase provides automatic daily backups for Pro plan and above.

### Manual Export
```sql
-- Export incidents to CSV
COPY (SELECT * FROM incidents ORDER BY timestamp DESC)
TO '/tmp/incidents_backup.csv'
WITH (FORMAT CSV, HEADER);
```

### Manual Import
Use migration script or bulk insert API endpoint (admin only).

## Cost Estimation

### Supabase (Free Tier)
- 500 MB database
- Unlimited API requests
- 2 GB file storage
- Daily backups (7 day retention)

### Estimated Usage
- 1 incident = ~500 bytes metadata
- 10,000 incidents/month = 5 MB/month
- Free tier sufficient for 100,000+ incidents

### Upgrade Path
When hitting limits:
1. Pro plan ($25/mo): 8 GB database, point-in-time recovery
2. Optimize: Archive old incidents to cold storage
3. Partition: Split by customer/building if multi-tenant

## Next Steps

1. ✅ Configure Supabase credentials in `server/.env`
2. ✅ Run SQL migration to create table
3. ✅ Test incident reporting with curl/Postman
4. ✅ Verify dashboard displays incidents correctly
5. ✅ Configure Jetson devices to call new API endpoint
6. ⏳ (Optional) Migrate existing CSV data to Supabase
7. ⏳ Set up monitoring and alerts
8. ⏳ Configure backup strategy

## Support

For issues or questions:
1. Check logs: `tail -f server/logs/*.log`
2. Review this documentation
3. Check Supabase Dashboard for database errors
4. Review `server/services/supabaseService.js` for implementation details
