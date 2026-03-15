# ✅ Amplify Deployment Checklist

## Quick Steps to Activate Your Secured App

Follow this checklist in order. Each step should take 5-15 minutes.

---

## Step 1: Deploy Backend (15 minutes)

### Option A: AWS EC2

```bash
# 1. Launch EC2 instance (t3.small, Amazon Linux 2023)
# 2. SSH into instance
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# 3. Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs git

# 4. Clone repository
git clone https://github.com/prxtn123/nodedash4.0.git
cd nodedash4.0/server

# 5. Install dependencies
npm ci --production

# 6. Install PM2
sudo npm install -g pm2

# 7. Create .env file (IMPORTANT - fill in your values!)
cat > .env << 'EOF'
PORT=3002
NODE_ENV=production
CORS_ORIGIN=WILL_UPDATE_AFTER_AMPLIFY_DEPLOY

DB_HOST=your-rds-endpoint.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-password
DB_NAME=cam_sur
DB_PORT=3306

AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx

S3_BUCKET_NAME=your-bucket
S3_INCIDENTS_PREFIX=incidents/
S3_CLIPS_PRESIGN_EXPIRES=3600
EOF

# 8. Start server
pm2 start index.js --name "safety-dashboard-api"
pm2 startup
pm2 save

# 9. Test it works
curl http://localhost:3002/health
# Should return: {"status":"ok","timestamp":"..."}

# 10. Note your backend URL (you'll need this next!)
echo "Backend URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3002"
```

**✅ Backend is running! Note the URL above.**

---

## Step 2: Deploy Frontend to Amplify (10 minutes)

### 2.1 Connect to Amplify

1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"New app"** → **"Host web app"**
3. Select **GitHub**
4. Authorize GitHub
5. Select: **prxtn123/nodedash4.0**
6. Branch: **claude/fix-security-issues-in-app** (or main)
7. Click **Next**

### 2.2 Verify Build Settings

Amplify should auto-detect the `amplify.yml` file. Verify it shows:
- Node version: 18
- Build command: `npm run build`
- Output directory: `build`

Click **Next**

### 2.3 Add Environment Variables (CRITICAL!)

Click **"Advanced settings"** → **"Add environment variable"**

Add these variables:

| Key | Value | Where to find it |
|-----|-------|------------------|
| `REACT_APP_API_URL` | `http://YOUR_EC2_IP:3002` | From Step 1.10 above |
| `REACT_APP_AWS_REGION` | `us-east-1` | Your AWS region |
| `REACT_APP_USER_POOL_ID` | `us-east-1_xxxxxxxxx` | Cognito Console → User Pools |
| `REACT_APP_USER_POOL_WEB_CLIENT_ID` | `xxxxxxxxx` | Cognito → App clients |

**Where to find Cognito values:**
```bash
# Go to: https://console.aws.amazon.com/cognito/
# Click your User Pool
# User Pool ID is at the top
# Click "App integration" → "App clients" for Client ID
```

### 2.4 Deploy

1. Click **"Save and deploy"**
2. Wait 5-10 minutes for build
3. **Copy your Amplify URL** (e.g., `https://main.d123456.amplifyapp.com`)

**✅ Frontend is deploying!**

---

## Step 3: Update CORS (5 minutes)

Now that you have your Amplify URL, update the backend:

```bash
# SSH back to EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Update CORS_ORIGIN
cd /home/ec2-user/nodedash4.0/server
nano .env

# Change this line:
CORS_ORIGIN=https://main.d123456.amplifyapp.com

# Save (Ctrl+X, Y, Enter)

# Restart server
pm2 restart safety-dashboard-api

# Verify
pm2 logs safety-dashboard-api
```

**✅ CORS configured!**

---

## Step 4: Configure Cognito (5 minutes)

1. Go to: https://console.aws.amazon.com/cognito/
2. Click your **User Pool**
3. Click **"App integration"** tab
4. Find your **App client** → Click **"Edit"**

**Add these callback URLs:**
```
https://main.d123456.amplifyapp.com/
https://main.d123456.amplifyapp.com/dashboard
```

**Add sign-out URL:**
```
https://main.d123456.amplifyapp.com/login
```

**Verify OAuth settings:**
- ✅ Authorization code grant
- ✅ Implicit grant
- ✅ Scopes: email, openid, profile

Click **"Save changes"**

**✅ Cognito configured!**

---

## Step 5: Create Admin User (5 minutes)

### Option A: AWS Console

1. **Cognito Console** → Your User Pool → **"Users"**
2. Click **"Create user"**
3. Fill in:
   - Username: `admin@yourdomain.com`
   - Email: `admin@yourdomain.com`
   - Temporary password: `TempPass123!`
4. Click **"Create user"**
5. **Click on the username**
6. Click **"Attributes"** tab
7. Click **"Add attribute"**
8. Add:
   - Attribute: `custom:admin`
   - Value: `true`
9. Click **"Save"**

### Option B: AWS CLI (faster)

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username admin@yourdomain.com \
  --user-attributes Name=email,Value=admin@yourdomain.com \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username admin@yourdomain.com \
  --user-attributes Name=custom:admin,Value=true
```

**✅ Admin user created!**

---

## Step 6: Test Everything (10 minutes)

### 6.1 Test Login

1. Visit: `https://main.d123456.amplifyapp.com`
2. You should see login page
3. Sign in with admin credentials
4. Change temporary password when prompted
5. Should redirect to dashboard

**✅ If you can log in, authentication works!**

### 6.2 Test API Calls

**Open Browser DevTools (F12):**
1. Go to **Network** tab
2. Click around the app
3. Look for requests to your backend
4. Check they have **Authorization: Bearer ...** header

**✅ If you see Authorization headers, security is working!**

### 6.3 Test Admin Functions

1. Navigate to **"Users"** page
2. You should see the user list
3. Try creating a test user
4. Try deleting the test user (should work for admin)

**✅ If admin functions work, authorization is working!**

### 6.4 Test Backend Health

```bash
# Test from your computer
curl http://YOUR_EC2_IP:3002/health
# Should return: {"status":"ok","timestamp":"..."}

# Test authentication requirement (should fail)
curl http://YOUR_EC2_IP:3002/v1/api/building-details
# Should return: {"message":"Authentication required. No token provided."}
```

**✅ If both tests work as expected, backend security is active!**

---

## Step 7: Security Verification (5 minutes)

Run through this final checklist:

- [ ] Login page appears (no demo mode button)
- [ ] Cannot access app without logging in
- [ ] All API calls include authentication token
- [ ] Admin user can access admin functions
- [ ] Creating non-admin user and verifying they cannot access admin functions
- [ ] Backend logs show requests (check with `pm2 logs`)
- [ ] No errors in browser console (F12)
- [ ] No CORS errors

**✅ All tests pass? You're live!**

---

## Common Issues & Quick Fixes

### Issue: "CORS policy blocked"

**Fix:**
```bash
# Check CORS_ORIGIN matches exactly
ssh ec2-user@YOUR_EC2_IP
cat /home/ec2-user/nodedash4.0/server/.env | grep CORS

# Should be:
CORS_ORIGIN=https://main.d123456.amplifyapp.com

# No trailing slash!
# Restart if changed:
pm2 restart safety-dashboard-api
```

### Issue: "Authentication required" on every request

**Check these:**
1. User Pool ID matches in Amplify env vars and backend .env
2. You're actually logged in (check browser console)
3. Token is in Authorization header (Network tab)

**Debug:**
```javascript
// In browser console:
Auth.currentAuthenticatedUser()
  .then(user => console.log('Logged in:', user.username))
  .catch(err => console.log('Not logged in'));
```

### Issue: Build fails in Amplify

**Check:**
1. All environment variables set in Amplify
2. Node version is 18 in amplify.yml
3. Build logs in Amplify Console

### Issue: Backend not responding

**Check:**
```bash
ssh ec2-user@YOUR_EC2_IP
pm2 status
pm2 logs safety-dashboard-api

# Restart if needed
pm2 restart safety-dashboard-api
```

---

## 🎉 Success Checklist

You're done when all of these are true:

- ✅ Backend running on EC2 (health check works)
- ✅ Frontend deployed to Amplify (shows login page)
- ✅ Can log in with admin user
- ✅ Can see dashboard after login
- ✅ API calls include Authorization header
- ✅ Admin functions work
- ✅ Non-admin users restricted appropriately
- ✅ No CORS errors in console
- ✅ No authentication errors in console

---

## Your Deployment Info

**Fill this out for future reference:**

```
Amplify URL: https://main.d______________.amplifyapp.com
Backend URL: http://xxx.xxx.xxx.xxx:3002
User Pool ID: us-east-1_xxxxxxxxx
RDS Endpoint: xxxxxxxxx.us-east-1.rds.amazonaws.com
S3 Bucket: your-incident-bucket-name
Admin Email: admin@yourdomain.com
```

---

## What to Do Next

1. **Test thoroughly** - Try all features
2. **Add real users** - Create user accounts in Cognito
3. **Set up monitoring** - CloudWatch alerts
4. **Enable HTTPS** - For backend (see AMPLIFY_DEPLOYMENT.md)
5. **Custom domain** - Add your own domain (optional)
6. **Backups** - Enable RDS automated backups
7. **Documentation** - Save your deployment info securely

---

## Need Detailed Instructions?

See **AMPLIFY_DEPLOYMENT.md** for:
- Detailed step-by-step instructions
- Alternative deployment options (Elastic Beanstalk, Lambda)
- HTTPS setup with nginx
- Custom domain configuration
- Advanced troubleshooting
- Monitoring and maintenance

---

**Estimated Total Time:** 45-60 minutes
**Difficulty:** Intermediate
**Cost:** ~$20-50/month (EC2 + Amplify + RDS)

**Questions?** Check AMPLIFY_DEPLOYMENT.md or the other documentation files!
