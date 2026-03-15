# Deploying node Safety Dashboard to AWS Amplify Hosting

This guide covers every step needed to deploy this React app to **AWS Amplify Hosting** (static-site hosting, not the Amplify Gen 2 full-stack CLI).

---

## Prerequisites

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
