# Security Migration Guide

## Quick Start for Developers

This guide helps you understand and work with the new security features.

---

## What Changed?

### 🔐 Authentication Now Required

**Before:**
```javascript
// API calls worked without authentication
axios.get('http://localhost:3002/v1/api/building-details')
```

**After:**
```javascript
// All API calls need authentication token
import { authenticatedGet } from '../../config/api';

const data = await authenticatedGet('/v1/api/building-details');
```

### 🏗️ Centralized API Configuration

**Before:**
```javascript
// Hardcoded URLs everywhere
fetch('http://localhost:3002/v1/api/building', { ... })
```

**After:**
```javascript
// Centralized configuration
import API_CONFIG from '../../config/api';
import { post } from '../../utils/apiHelper';

const result = await post('/v1/api/building', data);
```

---

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd server
npm install
```

New packages added:
- `jsonwebtoken` - JWT verification
- `jwks-rsa` - Fetch Cognito public keys
- `@aws-sdk/client-cognito-identity-provider` - Cognito admin operations

### 2. Configure Environment Variables

**Frontend (.env in root):**
```bash
REACT_APP_API_URL=http://localhost:3002
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your-client-id
```

**Backend (server/.env):**
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

# AWS
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_USER_POOL_ID=your-user-pool-id

# S3
S3_BUCKET_NAME=your-bucket
S3_INCIDENTS_PREFIX=incidents/
S3_CLIPS_PRESIGN_EXPIRES=3600
```

### 3. Start Both Servers

```bash
# Terminal 1: Frontend
npm start

# Terminal 2: Backend
cd server
npm start
```

---

## Making Authenticated API Calls

### Option 1: Using Helper Functions (Recommended)

```javascript
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '../../config/api';

// GET request
const buildings = await authenticatedGet('/v1/api/building-details');

// POST request
const result = await authenticatedPost('/v1/api/building', {
  building_name: 'Library',
  lat: 40.7128,
  lng: -74.0060
});

// DELETE request
await authenticatedDelete('/v1/api/delete_camera/123');
```

### Option 2: Using Utility Module

```javascript
import { get, post, del } from '../../utils/apiHelper';

const data = await get('/v1/api/camera-select');
const result = await post('/v1/api/building', buildingData);
await del('/v1/api/delete_camera/123');
```

### Option 3: Manual (for Complex Cases)

```javascript
import { Auth } from 'aws-amplify';
import API_CONFIG from '../../config/api';

const session = await Auth.currentSession();
const token = session.getIdToken().getJwtToken();

const response = await fetch(`${API_CONFIG.BACKEND_URL}/v1/api/building-details`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

## Common Migration Patterns

### Pattern 1: Axios GET Request

**Before:**
```javascript
import axios from 'axios';

useEffect(() => {
  axios.get('http://localhost:3002/v1/api/camera-select')
    .then(response => setCameras(response.data))
    .catch(error => console.error(error));
}, []);
```

**After:**
```javascript
import { authenticatedGet } from '../../config/api';

useEffect(() => {
  const fetchCameras = async () => {
    try {
      const data = await authenticatedGet('/v1/api/camera-select');
      setCameras(data);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  };
  fetchCameras();
}, []);
```

### Pattern 2: Fetch POST Request

**Before:**
```javascript
fetch('http://localhost:3002/v1/api/building', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(result => console.log(result));
```

**After:**
```javascript
import { authenticatedPost } from '../../config/api';

try {
  const result = await authenticatedPost('/v1/api/building', data);
  console.log(result);
} catch (error) {
  console.error('Error creating building:', error);
  alert('Failed to create building');
}
```

### Pattern 3: Class Components

**Before:**
```javascript
export class AddBuildingModal extends Component {
  handleSubmit(event) {
    event.preventDefault();
    fetch('http://localhost:3002/v1/api/building', { ... })
      .then(res => res.json())
      .then(result => { /* ... */ });
  }
}
```

**After:**
```javascript
import { Auth } from 'aws-amplify';
import API_CONFIG from '../../config/api';

export class AddBuildingModal extends Component {
  async handleSubmit(event) {
    event.preventDefault();
    try {
      const session = await Auth.currentSession();
      const token = session.getIdToken().getJwtToken();

      const response = await fetch(`${API_CONFIG.BACKEND_URL}/v1/api/building`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      // Handle success
    } catch (error) {
      console.error('Error:', error);
      // Handle error
    }
  }
}
```

---

## Testing Your Changes

### 1. Test Authentication

```javascript
// This should work (authenticated user)
import { authenticatedGet } from '../../config/api';
const data = await authenticatedGet('/v1/api/building-details');
console.log(data); // Should show buildings

// This should fail (no token)
fetch('http://localhost:3002/v1/api/building-details')
  .then(res => res.json())
  .then(data => console.log(data)); // Should get 401 Unauthorized
```

### 2. Test Authorization

Admin-only operations require the `custom:admin` attribute in Cognito:

```javascript
// Should work for admin users
await authenticatedDelete('/v1/api/delete_camera/123');

// Should fail for non-admin users (403 Forbidden)
```

### 3. Test Rate Limiting

```javascript
// Make 150 requests in 1 minute
// Requests 101-150 should return 429 Too Many Requests
for (let i = 0; i < 150; i++) {
  await authenticatedGet('/v1/api/building-count');
}
```

---

## Troubleshooting

### Error: "Authentication required. No token provided."

**Cause:** API call is not including authentication token

**Fix:** Use `authenticatedGet/Post/Delete` helpers instead of plain fetch/axios

### Error: "Invalid or expired token"

**Causes:**
1. User session expired
2. User not logged in
3. Invalid User Pool ID configuration

**Fix:**
```javascript
// Check if user is authenticated
const user = await Auth.currentAuthenticatedUser();
console.log('Current user:', user);

// Get new session
const session = await Auth.currentSession();
console.log('Token:', session.getIdToken().getJwtToken());
```

### Error: "Admin privileges required"

**Cause:** User doesn't have admin status

**Fix:**
1. Go to AWS Cognito Console
2. Find user
3. Add custom attribute: `custom:admin = true`

### Error: "CORS policy blocked"

**Cause:** Backend CORS_ORIGIN doesn't match frontend

**Fix:**
```bash
# In server/.env
CORS_ORIGIN=http://localhost:3000

# Restart backend server
cd server
npm start
```

### Backend not starting - "AWS_USER_POOL_ID not set"

**Cause:** Environment variable missing

**Fix:**
```bash
# Create server/.env file
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_REGION=us-east-1
# ... other variables
```

---

## Migration Checklist

Use this checklist when updating a component:

- [ ] Import `authenticatedGet/Post/Delete` or `API_CONFIG`
- [ ] Replace hardcoded `http://localhost:3002` with API config
- [ ] Add authentication token to API calls
- [ ] Add try/catch error handling
- [ ] Test with authenticated user
- [ ] Test with non-authenticated user (should fail gracefully)
- [ ] Test admin operations with admin and non-admin users
- [ ] Check console for any errors

---

## Files You May Need to Update

Already migrated:
- ✅ `src/components/ProtectedRoute.jsx`
- ✅ `src/scenes/contacts/index.jsx`
- ✅ `src/scenes/billing/billing.jsx`
- ✅ `src/scenes/buildingdirectory/addBuildingModal.js`
- ✅ `src/scenes/dashboard/settings.jsx`
- ✅ `src/scenes/managefiles/index.jsx`

Still need migration (if you're working on these):
- ⚠️ `src/scenes/floordirectory/floordirectory.jsx`
- ⚠️ `src/scenes/floordirectory/addCameraModal.js`
- ⚠️ `src/scenes/floordirectory/viewModal.js`
- ⚠️ `src/scenes/buildingdirectory/buildingdirectory.jsx`
- ⚠️ `src/scenes/cameradirectory/inactivecameracount.jsx`
- ⚠️ `src/scenes/calendar/calendar.jsx`
- ⚠️ `src/services/dashboardApi.js`

---

## Need Help?

1. Check `SECURITY.md` for detailed security documentation
2. Review `src/config/api.js` for available helper functions
3. Look at migrated files for examples
4. Test with `npm audit` to check for vulnerabilities

---

**Last Updated:** 2026-03-15
