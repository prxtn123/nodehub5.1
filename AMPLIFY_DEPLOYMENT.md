# AWS Amplify Deployment Guide - Node Safety Dashboard

## 🚀 Quick Start: Deploying Your Secured App to Amplify

This guide walks you through deploying the newly secured Node Safety Dashboard to AWS Amplify.

---

## Prerequisites

Before starting, ensure you have:
- ✅ AWS Account with Amplify access
- ✅ GitHub repository access (prxtn123/nodedash4.0)
- ✅ AWS Cognito User Pool already created
- ✅ Backend API deployed (EC2/ECS/Lambda) or ready to deploy
- ✅ MySQL/RDS database set up
- ✅ S3 bucket for incident data

---

## Part 1: Deploy Backend API (Choose One Option)

### Option A: AWS EC2 (Recommended for Getting Started)

**Step 1: Launch EC2 Instance**
1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. Choose:
   - **AMI:** Amazon Linux 2023 or Ubuntu 22.04 LTS
   - **Instance Type:** t3.small (minimum)
   - **Security Group:** Allow inbound on port 3002 (or 80/443 with nginx)
   - **Key Pair:** Create or select existing

**Step 2: Install Node.js on EC2**
```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@your-ec2-public-ip

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Or for Ubuntu:
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

**Step 3: Deploy Backend Code**
```bash
# Clone repository
cd /home/ec2-user
git clone https://github.com/prxtn123/nodedash4.0.git
cd nodedash4.0/server

# Install dependencies
npm ci --production

# Install PM2 (process manager)
sudo npm install -g pm2
```

**Step 4: Configure Environment Variables**
```bash
# Create .env file
cat > .env << 'EOF'
# Server Configuration
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://main.xxxxxx.amplifyapp.com

# Database (RDS)
DB_HOST=your-rds-endpoint.us-east-1.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your-db-password
DB_NAME=cam_sur
DB_PORT=3306

# AWS Credentials (or use IAM role)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1

# Cognito
AWS_USER_POOL_ID=us-east-1_xxxxxxxxx

# S3
S3_BUCKET_NAME=your-incident-bucket
S3_INCIDENTS_PREFIX=incidents/
S3_CLIPS_PRESIGN_EXPIRES=3600
EOF

# Secure the file
chmod 600 .env
```

**Step 5: Start Backend Server**
```bash
# Start with PM2
pm2 start index.js --name "safety-dashboard-api"

# Configure to start on reboot
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs safety-dashboard-api
```

**Step 6: Test Backend**
```bash
# Health check
curl http://localhost:3002/health
# Expected: {"status":"ok","timestamp":"..."}

# Test (will fail without auth - expected)
curl http://localhost:3002/v1/api/building-details
# Expected: {"message":"Authentication required. No token provided."}
```

**Step 7: Get Your Backend URL**
```bash
# Your backend URL is:
http://your-ec2-public-ip:3002

# Or set up nginx reverse proxy for HTTPS:
# https://api.yourdomain.com
```

---

### Option B: AWS Elastic Beanstalk (Easier Management)

**Step 1: Install EB CLI**
```bash
pip install awsebcli
```

**Step 2: Initialize Elastic Beanstalk**
```bash
cd /path/to/nodedash4.0/server
eb init

# Select:
# - Region: us-east-1
# - Platform: Node.js
# - Application name: safety-dashboard-api
```

**Step 3: Configure Environment**
```bash
# Set environment variables
eb setenv \
  PORT=3002 \
  NODE_ENV=production \
  DB_HOST=your-rds-endpoint.amazonaws.com \
  DB_USER=admin \
  DB_PASSWORD=your-password \
  DB_NAME=cam_sur \
  AWS_USER_POOL_ID=us-east-1_xxxxxxxxx \
  S3_BUCKET_NAME=your-bucket
```

**Step 4: Deploy**
```bash
eb create safety-dashboard-api-prod
eb deploy

# Get URL
eb status
# Your backend URL: http://safety-dashboard-api-prod.xxxxx.elasticbeanstalk.com
```

---

## Part 2: Deploy Frontend to AWS Amplify

### Step 1: Connect Repository to Amplify

1. **Go to AWS Amplify Console**
   - Navigate to: https://console.aws.amazon.com/amplify/
   - Click **"New app"** → **"Host web app"**

2. **Connect Repository**
   - Select **GitHub**
   - Authenticate with GitHub if needed
   - Select repository: **prxtn123/nodedash4.0**
   - Select branch: **claude/fix-security-issues-in-app** (or main after merging)
   - Click **Next**

### Step 2: Configure Build Settings

The `amplify.yml` file is already configured, but verify it shows:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - echo "No backend build - frontend only"
frontend:
  phases:
    preBuild:
      commands:
        - nvm install 18
        - nvm use 18
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

Click **Next**

### Step 3: Add Environment Variables

**CRITICAL:** Add these environment variables in Amplify Console:

1. In the build settings page, scroll to **"Environment variables"**
2. Click **"Manage variables"**
3. Add the following variables:

| Key | Value | Notes |
|-----|-------|-------|
| `REACT_APP_API_URL` | `http://your-ec2-ip:3002` | Your backend URL from Part 1 |
| `REACT_APP_AWS_REGION` | `us-east-1` | Your AWS region |
| `REACT_APP_USER_POOL_ID` | `us-east-1_xxxxxxxxx` | Your Cognito User Pool ID |
| `REACT_APP_USER_POOL_WEB_CLIENT_ID` | `xxxxxxxxxxxxxxxxxx` | Your Cognito App Client ID |
| `REACT_APP_FILE_API_URL` | `https://xxx.execute-api.us-east-1.amazonaws.com/prod/file` | (Optional) File API Gateway URL |

**How to find these values:**

**Cognito User Pool ID & Client ID:**
```bash
# Go to AWS Cognito Console
# 1. Click on your User Pool
# 2. User Pool ID is shown at the top
# 3. Go to "App integration" → "App clients"
# 4. Copy the Client ID
```

**Backend API URL:**
```bash
# From Part 1:
# - EC2: http://your-ec2-public-ip:3002
# - Elastic Beanstalk: http://your-app.elasticbeanstalk.com
# - With domain: https://api.yourdomain.com
```

### Step 4: Review and Deploy

1. Review all settings
2. Click **"Save and deploy"**
3. Wait for build to complete (5-10 minutes)

### Step 5: Get Your Amplify URL

Once deployed, you'll see:
```
https://main.dxxxxxxxxxxxxx.amplifyapp.com
```

**Important:** Copy this URL!

---

## Part 3: Update CORS Configuration

**CRITICAL:** Your backend needs to allow requests from your Amplify domain.

### Update Backend CORS

**SSH back to your EC2 instance:**
```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
cd /home/ec2-user/nodedash4.0/server

# Edit .env file
nano .env

# Update CORS_ORIGIN:
CORS_ORIGIN=https://main.dxxxxxxxxxxxxx.amplifyapp.com

# Save and restart
pm2 restart safety-dashboard-api
pm2 logs safety-dashboard-api
```

**OR for Elastic Beanstalk:**
```bash
eb setenv CORS_ORIGIN=https://main.dxxxxxxxxxxxxx.amplifyapp.com
```

---

## Part 4: Configure Cognito User Pool

### Update Cognito for Amplify Domain

1. **Go to AWS Cognito Console**
2. Select your User Pool
3. Click **"App integration"** tab
4. Find your App Client
5. Click **"Edit"**

**Add Callback URLs:**
```
https://main.dxxxxxxxxxxxxx.amplifyapp.com/
https://main.dxxxxxxxxxxxxx.amplifyapp.com/dashboard
```

**Add Sign-out URLs:**
```
https://main.dxxxxxxxxxxxxx.amplifyapp.com/login
```

**Allowed OAuth Flows:**
- ✅ Authorization code grant
- ✅ Implicit grant

**Allowed OAuth Scopes:**
- ✅ email
- ✅ openid
- ✅ profile

Click **Save changes**

---

## Part 5: Create Admin User

You need at least one admin user to manage the system.

### Option A: AWS Console

1. **Go to Cognito Console** → Your User Pool → **Users**
2. Click **"Create user"**
3. Enter:
   - Username: `admin@example.com`
   - Email: `admin@example.com`
   - Set temporary password
4. Click **Create user**
5. Click on the user
6. Go to **Attributes** tab
7. Click **"Add attribute"**
8. Add custom attribute:
   - **Name:** `custom:admin`
   - **Value:** `true`
9. Click **Save**

### Option B: AWS CLI

```bash
# Create user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username admin@example.com \
  --user-attributes Name=email,Value=admin@example.com \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS

# Set admin attribute
aws cognito-idp admin-update-user-attributes \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username admin@example.com \
  --user-attributes Name=custom:admin,Value=true
```

---

## Part 6: Test Your Deployment

### 1. Test Frontend Access

**Visit your Amplify URL:**
```
https://main.dxxxxxxxxxxxxx.amplifyapp.com
```

**Expected:**
- ✅ Login page appears
- ✅ No demo mode button

### 2. Test Login

1. Click **"Sign in"**
2. Enter admin credentials
3. Change temporary password if prompted
4. Should redirect to dashboard

### 3. Test Authentication

**Open browser DevTools (F12):**
1. Go to **Network** tab
2. Navigate to different pages
3. Check API requests
4. Verify **Authorization: Bearer <token>** header is present

### 4. Test Admin Functions

1. Navigate to **"Users"** page
2. Verify you can see user list
3. Try to delete a test user (should work for admin)

### 5. Test Backend Health

```bash
# From your local machine
curl https://main.dxxxxxxxxxxxxx.amplifyapp.com

# Test backend directly
curl http://your-ec2-ip:3002/health
```

---

## Part 7: Set Up Custom Domain (Optional)

### Frontend Custom Domain

1. **In Amplify Console**, click your app
2. Go to **"Domain management"**
3. Click **"Add domain"**
4. Enter your domain: `app.yourdomain.com`
5. Follow DNS verification steps
6. Update Cognito callback URLs to include custom domain

### Backend Custom Domain

**Option A: Route 53 + ALB**
1. Create Application Load Balancer
2. Point to EC2 instance
3. Add SSL certificate
4. Create Route 53 record: `api.yourdomain.com`

**Option B: API Gateway**
1. Create API Gateway REST API
2. Add VPC Link to backend
3. Configure custom domain
4. Update frontend `REACT_APP_API_URL`

---

## Part 8: Enable HTTPS for Backend (Recommended)

### Option A: Using Nginx Reverse Proxy

**On your EC2 instance:**
```bash
# Install nginx
sudo yum install nginx -y  # Amazon Linux
# or
sudo apt-get install nginx -y  # Ubuntu

# Install certbot for Let's Encrypt
sudo yum install certbot python3-certbot-nginx -y

# Configure nginx
sudo nano /etc/nginx/conf.d/api.conf
```

**Add this configuration:**
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable SSL:**
```bash
# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Update Amplify environment variable:**
```
REACT_APP_API_URL=https://api.yourdomain.com
```

---

## Troubleshooting

### Issue: Build Fails in Amplify

**Check build logs in Amplify Console:**
1. Go to your app
2. Click on the failed build
3. Review logs

**Common issues:**
- Missing environment variables
- Node version mismatch (use Node 18)
- npm ci fails (check package-lock.json)

**Fix:**
```bash
# Ensure amplify.yml specifies Node 18
preBuild:
  commands:
    - nvm install 18
    - nvm use 18
```

### Issue: CORS Errors in Browser

**Symptoms:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Fix:**
1. Verify `CORS_ORIGIN` in backend matches Amplify URL exactly
2. Include protocol (https://)
3. No trailing slash
4. Restart backend after change

### Issue: "Authentication required" on Every Request

**Check:**
1. Cognito User Pool ID matches in frontend and backend
2. User is actually logged in (check browser console)
3. Token is being sent (check Network tab for Authorization header)

**Debug:**
```javascript
// In browser console
Auth.currentAuthenticatedUser()
  .then(user => console.log('User:', user))
  .catch(err => console.log('Not logged in:', err));
```

### Issue: Backend Not Responding

**Check EC2:**
```bash
# SSH to instance
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check if server is running
pm2 status

# View logs
pm2 logs safety-dashboard-api

# Check port
sudo netstat -tlnp | grep 3002

# Test locally
curl http://localhost:3002/health
```

### Issue: Database Connection Failed

**Check:**
1. RDS security group allows inbound from EC2
2. Database credentials correct in .env
3. Database exists and user has permissions

**Test connection:**
```bash
# On EC2 instance
mysql -h your-rds-endpoint.amazonaws.com -u admin -p
# Enter password
# Should connect successfully
```

---

## Security Checklist

Before going live:

- [ ] All environment variables configured
- [ ] AWS credentials have minimal IAM permissions
- [ ] Database credentials rotated from defaults
- [ ] HTTPS enabled on backend
- [ ] Cognito callback URLs restricted to your domain only
- [ ] RDS security group restricts access to backend only
- [ ] S3 bucket has proper access policies
- [ ] Admin users configured with `custom:admin=true`
- [ ] Regular users do NOT have admin attribute
- [ ] Rate limiting tested and working
- [ ] CloudWatch logs enabled for monitoring
- [ ] Backup strategy in place for database

---

## Monitoring and Maintenance

### CloudWatch Alarms (Recommended)

**Set up alerts for:**
1. EC2 CPU > 80%
2. Backend 5xx errors > 10 per minute
3. Authentication failures > 100 per hour
4. Rate limit violations > 50 per minute

### Regular Maintenance

**Weekly:**
- [ ] Review CloudWatch logs
- [ ] Check backend disk space
- [ ] Review authentication failures

**Monthly:**
- [ ] Update Node.js packages: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Rotate AWS credentials
- [ ] Review user accounts

---

## Quick Reference

### Your URLs (Fill in after deployment):

```
Frontend (Amplify): https://main.dxxxxxxxxxxxxx.amplifyapp.com
Backend (EC2): http://xx.xxx.xxx.xxx:3002
Backend (with domain): https://api.yourdomain.com
Database (RDS): your-db.xxxxx.us-east-1.rds.amazonaws.com:3306
Cognito User Pool ID: us-east-1_xxxxxxxxx
S3 Bucket: your-incident-bucket
```

### Essential Commands:

```bash
# SSH to backend
ssh -i your-key.pem ec2-user@your-ec2-ip

# Check backend status
pm2 status
pm2 logs safety-dashboard-api

# Restart backend
pm2 restart safety-dashboard-api

# Update environment variables
nano /home/ec2-user/nodedash4.0/server/.env
pm2 restart safety-dashboard-api

# View database
mysql -h your-rds-endpoint.amazonaws.com -u admin -p

# Check backend health
curl http://localhost:3002/health
```

---

## Next Steps After Deployment

1. **Test thoroughly** - All features, authentication, admin operations
2. **Monitor logs** - First 24-48 hours closely
3. **Add custom domain** - For professional appearance
4. **Set up backups** - RDS automated backups
5. **Configure alerts** - CloudWatch alarms
6. **Document** - Your specific URLs and credentials (securely!)
7. **Train users** - On new authentication requirements

---

## Need Help?

- **Build Issues:** Check Amplify build logs
- **CORS Issues:** Verify CORS_ORIGIN matches Amplify URL
- **Auth Issues:** Check Cognito configuration
- **Backend Issues:** Check PM2 logs with `pm2 logs`
- **Database Issues:** Verify security group and credentials

---

**Deployment Status:**
- [ ] Backend deployed and running
- [ ] Frontend deployed to Amplify
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] Cognito configured
- [ ] Admin user created
- [ ] Tested login and authentication
- [ ] Tested admin operations
- [ ] Monitoring enabled

**Congratulations!** 🎉 Your secure Node Safety Dashboard is now live!
