/**
 * Node Safety Dashboard - Secure Backend Server
 *
 * SECURITY IMPROVEMENTS:
 * - JWT authentication on all protected routes
 * - Authorization checks for admin operations
 * - Rate limiting to prevent abuse
 * - Input validation on all endpoints
 * - Request logging for audit trail
 * - Secure Cognito operations moved to backend
 */

require('dotenv').config();
const express = require("express");
const db = require("./config/db");
const cors = require("cors");
const { getSafetyScores, getIncidentsForRange, addPresignedUrls } = require('./services/incidentService');
const { authenticateToken, requireAdmin, rateLimiter, inputValidation } = require('./middleware/auth');
const { listUsers, deleteUser } = require('./services/cognitoService');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000' }));
app.use(express.json());
app.use(rateLimiter); // Apply rate limiting to all routes

// Request logging for audit trail
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ============================================================================
// COGNITO USER MANAGEMENT ENDPOINTS (ADMIN ONLY)
// ============================================================================

/**
 * GET /v1/api/cognito/users
 * List all Cognito users (Admin only)
 * SECURITY: Requires valid JWT token + admin privileges
 */
app.get("/v1/api/cognito/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ users });
  } catch (error) {
    console.error('[Cognito] Error listing users:', error);
    res.status(500).json({ message: 'Failed to list users' });
  }
});

/**
 * DELETE /v1/api/cognito/users/:username
 * Delete a Cognito user (Admin only)
 * SECURITY: Requires valid JWT token + admin privileges
 */
app.delete("/v1/api/cognito/users/:username", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const username = inputValidation.sanitizeString(req.params.username, 128);

    if (!username || username.length === 0) {
      return res.status(400).json({ message: 'Invalid username' });
    }

    await deleteUser(username);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[Cognito] Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// ============================================================================
// PUBLIC ENDPOINTS (Read-only data for authenticated users)
// ============================================================================

/**
 * GET /v1/api/building-details
 * Get all buildings with coordinates
 * SECURITY: Requires authentication
 */
app.get("/v1/api/building-details", authenticateToken, (req, res) => {
  db.query(
    "SELECT building_name, lat, lng FROM cam_sur.building",
    (error, result) => {
      if (error) {
        console.error('[DB Error]', error);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/floor-detail
 * Get floor and camera details for a building
 * SECURITY: Requires authentication + input validation
 */
app.get("/v1/api/floor-detail", authenticateToken, (req, res) => {
  const buildingName = inputValidation.sanitizeString(req.query.buildingName, 255);

  if (!buildingName) {
    return res.status(400).json({ message: 'Building name is required' });
  }

  db.query(
    "SELECT * FROM cam_sur.floor LEFT JOIN cam_sur.camera ON floor.building_name = camera.building_name AND floor.floor_num = camera.floor_num WHERE floor.building_name = ?",
    [buildingName],
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }

      const filtered_result = result.filter(obj =>
        obj.building_name != null && obj.floor_num != null
      );

      res.json(filtered_result);
    }
  );
});

/**
 * GET /v1/api/user-detail
 * Get cameras assigned to a user
 * SECURITY: Requires authentication + user can only query their own ID or admin
 */
app.get("/v1/api/user-detail", authenticateToken, (req, res) => {
  const user_id = req.query.user_id;

  if (!inputValidation.validatePositiveInt(user_id)) {
    return res.status(400).json({ message: 'Invalid user_id' });
  }

  // SECURITY: Users can only query their own data unless they're admin
  // Note: This assumes user_id in DB maps to Cognito user sub
  // Adjust authorization logic based on your user ID mapping
  if (req.user.sub !== user_id && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Unauthorized to view other user data' });
  }

  db.query(
    "SELECT camera_id FROM user_camera_info WHERE user_id=?",
    [user_id],
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/camera-detail
 * Get total camera count
 * SECURITY: Requires authentication
 */
app.get("/v1/api/camera-detail", authenticateToken, (req, res) => {
  db.query(
    "SELECT COUNT(*) as count FROM cam_sur.camera",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/camera-select
 * Get all cameras
 * SECURITY: Requires authentication
 */
app.get("/v1/api/camera-select", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM cam_sur.camera",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/dashboard-feed
 * Get dashboard video feeds
 * SECURITY: Requires authentication
 */
app.get("/v1/api/dashboard-feed", authenticateToken, (req, res) => {
  db.query(
    "SELECT * FROM cam_sur.dashboard_feeds",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/building-count
 * Get total building count
 * SECURITY: Requires authentication
 */
app.get("/v1/api/building-count", authenticateToken, (req, res) => {
  db.query(
    "SELECT COUNT(*) as count FROM cam_sur.building",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/inactive-active-cameras
 * Get count of active and inactive cameras
 * SECURITY: Requires authentication
 */
app.get("/v1/api/inactive-active-cameras", authenticateToken, (req, res) => {
  db.query(
    "SELECT SUM(CASE WHEN network_state = 0 THEN 1 ELSE 0 END) AS inactive, SUM(CASE WHEN network_state = 1 THEN 1 ELSE 0 END) AS active FROM cam_sur.camera",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/camera-table
 * Get camera statistics by building
 * SECURITY: Requires authentication
 */
app.get("/v1/api/camera-table", authenticateToken, (req, res) => {
  db.query(
    "SELECT building_name, COUNT(*) AS num_cameras, SUM(CASE WHEN network_state = 1 THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN network_state = 0 THEN 1 ELSE 0 END) AS inactive FROM cam_sur.camera GROUP BY building_name",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/recent-alerts
 * Get 10 most recent alerts
 * SECURITY: Requires authentication
 */
app.get("/v1/api/recent-alerts", authenticateToken, (req, res) => {
  db.query(
    "SELECT building_name, event_type, event_date, camera_loc FROM cam_sur.event JOIN cam_sur.camera ON cam_sur.event.camera_id = cam_sur.camera.camera_id ORDER BY event_id DESC LIMIT 10",
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

/**
 * GET /v1/api/all-alerts
 * Get all alerts (paginated)
 * SECURITY: Requires authentication + pagination to prevent data dump
 */
app.get("/v1/api/all-alerts", authenticateToken, (req, res) => {
  // Add pagination to prevent dumping entire database
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000); // Max 1000 per request
  const offset = (page - 1) * limit;

  db.query(
    "SELECT building_name, event_type, event_date, camera_loc FROM cam_sur.event JOIN cam_sur.camera ON cam_sur.event.camera_id = cam_sur.camera.camera_id ORDER BY event_id DESC LIMIT ? OFFSET ?",
    [limit, offset],
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json(result);
    }
  );
});

// ============================================================================
// WRITE OPERATIONS (Admin or specific authorization required)
// ============================================================================

/**
 * POST /v1/api/user-detail
 * Assign a camera to a user
 * SECURITY: Requires authentication + admin privileges
 */
app.post("/v1/api/user-detail", authenticateToken, requireAdmin, (req, res) => {
  const user_id = req.body.user_id;
  const camera_id = req.body.camera_id;

  if (!inputValidation.validatePositiveInt(user_id) || !inputValidation.validatePositiveInt(camera_id)) {
    return res.status(400).json({ message: 'Invalid user_id or camera_id' });
  }

  db.query(
    "INSERT INTO user_camera_info (user_id, camera_id) VALUES (?, ?)",
    [user_id, camera_id],
    (err, result) => {
      if (err) {
        console.error('[DB Error]', err);
        return res.status(500).json({ message: 'Database error' });
      }
      res.json({ message: 'Camera assigned to user successfully' });
    }
  );
});

/**
 * POST /v1/api/building
 * Add a new building
 * SECURITY: Requires authentication + admin privileges + input validation
 */
app.post("/v1/api/building", authenticateToken, requireAdmin, (req, res) => {
  const building_name = inputValidation.sanitizeString(req.body.building_name, 255);
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  if (!building_name || !inputValidation.validateLatitude(lat) || !inputValidation.validateLongitude(lng)) {
    return res.status(400).json({ message: 'Invalid building name, latitude, or longitude' });
  }

  db.query(
    "INSERT INTO cam_sur.building (building_name, lat, lng) VALUES (?, ?, ?)",
    [building_name, lat, lng],
    (error, result) => {
      if (error) {
        console.error('[DB Error]', error);
        return res.status(500).json({ message: 'Error adding building' });
      }
      res.json({ message: 'Building added successfully' });
    }
  );
});

/**
 * POST /v1/api/switch-feed
 * Update dashboard feed
 * SECURITY: Requires authentication + admin privileges + input validation
 */
app.post("/v1/api/switch-feed", authenticateToken, requireAdmin, (req, res) => {
  const feed_id = req.body.feed_id;
  const building_name = inputValidation.sanitizeString(req.body.building_name, 255);
  const floor_num = parseInt(req.body.floor_num, 10);
  const camera_id = parseInt(req.body.camera_id, 10);
  const camera_loc = inputValidation.sanitizeString(req.body.camera_loc, 255);
  const feed_url = inputValidation.sanitizeString(req.body.feed_url, 2048);

  if (!inputValidation.validatePositiveInt(feed_id) || !building_name ||
      isNaN(floor_num) || !inputValidation.validatePositiveInt(camera_id) ||
      !camera_loc || !feed_url) {
    return res.status(400).json({ message: 'Invalid input parameters' });
  }

  db.query(
    "UPDATE cam_sur.dashboard_feeds SET building_name=?, floor_num=?, camera_id=?, camera_loc=?, feed_url=? WHERE feed_id=?",
    [building_name, floor_num, camera_id, camera_loc, feed_url, feed_id],
    (error, result) => {
      if (error) {
        console.error('[DB Error]', error);
        return res.status(500).json({ message: 'Error changing video feed' });
      }
      res.json({ message: 'Video feed changed successfully' });
    }
  );
});

/**
 * DELETE /v1/api/delete_camera/:camera_id
 * Delete a camera
 * SECURITY: Requires authentication + admin privileges + input validation
 */
app.delete("/v1/api/delete_camera/:camera_id", authenticateToken, requireAdmin, (req, res) => {
  const camera_id = parseInt(req.params.camera_id, 10);

  if (!inputValidation.validatePositiveInt(camera_id)) {
    return res.status(400).json({ message: 'Invalid camera_id' });
  }

  db.query(
    "DELETE FROM cam_sur.camera WHERE camera_id = ?",
    [camera_id],
    (error, result) => {
      if (error) {
        console.error('[DB Error]', error);
        return res.status(500).json({ message: 'Error deleting camera record' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Camera record not found' });
      }
      res.json({ message: 'Camera record deleted successfully' });
    }
  );
});

/**
 * POST /v1/api/addFloor
 * Add a new floor and camera
 * SECURITY: Requires authentication + admin privileges + input validation
 */
app.post("/v1/api/addFloor", authenticateToken, requireAdmin, (req, res) => {
  const building_name = inputValidation.sanitizeString(req.body.building_name, 255);
  const floor_num = parseInt(req.body.floor_num, 10);
  const camera_name = inputValidation.sanitizeString(req.body.camera_name, 255);
  const camera_loc = inputValidation.sanitizeString(req.body.camera_loc, 255);
  const date_of_installation = req.body.date_of_installation;

  if (!building_name || isNaN(floor_num) || floor_num === 0 ||
      !camera_name || !camera_loc) {
    return res.status(400).json({ message: 'Missing or invalid required fields' });
  }

  // Validate date if provided
  if (date_of_installation && !inputValidation.validateDate(date_of_installation)) {
    return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
  }

  const addCamera = () => {
    db.query(
      "INSERT INTO cam_sur.camera (building_name, floor_num, camera_name, camera_loc, date_of_installation) VALUES (?, ?, ?, ?, DATE(?))",
      [building_name, floor_num, camera_name, camera_loc, date_of_installation],
      (error) => {
        if (error) {
          console.error('[DB Error]', error);
          return res.status(500).json({ message: 'Error adding camera' });
        }
        res.json({ message: 'Camera added successfully' });
      }
    );
  };

  db.query(
    "INSERT INTO cam_sur.floor (building_name, floor_num) VALUES (?, ?)",
    [building_name, floor_num],
    (error) => {
      if (error) {
        // Floor may already exist — proceed to add the camera
        console.warn('[DB] Floor insert skipped (may already exist):', error.code);
      }
      addCamera();
    }
  );
});

/**
 * POST /v1/api/billing
 * Update billing information
 * SECURITY: Requires authentication + uses authenticated user's ID
 */
app.post("/v1/api/billing", authenticateToken, (req, res) => {
  // SECURITY FIX: Use the authenticated user's ID from the JWT token
  // Instead of hardcoded user_id = 1
  // Note: This assumes user_id in transactions table maps to Cognito user sub
  // Adjust mapping based on your database schema

  const user_id = req.user.sub; // Get user ID from authenticated token
  const balance_rem = parseFloat(req.body.balance_rem) || 0;

  if (balance_rem < 0) {
    return res.status(400).json({ message: 'Invalid balance amount' });
  }

  db.query(
    "UPDATE transactions SET balance_rem = ? WHERE user_id = ?",
    [balance_rem, user_id],
    (error, result) => {
      if (error) {
        console.error('[DB Error]', error);
        return res.status(500).json({ message: 'Error updating billing data' });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User billing record not found' });
      }
      res.json({ message: 'Billing data updated successfully' });
    }
  );
});

// ============================================================================
// SAFETY SCORES & INCIDENTS (S3-based data)
// ============================================================================

/**
 * GET /v1/api/safety-scores
 * Get safety scores computed from S3 incident data
 * SECURITY: Requires authentication
 */
app.get('/v1/api/safety-scores', authenticateToken, async (req, res) => {
  try {
    const scores = await getSafetyScores();
    res.json(scores);
  } catch (err) {
    console.error('[safety-scores]', err.message);
    res.status(500).json({ message: 'Error computing safety scores' });
  }
});

/**
 * GET /v1/api/incidents
 * Get incidents for a specific date (default: today)
 * Query params: ?date=YYYY-MM-DD
 * SECURITY: Requires authentication + date validation
 */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
app.get('/v1/api/incidents', authenticateToken, async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().slice(0, 10);

    if (!DATE_RE.test(dateStr)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);

    let incidents = await getIncidentsForRange(start, end);
    incidents = await addPresignedUrls(incidents);

    res.json(incidents);
  } catch (err) {
    console.error('[incidents]', err.message);
    res.status(500).json({ message: 'Error fetching incidents' });
  }
});

// ============================================================================
// HEALTH CHECK (No authentication required)
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🚀 Secure Node Safety Dashboard Server`);
  console.log(`===========================================`);
  console.log(`Port: ${PORT}`);
  console.log(`CORS: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`===========================================`);
  console.log(`✓ Authentication: ENABLED`);
  console.log(`✓ Rate Limiting: ENABLED`);
  console.log(`✓ Request Logging: ENABLED`);
  console.log(`===========================================`);
});
