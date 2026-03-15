/**
 * Supabase configuration for incident metadata storage
 * ────────────────────────────────────────────────────────
 * SECURITY: This module should ONLY be imported in backend services.
 * NEVER expose Supabase credentials or this module to frontend code.
 *
 * Supabase stores:
 *   - Incident metadata (timestamp, type, camera, building, floor, location)
 *   - S3 clip URLs (presigned URLs generated on-demand)
 *   - Safety scores and computed metrics
 *
 * S3 stores:
 *   - Actual video clip files (.mp4)
 *
 * Required env vars (server/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[Supabase] Configuration missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env');
  console.warn('[Supabase] Supabase features will be disabled until configured.');
}

// Create Supabase client (service role for backend operations)
// Using service role key to bypass RLS policies for backend operations
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

module.exports = supabase;
