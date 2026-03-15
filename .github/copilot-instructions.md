# node Safety Dashboard – Copilot Instructions

## Project Overview
AI-powered warehouse safety incident monitoring dashboard. A React 18 SPA (CRA) + Express backend that ingests safety events from Jetson edge devices, stores metadata in Supabase, video clips in S3, and building/camera config in MySQL (RDS).

## Architecture & Data Flow

```
Jetson device → S3 (video clip) → POST /v1/api/incidents → Supabase (metadata)
Dashboard (React) → Express backend (port 3002) → Supabase + S3 presigned URLs
Building/camera config → MySQL (RDS) – legacy, still live
Auth → AWS Cognito (JWT RS256)
```

**Two separate processes must run concurrently in development:**
- Frontend: `npm start` (port 3000, CRA dev server)
- Backend: `npm start` inside `server/` (port 3002). The real server is `server/index.js`.

## Key Directories
| Path | Purpose |
|---|---|
| `src/scenes/` | Page-level React components (one folder per route) |
| `src/services/dashboardApi.js` | **Single source of truth** for all frontend API calls |
| `src/components/` | Shared UI components (charts, cards, header) |
| `src/config/api.js` | Authenticated axios factory using Cognito JWT |
| `server/services/incidentService.js` | Supabase fetch + S3 presigned URL generation |
| `server/services/supabaseService.js` | Raw Supabase queries + incident enrichment |
| `server/config/scoring.js` | Incident type registry – deductions, risk scores, groups |
| `server/middleware/auth.js` | JWT verification (JWKS from Cognito), rate limiting |
| `server/config/db.js` | MySQL connection (legacy building/camera data) |

## Critical Patterns

### API calls always fall back to mock data
Every function in `src/services/dashboardApi.js` wraps its `axios` call in try/catch and returns `MOCK.*` on failure. **Never throw from these functions** – the UI must stay functional for demos without a live backend.

```js
export const fetchIncidents = async () => {
  try { return await get("/v1/api/incidents"); }
  catch { console.warn("[API] unavailable – using mock data"); return MOCK.incidents; }
};
```

### Incident type keys must match `SCORING_RULES` exactly
`server/config/scoring.js` is the canonical registry. Values include `group`, `deduction`, `risk_score`, `severity`. The frontend KPI filters in `IncidentDashboard.jsx` use both `safety_event_type` and `group` fields:
```js
incidents.filter(i => i.group === 'mhe' || i.safety_event_type === 'mhe-close-2.5m')
```
When adding a new incident type, update `SCORING_RULES` first; `supabaseService.js` calls `enrichIncident()` which looks up the rule.

### Authentication flow
- Frontend: `src/components/ProtectedRoute.jsx` checks `Auth.currentAuthenticatedUser()` (aws-amplify). All protected pages use this wrapper.
- Backend: All routes (except Cognito admin endpoints) use `authenticateToken` middleware from `server/middleware/auth.js`. Admin routes additionally use `requireAdmin`.
- `src/config/api.js` exports `createAuthenticatedAxios()` / `authenticatedGet()` – use these for any new authenticated frontend calls.

### Environment variables split
- **Frontend `.env`** (root): `REACT_APP_*` prefix only. Contains API URL, Cognito Pool ID & Client ID. **No AWS credentials.**
- **Backend `server/.env`**: Supabase service role key, AWS credentials, DB credentials, Cognito Pool ID for JWT validation.
- Template: `.env.example` in root covers both sections.

### Theme system
`src/theme.js` exports `tokens(mode)` (colour palette) and `ColorModeContext`. Components pull colours via MUI `useTheme()`. The dashboard uses a dark-first design (`primary[500]` = `#141b2d` background).

### Supabase table schema
Incidents table key fields: `id` (text PK, format `timestamp-camera_id`), `incident_type` (must match `SCORING_RULES` key), `clip_s3_key` (relative S3 key), `timestamp` (timestamptz).

## Dev Commands
```bash
npm start                      # Frontend on :3000
node server/index.js           # Real backend on :3002
cd server && npm run devStart  # Backend with nodemon
npm test                       # CRA Jest tests
npm run build                  # Production build → build/
```

## Active vs. Legacy Code
- `src/services/mockData.js` is **deprecated** – all stubs, do not add to it.
- MySQL (`server/config/db.js`) is **legacy** – used only for building/floor/camera config endpoints. New incident data goes through Supabase.
- CSV-based incident ingestion (`S3_INCIDENTS_PREFIX`) is **deprecated** in favour of Supabase.
- `server/mockServer.js` is **retired** – do not use or reference it.
- Active `src/scenes/` folders are exactly: `incident-dashboard/`, `incidents/`, `safety-detail/`, `map/`, `team/`, `login/`.
