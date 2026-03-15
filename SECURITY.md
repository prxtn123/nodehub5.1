# Security Implementation Guide - Node Safety Dashboard

## Executive Summary

This document outlines the comprehensive security improvements implemented in the Node Safety Dashboard application to protect against common web vulnerabilities and ensure secure operation in production environments.

**Last Updated:** 2026-03-15
**Security Review Date:** 2026-03-15
**Status:** ✅ Major security vulnerabilities addressed

---

## Table of Contents

1. [Security Improvements Overview](#security-improvements-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [API Security](#api-security)
4. [Input Validation](#input-validation)
5. [Environment Configuration](#environment-configuration)
6. [AWS Integration Security](#aws-integration-security)
7. [Deployment Checklist](#deployment-checklist)
8. [Security Testing](#security-testing)
9. [Incident Response](#incident-response)

---

## Security Improvements Overview

### Critical Vulnerabilities Fixed

| Issue | Severity | Status | Description |
|-------|----------|--------|-------------|
| Demo Mode Bypass | CRITICAL | ✅ Fixed | Removed client-side authentication bypass via sessionStorage |
| No Backend Authentication | CRITICAL | ✅ Fixed | Added JWT verification middleware to all API endpoints |
| AWS Credentials in Frontend | CRITICAL | ✅ Fixed | Moved all AWS operations to backend |
| Hardcoded User Pool ID | CRITICAL | ✅ Fixed | Moved to environment variables |
| Hardcoded Billing User | CRITICAL | ✅ Fixed | Now uses authenticated user's ID from JWT |
| No Input Validation | HIGH | ✅ Fixed | Added comprehensive validation middleware |
| Hardcoded API URLs | HIGH | ✅ Fixed | Centralized configuration with environment variables |
| File Upload Vulnerabilities | HIGH | ✅ Fixed | Added filename validation and path traversal prevention |
| No Rate Limiting | MEDIUM | ✅ Fixed | Implemented rate limiting middleware |
| No Audit Logging | MEDIUM | ✅ Fixed | Added request logging for all API calls |
| Unrestricted Data Dumps | MEDIUM | ✅ Fixed | Added pagination to large data endpoints |

### Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER BROWSER                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React Frontend (AWS Amplify Hosted)                │   │
│  │  - No AWS credentials                                │   │
│  │  - Only Cognito User Pool ID (public)                │   │
│  │  - Authenticated API calls with JWT                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │ HTTPS + JWT Token
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           API Gateway (Optional, for file operations)        │
│           - Request validation                               │
│           - Throttling                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Backend Server                      │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Security Layers (in order):                          │ │
│  │  1. Rate Limiter (100 req/min per IP)                │ │
│  │  2. Request Logger (audit trail)                     │ │
│  │  3. JWT Authentication Middleware                    │ │
│  │  4. Authorization Middleware (admin checks)          │ │
│  │  5. Input Validation                                 │ │
│  └───────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Secure AWS Operations:                              │ │
│  │  - Cognito admin operations (list/delete users)      │ │
│  │  - S3 operations (incident data, presigned URLs)     │ │
│  │  - IAM credentials from environment/role             │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────┐      ┌──────────────┐      ┌──────────┐
│  MySQL   │      │  AWS Cognito │      │  AWS S3  │
│   RDS    │      │  User Pool   │      │  Bucket  │
└──────────┘      └──────────────┘      └──────────┘
```

---

## Authentication & Authorization

### JWT Token Flow

```javascript
// Frontend: src/config/api.js
1. User authenticates with AWS Cognito
2. Frontend obtains JWT token from Amplify Auth
3. All API requests include: Authorization: Bearer <token>

// Backend: server/middleware/auth.js
4. authenticateToken middleware verifies JWT signature
5. Validates token against Cognito public keys (JWKS)
6. Extracts user info and attaches to req.user
7. Checks authorization (admin status for sensitive operations)
```

### Implementation Details

**Frontend Authentication:**
```javascript
// src/components/ProtectedRoute.jsx
// ✅ FIXED: Removed demo mode bypass
Auth.currentAuthenticatedUser()
  .then(() => setStatus('ok'))
  .catch(() => setStatus('denied'));
```

**Backend Authentication:**
```javascript
// server/middleware/auth.js
async function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  const decoded = await verifyToken(token);
  req.user = {
    sub: decoded.sub,
    username: decoded['cognito:username'],
    isAdmin: decoded['custom:admin'] === 'true'
  };
  next();
}
```

**Authorization (Admin-Only Operations):**
```javascript
// server/middleware/auth.js
function requireAdmin(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Admin privileges required' });
  }
  next();
}
```

### Protected Endpoints

| Endpoint | Method | Auth Required | Admin Only |
|----------|--------|---------------|------------|
| `/v1/api/cognito/users` | GET | ✅ | ✅ |
| `/v1/api/cognito/users/:username` | DELETE | ✅ | ✅ |
| `/v1/api/building-details` | GET | ✅ | ❌ |
| `/v1/api/user-detail` | POST | ✅ | ✅ |
| `/v1/api/building` | POST | ✅ | ✅ |
| `/v1/api/delete_camera/:id` | DELETE | ✅ | ✅ |
| `/v1/api/billing` | POST | ✅ | ❌ (own data) |
| All other endpoints | * | ✅ | ❌ |

---

## API Security

### Rate Limiting

**Implementation:** In-memory rate limiter (production should use Redis)

```javascript
// server/middleware/auth.js
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per IP

function rateLimiter(req, res, next) {
  const ip = req.ip;
  // Track requests per IP
  // Return 429 Too Many Requests if exceeded
}
```

**Configuration:**
- **Window:** 1 minute
- **Max Requests:** 100 per IP
- **Production:** Consider using `express-rate-limit` with Redis backend

### Request Logging

All requests are logged with timestamp, method, path, and IP address:

```javascript
// server/index.js
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});
```

**Production Recommendations:**
- Use structured logging (Winston, Bunyan)
- Send logs to centralized service (CloudWatch, Datadog)
- Set up alerts for suspicious patterns

### CORS Configuration

```javascript
// server/index.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
```

**Production:** Set `CORS_ORIGIN` to your Amplify domain

### Pagination

Large data endpoints now support pagination to prevent data dumps:

```javascript
// server/index.js - /v1/api/all-alerts
const page = parseInt(req.query.page, 10) || 1;
const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
const offset = (page - 1) * limit;
```

---

## Input Validation

### Validation Functions

**Location:** `server/middleware/auth.js`

```javascript
const inputValidation = {
  // String sanitization - removes null bytes, trims, limits length
  sanitizeString(str, maxLength = 255),

  // Positive integer validation
  validatePositiveInt(value),

  // Email format validation
  validateEmail(email),

  // Date format validation (YYYY-MM-DD)
  validateDate(dateStr),

  // Latitude validation (-90 to 90)
  validateLatitude(lat),

  // Longitude validation (-180 to 180)
  validateLongitude(lng),

  // Filename validation (prevent path traversal)
  validateFilename(filename)
};
```

### Usage Examples

```javascript
// Building creation
app.post("/v1/api/building", authenticateToken, requireAdmin, (req, res) => {
  const building_name = inputValidation.sanitizeString(req.body.building_name, 255);
  const lat = parseFloat(req.body.lat);
  const lng = parseFloat(req.body.lng);

  if (!building_name || !inputValidation.validateLatitude(lat) ||
      !inputValidation.validateLongitude(lng)) {
    return res.status(400).json({ message: 'Invalid input' });
  }
  // Process request...
});

// File operations (frontend)
const isValidFilename = (filename) => {
  if (!filename || typeof filename !== 'string') return false;
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  if (filename.length === 0 || filename.length > 255) {
    return false;
  }
  return true;
};
```

---

## Environment Configuration

### Frontend Environment Variables

**File:** `.env` (root directory)

```bash
# Backend API URL
REACT_APP_API_URL=http://localhost:3002

# AWS Cognito Configuration (Public info - safe in frontend)
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_xxxxxxxxx
REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx

# File API (if using API Gateway for file operations)
REACT_APP_FILE_API_URL=https://xxxxxx.execute-api.us-east-1.amazonaws.com/prod/file

# Feature Flags
REACT_APP_ENABLE_AUTH=true
REACT_APP_DEBUG_MODE=false
```

### Backend Environment Variables

**File:** `server/.env`

```bash
# Server Configuration
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://your-amplify-domain.amplifyapp.com

# Database Configuration (MySQL/RDS)
DB_HOST=your-rds-endpoint.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-secure-password
DB_NAME=cam_sur
DB_PORT=3306

# AWS Credentials (Backend Only)
# IMPORTANT: Use IAM roles instead when running on EC2/ECS/Lambda
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# AWS Cognito Configuration
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx

# S3 Configuration
S3_BUCKET_NAME=your-incident-data-bucket
S3_INCIDENTS_PREFIX=incidents/
S3_CLIPS_PREFIX=clips/
S3_CLIPS_PRESIGN_EXPIRES=3600
```

### Security Best Practices

1. ✅ **Never commit `.env` files to version control**
2. ✅ **Use different credentials for dev/staging/production**
3. ✅ **Rotate credentials regularly (quarterly minimum)**
4. ✅ **Use AWS Secrets Manager or Parameter Store for production**
5. ✅ **Use IAM roles instead of access keys when possible**
6. ✅ **Set minimum required IAM permissions**

---

## AWS Integration Security

### IAM Policy - Backend Service

**Principle of Least Privilege:** Grant only required permissions

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadIncidentData",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-incident-bucket",
        "arn:aws:s3:::your-incident-bucket/incidents/*",
        "arn:aws:s3:::your-incident-bucket/clips/*"
      ]
    },
    {
      "Sid": "CognitoAdminOperations",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminDeleteUser"
      ],
      "Resource": "arn:aws:cognito-idp:us-east-1:ACCOUNT_ID:userpool/us-east-1_xxxxxxxxx"
    }
  ]
}
```

### AWS Cognito Configuration

**User Pool Custom Attributes:**
- `custom:admin` - Set to "true" for admin users

**Frontend Configuration:**
```javascript
// src/index.js
Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_USER_POOL_WEB_CLIENT_ID,
  }
});
```

**Backend JWT Verification:**
```javascript
// server/middleware/auth.js
const client = jwksClient({
  jwksUri: `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true
});
```

### S3 Presigned URL Security

**Current Implementation:**
```javascript
// server/services/incidentService.js
const PRESIGN_EXPIRES = parseInt(process.env.S3_CLIPS_PRESIGN_EXPIRES || '3600', 10);
```

**Recommendations:**
- ✅ Default: 1 hour (3600 seconds)
- ✅ Maximum: 4 hours (14400 seconds)
- ✅ Add user-specific authorization before generating URLs
- ⚠️ Future: Track which user accessed which incident

---

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured in AWS Secrets Manager
- [ ] Database credentials rotated and secured
- [ ] AWS IAM policies set with minimum permissions
- [ ] CORS configured for production domain
- [ ] Rate limiting thresholds adjusted for production traffic
- [ ] Logging configured to send to CloudWatch/Datadog
- [ ] SSL/TLS certificates configured
- [ ] Security headers configured (Helmet.js recommended)

### AWS Amplify (Frontend)

```bash
# Build settings in Amplify Console
Frontend:
  baseDirectory: build
  Environment Variables:
    - REACT_APP_API_URL=https://api.yourdomain.com
    - REACT_APP_AWS_REGION=us-east-1
    - REACT_APP_USER_POOL_ID=us-east-1_xxxxxxxxx
    - REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxx
```

### Backend Deployment (EC2/ECS/Lambda)

**Option 1: EC2 with IAM Role**
```bash
# Use IAM instance role - no need for AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY
# Install dependencies
cd server
npm install

# Set environment variables
export NODE_ENV=production
export DB_HOST=...
export AWS_USER_POOL_ID=...
# etc.

# Start server
npm start
```

**Option 2: Docker Container**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server .
EXPOSE 3002
CMD ["node", "index.js"]
```

### Post-Deployment

- [ ] Verify authentication is working
- [ ] Test admin operations
- [ ] Confirm rate limiting is active
- [ ] Check logging is capturing requests
- [ ] Test database connections
- [ ] Verify S3 incident data loading
- [ ] Test Cognito user management
- [ ] Scan for vulnerabilities (npm audit, OWASP ZAP)

---

## Security Testing

### Manual Testing Checklist

**Authentication:**
- [ ] Cannot access protected routes without token
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected
- [ ] Token from different user pool is rejected

**Authorization:**
- [ ] Non-admin users cannot delete users
- [ ] Non-admin users cannot create buildings
- [ ] Users can only see their own billing data

**Input Validation:**
- [ ] SQL injection attempts are blocked
- [ ] Path traversal in filenames is blocked
- [ ] XSS attempts are sanitized
- [ ] Invalid coordinates are rejected
- [ ] Invalid dates are rejected

**Rate Limiting:**
- [ ] 100+ requests in 1 minute returns 429
- [ ] Rate limit resets after window

### Automated Security Scanning

**Node.js Dependencies:**
```bash
# Check for vulnerable dependencies
npm audit
npm audit fix

# Frontend
cd /home/runner/work/nodedash4.0/nodedash4.0
npm audit

# Backend
cd server
npm audit
```

**OWASP ZAP (Recommended):**
```bash
# Install OWASP ZAP
# Run automated scan against your deployment
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://your-app.amplifyapp.com
```

---

## Incident Response

### Security Incident Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| **Critical** | Active exploit, data breach | Immediate | AWS credentials leaked, database compromised |
| **High** | Vulnerability with high impact | 4 hours | Authentication bypass discovered |
| **Medium** | Vulnerability with limited impact | 24 hours | Rate limiting not working |
| **Low** | Minor security issue | 1 week | Verbose error messages |

### Response Procedures

**1. Detection & Assessment (0-15 min)**
- Monitor CloudWatch logs for unusual patterns
- Check rate limit violations
- Review authentication failures
- Assess scope and impact

**2. Containment (15-60 min)**
- Rotate compromised credentials immediately
- Block attacking IP addresses
- Disable compromised user accounts
- Take affected systems offline if necessary

**3. Eradication (1-4 hours)**
- Patch vulnerable code
- Deploy security fixes
- Update firewall rules
- Reset all user passwords if needed

**4. Recovery (4-24 hours)**
- Restore systems from secure backups
- Verify security fixes
- Monitor for continued attacks
- Communicate with affected users

**5. Post-Incident Review (24-72 hours)**
- Document timeline of events
- Identify root cause
- Update security procedures
- Implement preventive measures

### Emergency Contacts

```
Security Team Lead: [contact-info]
AWS Support: 1-877-929-2782
Database Admin: [contact-info]
DevOps Lead: [contact-info]
```

### Credential Rotation Procedure

**If AWS Credentials Compromised:**
```bash
1. Create new IAM user with restricted permissions
2. Update server/.env with new credentials
3. Deploy update immediately
4. Delete old IAM user
5. Review CloudTrail logs for unauthorized access
6. Check S3 access logs
```

**If Database Credentials Compromised:**
```bash
1. Create new database user with same permissions
2. Update server/.env with new credentials
3. Deploy update immediately
4. Drop old database user
5. Review database audit logs
6. Check for data exfiltration
```

---

## Maintenance & Updates

### Regular Security Tasks

**Daily:**
- Monitor application logs for anomalies
- Check rate limit violations
- Review authentication failures

**Weekly:**
- Review user access and admin assignments
- Check for new npm security advisories
- Monitor AWS CloudTrail logs

**Monthly:**
- Run vulnerability scans (npm audit, ZAP)
- Review and update firewall rules
- Audit user accounts and permissions
- Review S3 access logs

**Quarterly:**
- Rotate AWS credentials
- Rotate database credentials
- Security assessment and penetration testing
- Review and update incident response procedures

### Keeping Dependencies Updated

```bash
# Check for outdated packages
npm outdated

# Update non-breaking changes
npm update

# Update major versions (test thoroughly)
npm install <package>@latest

# After updates, always test
npm audit
npm test
```

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Current Practices](https://datatracker.ietf.org/doc/html/rfc8725)

---

## Changelog

### 2026-03-15 - Major Security Overhaul
- ✅ Removed demo mode authentication bypass
- ✅ Implemented JWT authentication on all endpoints
- ✅ Added authorization middleware for admin operations
- ✅ Moved AWS Cognito operations to backend
- ✅ Added comprehensive input validation
- ✅ Implemented rate limiting
- ✅ Added request logging
- ✅ Fixed hardcoded credentials and URLs
- ✅ Added file validation for upload/delete
- ✅ Implemented pagination for large datasets
- ✅ Updated environment variable configuration

---

**Document Version:** 1.0
**Author:** Security Team
**Review Cycle:** Quarterly
