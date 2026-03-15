/**
 * Authentication and Authorization Middleware
 *
 * SECURITY: This middleware verifies JWT tokens from AWS Cognito
 * and extracts user information for authorization checks.
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// AWS Cognito configuration
const REGION = process.env.AWS_REGION || 'us-east-1';
const USER_POOL_ID = process.env.AWS_USER_POOL_ID;

if (!USER_POOL_ID) {
  console.error('SECURITY WARNING: AWS_USER_POOL_ID environment variable is not set!');
  console.error('Authentication middleware will not function properly.');
}

// JWKS client to fetch public keys from Cognito
const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

/**
 * Get the signing key from JWKS
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) =>
    err ? callback(err) : callback(null, key.getPublicKey())
  );
}

/**
 * Verify JWT token from Cognito
 */
async function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        issuer: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

/**
 * Authentication Middleware
 *
 * Verifies that the request has a valid JWT token from Cognito.
 * Attaches decoded user info to req.user for use in route handlers.
 *
 * Usage: app.get('/protected-route', authenticateToken, (req, res) => { ... })
 */
async function authenticateToken(req, res, next) {
  // Extract token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required. No token provided.'
    });
  }

  try {
    // Verify the token
    const decoded = await verifyToken(token);

    // Attach user info to request
    req.user = {
      sub: decoded.sub, // Cognito user ID
      username: decoded['cognito:username'],
      email: decoded.email,
      groups: decoded['cognito:groups'] || [],
      isAdmin: decoded['custom:admin'] === 'true'
    };

    // Log authentication for audit trail
    console.log(`[AUTH] User ${req.user.username} authenticated for ${req.method} ${req.path}`);

    next();
  } catch (err) {
    console.error('[AUTH] Token verification failed:', err.message);
    return res.status(403).json({
      message: 'Invalid or expired token.'
    });
  }
}

/**
 * Authorization Middleware - Admin Only
 *
 * Requires that the authenticated user has admin privileges.
 * Must be used AFTER authenticateToken middleware.
 *
 * Usage: app.delete('/admin-route', authenticateToken, requireAdmin, (req, res) => { ... })
 */
function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    console.log(`[AUTHZ] User ${req.user.username} denied admin access to ${req.method} ${req.path}`);
    return res.status(403).json({ message: 'Admin privileges required.' });
  }
  console.log(`[AUTHZ] Admin ${req.user.username} authorized for ${req.method} ${req.path}`);
  next();
}

/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter to prevent abuse.
 * For production, consider using Redis-based rate limiting.
 */
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const record = requestCounts.get(ip);

  if (now > record.resetTime) {
    // Reset the counter
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      message: 'Too many requests. Please try again later.'
    });
  }

  record.count++;
  next();
}

// Clean up old rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const inputValidation = {
  sanitizeString: (str, max = 255) =>
    typeof str !== 'string' ? '' : str.replace(/\0/g, '').trim().substring(0, max),

  validatePositiveInt: value => { const n = parseInt(value, 10); return !isNaN(n) && n > 0; },

  validateEmail: email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),

  validateDate: dateStr => /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(new Date(dateStr)),

  validateLatitude:  lat => { const n = parseFloat(lat); return !isNaN(n) && n >= -90  && n <= 90;  },
  validateLongitude: lng => { const n = parseFloat(lng); return !isNaN(n) && n >= -180 && n <= 180; },

  validateFilename: filename =>
    typeof filename === 'string' &&
    !filename.includes('..') && !filename.includes('/') && !filename.includes('\\') &&
    filename.length > 0 && filename.length <= 255,
};

module.exports = {
  authenticateToken,
  requireAdmin,
  rateLimiter,
  inputValidation
};
