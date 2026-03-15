# Security Fixes - Deployment & Testing Guide

## 🎯 Overview

This document provides step-by-step instructions for deploying and testing the security fixes implemented in the Node Safety Dashboard.

---

## ✅ Security Fixes Implemented

### Critical Fixes
- ✅ **Removed demo mode authentication bypass** - Users can no longer bypass authentication
- ✅ **Added JWT authentication to all API endpoints** - All endpoints now require valid Cognito tokens
- ✅ **Moved AWS Cognito operations to backend** - AWS credentials no longer exposed in frontend
- ✅ **Fixed billing endpoint security** - Now uses authenticated user's ID instead of hardcoded user_id=1
- ✅ **Removed hardcoded credentials and URLs** - All configuration now via environment variables

### High Priority Fixes
- ✅ **Added comprehensive input validation** - Prevents SQL injection, path traversal, XSS
- ✅ **Replaced hardcoded localhost URLs** - Centralized API configuration
- ✅ **Added file validation** - Prevents path traversal attacks in file operations
- ✅ **Implemented admin authorization checks** - Admin-only operations properly protected

### Medium Priority Fixes
- ✅ **Added rate limiting** - Prevents DoS attacks (100 requests/minute per IP)
- ✅ **Added request logging** - Audit trail for all API calls
- ✅ **Added pagination** - Prevents data dump attacks

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install backend dependencies (REQUIRED - new packages added)
cd server
npm install

# Verify installation
npm list jsonwebtoken jwks-rsa @aws-sdk/client-cognito-identity-provider
```

### 2. Configure Environment Variables

**Frontend** (`.env` in root directory):
```bash
REACT_APP_API_URL=http://localhost:3002
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your-client-id
```

**Backend** (`server/.env`):
```bash
# Server
PORT=3002
CORS_ORIGIN=http://localhost:3000

# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=cam_sur
DB_PORT=3306

# AWS (Backend only - never in frontend!)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_USER_POOL_ID=your-user-pool-id

# S3
S3_BUCKET_NAME=your-bucket
S3_INCIDENTS_PREFIX=incidents/
S3_CLIPS_PRESIGN_EXPIRES=3600
```

### 3. Start Application

```bash
# Terminal 1: Start backend
cd server
npm start

# Terminal 2: Start frontend
cd ..
npm start
```

### 4. Verify Security

Visit http://localhost:3000 and:
1. ✅ Login required (no demo mode bypass)
2. ✅ API calls include authentication tokens
3. ✅ Admin operations restricted to admin users
4. ✅ Rate limiting active (check server logs)

---

## 🧪 Testing Checklist

### Authentication Tests

```bash
# Test 1: Unauthenticated requests should fail
curl http://localhost:3002/v1/api/building-details
# Expected: 401 Unauthorized

# Test 2: Authenticated requests should work
# (Need to get token from browser after login)
curl -H "Authorization: Bearer <token>" http://localhost:3002/v1/api/building-details
# Expected: JSON data
```

### Authorization Tests

```bash
# Test 3: Non-admin cannot delete users
# Login as non-admin user, try to access Users page
# Expected: Can view but delete button should fail

# Test 4: Admin can delete users
# Login as admin user (custom:admin = true in Cognito)
# Expected: Can delete users successfully
```

### Rate Limiting Tests

```javascript
// Test 5: Rate limiting
// Make 150 requests in quick succession
for (let i = 0; i < 150; i++) {
  fetch('http://localhost:3002/v1/api/building-count', {
    headers: { 'Authorization': 'Bearer <token>' }
  }).then(r => console.log(i, r.status));
}
// Expected: First 100 succeed (200), rest fail (429)
```

### Input Validation Tests

```bash
# Test 6: Path traversal blocked
curl -X DELETE -H "Authorization: Bearer <token>" \
  "http://localhost:3002/v1/api/delete_camera/../../../etc/passwd"
# Expected: 400 Bad Request

# Test 7: Invalid coordinates rejected
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"building_name":"Test","lat":999,"lng":999}' \
  http://localhost:3002/v1/api/building
# Expected: 400 Bad Request
```

---

## 📋 Production Deployment Checklist

### Pre-Deployment

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run `npm audit` in server directory
- [ ] Set production environment variables in AWS Secrets Manager
- [ ] Create IAM role with minimal permissions (see SECURITY.md)
- [ ] Rotate all credentials (database, AWS keys)
- [ ] Configure CORS_ORIGIN for production domain
- [ ] Set up CloudWatch logging
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerts

### AWS Amplify (Frontend)

1. **Build Settings:**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

2. **Environment Variables in Amplify Console:**
```
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=us-east-1_xxxxxxxxx
REACT_APP_USER_POOL_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Backend Deployment (Choose One)

**Option A: AWS EC2 with IAM Role (Recommended)**

```bash
# 1. Create EC2 instance
# 2. Attach IAM role with required permissions
# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Clone repository
git clone https://github.com/prxtn123/nodedash4.0.git
cd nodedash4.0/server

# 5. Install dependencies
npm ci --production

# 6. Set environment variables (use AWS Systems Manager Parameter Store)
export DB_HOST=...
export AWS_USER_POOL_ID=...
# etc.

# 7. Start with PM2 (process manager)
npm install -g pm2
pm2 start index.js --name "safety-dashboard-api"
pm2 startup
pm2 save
```

**Option B: AWS ECS/Fargate (Container)**

```dockerfile
# Dockerfile (already in project)
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --production
COPY server .
EXPOSE 3002
CMD ["node", "index.js"]
```

```bash
# Build and push
docker build -t safety-dashboard-api .
docker tag safety-dashboard-api:latest <account>.dkr.ecr.us-east-1.amazonaws.com/safety-dashboard-api:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/safety-dashboard-api:latest

# Deploy to ECS/Fargate via AWS Console or CLI
```

**Option C: AWS Lambda (Serverless)**

```bash
# Install serverless framework
npm install -g serverless

# Create serverless.yml (you'll need to create this)
# Deploy
serverless deploy
```

### Post-Deployment Verification

- [ ] Health check: https://api.yourdomain.com/health
- [ ] Authentication working
- [ ] Admin operations restricted
- [ ] Rate limiting active
- [ ] Logging capturing requests
- [ ] Database connection working
- [ ] S3 incident data loading
- [ ] Cognito integration working

---

## 🔧 Configuration Files

### Files Created/Modified

**New Files:**
- `server/middleware/auth.js` - Authentication & authorization middleware
- `server/services/cognitoService.js` - Secure Cognito operations
- `src/config/api.js` - Centralized API configuration
- `src/utils/apiHelper.js` - API helper utilities
- `SECURITY.md` - Comprehensive security documentation
- `MIGRATION_GUIDE.md` - Developer migration guide
- `DEPLOYMENT.md` - This file

**Modified Files:**
- `server/index.js` - Added authentication, validation, logging
- `server/package.json` - Added jsonwebtoken, jwks-rsa
- `src/components/ProtectedRoute.jsx` - Removed demo bypass
- `src/scenes/contacts/index.jsx` - Moved Cognito ops to backend
- `src/scenes/billing/billing.jsx` - Fixed hardcoded user_id
- `src/scenes/buildingdirectory/addBuildingModal.js` - Added auth
- `src/scenes/dashboard/settings.jsx` - Added auth
- `src/scenes/managefiles/index.jsx` - Added file validation
- `.env.example` - Updated with security notes

---

## 📊 Monitoring & Maintenance

### What to Monitor

**Application Metrics:**
- Request rate per endpoint
- Authentication failures
- Authorization denials (403 errors)
- Rate limit violations (429 errors)
- Database query performance
- S3 access patterns

**Security Metrics:**
- Failed login attempts per user
- Unusual request patterns
- Geographic distribution of requests
- Admin operations audit trail

### CloudWatch Alarms (Recommended)

```bash
# High authentication failure rate
Metric: HTTPCode_Target_4XX_Count
Threshold: > 100 in 5 minutes

# High rate limit violations
Metric: HTTPCode_Target_4XX_Count (filter for 429)
Threshold: > 50 in 5 minutes

# Database connection failures
Metric: DatabaseConnectionErrors
Threshold: > 10 in 5 minutes
```

### Maintenance Schedule

**Daily:**
- Check application logs for errors
- Monitor authentication failures

**Weekly:**
- Review rate limit violations
- Check for npm security advisories: `npm audit`
- Review CloudWatch metrics

**Monthly:**
- Run vulnerability scans
- Review user access levels
- Update dependencies (patch versions)
- Review S3 access logs

**Quarterly:**
- Rotate AWS credentials
- Rotate database passwords
- Security assessment
- Update dependencies (minor/major versions)
- Review and test incident response plan

---

## 🆘 Troubleshooting

### Common Issues

**Issue: "Authentication required. No token provided"**
```
Cause: Frontend not sending JWT token
Fix: Ensure using authenticatedGet/Post/Delete helpers
Check: Browser Network tab for Authorization header
```

**Issue: "Invalid or expired token"**
```
Cause: Token expired or User Pool ID mismatch
Fix:
1. Verify AWS_USER_POOL_ID matches in frontend and backend
2. Check token in jwt.io to verify issuer
3. Ensure user is logged in: Auth.currentAuthenticatedUser()
```

**Issue: "Admin privileges required"**
```
Cause: User doesn't have custom:admin attribute
Fix: In Cognito Console, set user's custom:admin = "true"
```

**Issue: "Rate limit exceeded"**
```
Cause: Too many requests from one IP
Fix:
- Wait 1 minute for window to reset
- Increase RATE_LIMIT_MAX_REQUESTS if legitimate traffic
- Check for loops making repeated requests
```

**Issue: Backend crashes on startup**
```
Cause: Missing environment variables or dependencies
Fix:
1. Check all required env vars are set
2. Run: cd server && npm install
3. Check logs for specific error
4. Verify database connection
```

---

## 📚 Additional Resources

- [SECURITY.md](./SECURITY.md) - Complete security documentation
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Developer migration guide
- [.env.example](./.env.example) - Environment variable template
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🎉 Summary

This security overhaul addresses **12 major vulnerabilities** across **3 severity levels**:

- ✅ **5 Critical** vulnerabilities fixed
- ✅ **4 High** priority issues resolved
- ✅ **3 Medium** priority improvements implemented

**Key Achievements:**
- 🔒 100% of API endpoints now require authentication
- 🛡️ Admin operations properly authorized
- 🚫 Demo mode bypass eliminated
- 🔐 AWS credentials secured on backend
- ✅ Input validation on all endpoints
- 📊 Request logging for audit trail
- ⏱️ Rate limiting to prevent abuse

**Before Deployment:**
1. Install backend dependencies: `cd server && npm install`
2. Configure environment variables (frontend + backend)
3. Test authentication, authorization, and rate limiting
4. Run security scans: `npm audit`
5. Review SECURITY.md and MIGRATION_GUIDE.md

**Need Help?**
- Review documentation files
- Check browser console for errors
- Check server logs for authentication issues
- Test with curl commands provided above

---

**Version:** 1.0
**Date:** 2026-03-15
**Status:** Ready for Testing
