# AWS Amplify Deployment Guide - Node Safety Dashboard

## 🚀 Quick Start: Deploying Your Secured App to Amplify

This guide walks you through deploying the newly secured Node Safety Dashboard to AWS Amplify.
# Deploying node Safety Dashboard to AWS Amplify Hosting

This guide covers every step needed to deploy this React app to **AWS Amplify Hosting** (static-site hosting, not the Amplify Gen 2 full-stack CLI).

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
| Requirement | Notes |
|---|---|
| AWS account | Free tier is fine for a small team |
| GitHub repo connected to Amplify | This repo at `prxtn123/nodedash4.0` |
| (Optional) AWS Cognito User Pool | Only required if `REACT_APP_ENABLE_AUTH=true` |
| (Optional) AWS API Gateway endpoints | Only required for live incident data |

---

## Step 1 — Create a new Amplify Hosting app

1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify/home).
2. Click **"Create new app"** → **"Host web app"**.
3. Choose **GitHub** as the source and authorise AWS Amplify to access your account.
4. Select the repository **`prxtn123/nodedash4.0`** and the branch you want to deploy (e.g. `main`).
5. Click **Next**.

---

## Step 2 — Build settings

Amplify will detect the `amplify.yml` file at the root of the repo automatically. Confirm the build settings look like this (they should auto-populate):

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - nvm use 18 || (nvm install 18 && nvm use 18)
        - node --version
        - npm ci
    build:
      commands:
        - CI=false npm run build
  artifacts:
    baseDirectory: build
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

> **`CI=false`** is important — without it, React Scripts treats ESLint warnings as errors and the build fails.

Click **Next**.

---

## Step 3 — Environment variables

In the **"Advanced settings"** section of the wizard (or later under **App settings → Environment variables**), add every variable below.

### Required variables

| Variable | Example value | Purpose |
|---|---|---|
| `REACT_APP_AWS_REGION` | `us-east-1` | AWS region for all services |
| `REACT_APP_ENVIRONMENT` | `production` | Labels the running environment |
| `REACT_APP_VERSION` | `0.1.0` | Displayed version string |

### Variables required for live API data

| Variable | Example value | Purpose |
|---|---|---|
| `REACT_APP_API_INCIDENTS_URL` | `https://xyz.execute-api.us-east-1.amazonaws.com/prod/incidents` | Incidents API endpoint |
| `REACT_APP_API_REGIONS_URL` | `https://xyz.execute-api.us-east-1.amazonaws.com/prod/regions` | Regions API endpoint |
| `REACT_APP_S3_BUCKET` | `node-safety-videos` | S3 bucket for video/media |
| `REACT_APP_S3_REGION` | `us-east-1` | Region of the S3 bucket |

### Variables required when authentication is enabled

| Variable | Example value | Purpose |
|---|---|---|
| `REACT_APP_ENABLE_AUTH` | `true` | Enables Cognito auth gates |
| `REACT_APP_USER_POOL_ID` | `us-east-1_XXXXXXXXX` | Cognito User Pool ID |
| `REACT_APP_USER_POOL_WEB_CLIENT_ID` | `xxxxxxxxxxxxxxxxxxxxxxxxxx` | Cognito App Client ID |

### Optional / feature-flag variables

| Variable | Default | Purpose |
|---|---|---|
| `REACT_APP_AUTO_REFRESH_INTERVAL` | `10000` | Dashboard auto-refresh in ms |
| `REACT_APP_DEBUG_MODE` | `false` | Verbose console logging |

> **Security note:** These variables are baked into the JavaScript bundle at build time. Do **not** put secrets or private keys here — only public-facing identifiers such as Cognito Client IDs.

---

## Step 4 — Deploy

Click **"Save and deploy"**. Amplify will:

1. Clone your repository.
2. Run `npm ci` to install dependencies.
3. Run `CI=false npm run build` to create the production bundle in `build/`.
4. Upload the `build/` directory to Amplify's managed CDN.

The first build typically takes 3–5 minutes. Subsequent builds are faster because `node_modules` is cached.

---

## Step 5 — Configure SPA rewrites (critical for React Router)

The app uses **React Router** (`BrowserRouter`). When a user navigates directly to a deep link such as `https://your-app.amplifyapp.com/incidents`, Amplify will return a 404 unless you configure a catch-all rewrite.

1. In the Amplify Console, go to your app → **Hosting → Rewrites and redirects**.
2. Click **"Edit"** → **"Add rewrite"** and enter:

| Field | Value |
|---|---|
| **Source address** | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json\|webp)$)([^.]+$)/>` |
| **Target address** | `/index.html` |
| **Type** | `200 (Rewrite)` |

3. Click **"Save"**.

This rule rewrites all requests that don't match a static asset extension to `index.html`, letting React Router handle the routing client-side.

> **Why this is necessary:** Without this rule, refreshing the browser on any route other than `/` returns an HTTP 404 from Amplify's CDN.

---

## Step 6 — Custom domain (optional)

1. In the Amplify Console, go to **App settings → Domain management**.
2. Click **"Add domain"** and follow the prompts to connect your custom domain.
3. Amplify provisions an SSL certificate via AWS Certificate Manager automatically.

---

## Step 7 — Branch-based environments (optional)

Amplify can deploy different branches to different URLs automatically:

- `main` → `https://main.xxxx.amplifyapp.com` (production)
- `staging` → `https://staging.xxxx.amplifyapp.com`
- Pull request previews → automatically generated per PR

Each branch can have its own set of environment variables (e.g. point `staging` at a staging API Gateway endpoint).

---

## Cognito setup reference

If `REACT_APP_ENABLE_AUTH=true`, create (or locate) a Cognito User Pool:

1. Open **Amazon Cognito → User Pools → Create user pool**.
2. Choose sign-in with **Email**.
3. Under **App clients**, create a new app client (no client secret — this is a public SPA).
4. Copy the **User Pool ID** and **App Client ID** into the Amplify environment variables above.
5. In **App client settings**, add your Amplify domain as an allowed callback URL:
   - `https://your-app.amplifyapp.com/`
   - (add your custom domain too if you configured one)

The values from this repo's existing Cognito pool are stored in `amplify/team-provider-info.json` under the `dev` environment if you need a reference.

---

## Local development

```bash
# Install dependencies
npm install

# Start the mock API server + React dev server together
npm run dev

# Or start only the React dev server (uses mock data)
npm start
```

Copy `.env.example` to `.env` and fill in real values for local development against live AWS resources.

```bash
cp .env.example .env
# Edit .env with your values
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails with "Treating warnings as errors" | Ensure `CI=false` is set in the build command (already done in `amplify.yml`) |
| 404 on page refresh / deep links | Add the SPA rewrite rule in Step 5 above |
| Blank page after deploy | Check browser console for missing `REACT_APP_*` variables — set them in Amplify environment variables |
| Auth loop / redirect issues | Verify `REACT_APP_USER_POOL_ID` and `REACT_APP_USER_POOL_WEB_CLIENT_ID` are correct, and that your Amplify URL is an allowed callback in the Cognito app client |
| CORS errors from API | Add your Amplify app domain to the allowed origins on your API Gateway or Lambda |
