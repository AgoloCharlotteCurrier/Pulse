# Pulse — Feature Summary

Pulse is a trend research platform that helps teams stay current on what's being discussed online. It scans Reddit, X (Twitter), and the web for recent discussions on any topic, synthesizes findings, and extracts actionable insights.

**Tech stack:** React 19 + TypeScript + Vite + Tailwind CSS (frontend), Python FastAPI (backend), PostgreSQL (database), Vercel (deployment), Google OAuth 2.0 (auth), OpenAI & xAI APIs (AI research).

---

## Core Features

### AI-Powered Topic Research
- Submit any topic and Pulse researches it across **Reddit**, **X (Twitter)**, and the **web**.
- Configurable **lookback period**: 7, 14, 30, 60, or 90 days.
- Configurable **source selection**: Auto, Reddit-only, X-only, or Both.
- Configurable **depth**: Quick (8–12 sources), Default, or Deep (50–70 sources).
- Research runs **asynchronously** with real-time status tracking (running, completed, failed).
- Powered by the integrated `last30days-skill` research engine.

### Engagement Metrics and Scoring
- **Reddit results** include upvotes, comment counts, subreddit, and relevance scores.
- **X results** include likes, reposts, replies, author handles, and relevance scores.
- Custom scoring algorithm ranks items by relevance.
- Each result includes a "why relevant" explanation.
- Automatic deduplication across sources.

### Research History
- Paginated history of all past research runs (20 per page).
- Status badges with color coding (completed, failed, running).
- Summary columns for Reddit and X result counts.
- Click-through to detailed result views.
- Per-user filtering — users only see their own runs.

### Detailed Run View
- Full metadata: topic, parameters, status, timestamps.
- Card-based layout for Reddit and X results with engagement metrics.
- Score badges color-coded by source (indigo for Reddit, sky for X).
- Error message display when individual sources fail.
- External links to original posts open in new tabs.

---

## Authentication and Security

### Google OAuth 2.0
- Sign in with Google accounts.
- Optional domain restriction via `ALLOWED_DOMAIN` setting to limit access by email domain.
- JWT tokens (HS256) with 7-day expiry, stored in localStorage.
- Automatic redirect to login on token expiration.

### Protected Routes
- All routes except login require authentication (`ProtectedRoute` component).
- User data isolation — database queries filter by `user_id`.
- Backend validates JWT on every authenticated API request.

---

## Pages and Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Login | Google OAuth sign-in with domain validation |
| `/search` | Search | Main research interface with topic input, parameter selectors, and results display |
| `/history` | History | Paginated list of past research runs with status and engagement counts |
| `/run/:id` | Run Detail | Full results and metadata for a specific research run |

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/google` | Google OAuth login, returns JWT |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `POST` | `/api/research` | Start a new asynchronous research run |
| `GET` | `/api/research/{run_id}` | Fetch results for a specific run |
| `GET` | `/api/history` | Paginated research history (query params: `page`, `per_page`) |
| `GET` | `/api/health` | Health check |

---

## AI Service Integration

| Service | Purpose | Required |
|---------|---------|----------|
| **OpenAI API** | Reddit and web research via web search | Optional |
| **xAI API** | X/Twitter research via live search | Optional |

The app supports three operating modes:
- **Full mode** — Both API keys configured; researches Reddit and X.
- **Partial mode** — One API key configured; researches the available source.
- **Web-only mode** — No API keys; relies on web search only.

---

## Data Models

### User
- `id`, `email` (unique, indexed), `name`, `picture` (URL), `created_at`
- Has many Runs.

### Run
- `id`, `user_id` (FK), `topic`, `days_back`, `sources`, `depth`
- `status` (running, completed, failed)
- `result_json` (full research results as JSON)
- `reddit_count`, `x_count` (result counts)
- `error` (error message if failed)
- `created_at`, `completed_at`

---

## UI/UX

### Design System
- Tailwind CSS v4 with indigo primary color scheme.
- Mobile-first responsive layout with grid columns.
- Dark navbar (`bg-gray-800`) with user profile picture and navigation links.
- Card-based results with hover effects and smooth transitions.

### Loading and Error States
- Spinner animations during research execution.
- Colored alert boxes for errors.
- Graceful degradation when individual sources fail (partial results still shown).
- Disabled button states and "Researching..." feedback text.
- Empty state handling on the history page.

---

## Deployment and Infrastructure

### Vercel
- Serverless Python API via Vercel Functions.
- SPA routing — all non-API routes serve `index.html`.
- Frontend built with Vite, output to `frontend/dist/`.

### Database
- **Production:** PostgreSQL via Vercel Postgres.
- **Local development:** SQLite (writes to `/tmp` on Vercel).
- Auto-creates tables on first use.
- Connection pooling with health checks.

### Environment Variables
- `OPENAI_API_KEY` — OpenAI API access (optional).
- `XAI_API_KEY` — xAI API access (optional).
- `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` — Google OAuth (required).
- `JWT_SECRET` — JWT signing key (required).
- `ALLOWED_DOMAIN` — Email domain restriction (optional).
- `DATABASE_URL` — PostgreSQL connection string (auto from Vercel Postgres).
- `FRONTEND_URL` — CORS origin for production.
