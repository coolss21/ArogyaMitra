# ArogyaMitra 🏋️‍♀️ AI Fitness & Wellness Platform

An AI-powered fitness and wellness platform with **AROMI** — your personal agentic AI coach for personalized workouts, nutrition plans, progress tracking, and real-time adaptive coaching.

## 🌟 Features

- **🏋️ Personalized Workout Plans** — 7-day plans with warmup, exercises, cooldown, progressive overload, and YouTube links
- **🍽️ AI Nutrition Plans** — 7-day meal plans with macros, recipes, allergy-safe substitutions, Indian cuisine focused
- **🤖 AROMI Agentic AI Coach** — Real-time chat with planner→tool→response loop, automatic plan adjustment detection
- **📈 Progress Tracking** — Daily logging (weight, steps, mood, sleep, water) with Recharts visualizations
- **🎯 Gamification** — Charity pledges, streak badges, daily challenges, and achievement tracking
- **🔐 Secure** — JWT auth, bcrypt passwords, CORS, rate limiting, input validation
- **📋 Agent Audit Trail** — Full visibility into every AI decision, tool call, and result

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic |
| Frontend | React 18, Vite, TypeScript, TailwindCSS |
| AI | OpenRouter (Llama 3.3 70B), Agentic planner loop |
| Database | SQLite (local) / PostgreSQL (production) |
| HTTP Client | httpx AsyncClient (connection pooling) |
| Charts | Recharts |
| Auth | JWT (python-jose) + bcrypt (passlib) |
| Logging | structlog (JSON structured logs) |
| Deploy | GCP Cloud Run, Cloud Build CI/CD |

## 📂 Project Structure

```
arogyamitra/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app with lifespan
│   │   ├── config.py            # pydantic-settings
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── auth.py              # JWT + bcrypt
│   │   ├── models/models.py     # 12 SQLAlchemy models
│   │   ├── schemas/schemas.py   # Pydantic v2 schemas
│   │   ├── routers/             # API routers
│   │   │   ├── auth.py          # register, login, me
│   │   │   ├── profile.py       # CRUD + export + delete
│   │   │   ├── plans.py         # workout/nutrition generation
│   │   │   ├── aromi.py         # chat, adjust, events, memory
│   │   │   ├── progress.py      # logging + summary
│   │   │   ├── gamification.py  # pledges
│   │   │   ├── challenges.py    # daily challenges
│   │   │   ├── grocery.py       # grocery list
│   │   │   ├── reports.py       # weekly report
│   │   │   └── admin.py         # admin endpoints
│   │   └── services/
│   │       ├── agent.py         # Agentic planner loop
│   │       ├── tools.py         # 6 agent tools
│   │       ├── ai_orchestrator.py
│   │       ├── openrouter.py    # httpx AsyncClient singleton
│   │       ├── verifier.py      # JSON schema validation + repair
│   │       ├── memory.py        # user memory CRUD
│   │       └── youtube.py       # YouTube Data API + fallback
│   ├── tests/test_core.py       # 12 pytest tests
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   ├── Dockerfile               # Multi-stage, Cloud Run ready
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry with QueryClient
│   │   ├── App.tsx              # Routes + RequireAuth
│   │   ├── index.css            # Tailwind + design system
│   │   ├── lib/api.ts           # Typed API client with JWT
│   │   ├── components/          # Layout, MuscleHeatmap, PDFs
│   │   └── pages/               # 16 pages
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── nginx.conf               # Production SPA serving
│   ├── Dockerfile               # Multi-stage nginx
│   └── .dockerignore
├── docker-compose.yml           # Local dev with Postgres
├── cloudbuild.yaml              # GCP Cloud Build CI/CD
├── .gcloudignore
├── .env.example
└── README.md
```

## 🚀 How to Run Locally

### Prerequisites
- Python 3.11+
- Node.js 18+
- (Optional) Docker & Docker Compose

### 1. Setup Environment Variables

```bash
cp .env.example backend/.env
# Edit backend/.env and set at minimum:
#   OPENROUTER_API_KEY=your-key-here
#   JWT_SECRET=your-secret-here
```

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API docs are at: **http://localhost:8000/docs**

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend is at: **http://localhost:5173**

### 4. (Alternative) Docker Compose

```bash
# From project root
docker-compose up --build
```

This starts backend (8000), frontend (5173 → 8080), and PostgreSQL (5432).

## 🧪 Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

12 tests covering: auth, schemas, JSON validation, plan hash caching, verifier repair loop, adjustment marker detection, agent events, CORS/rate-limit config.

## ☁️ GCP Cloud Run Deployment

### Prerequisites
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed
- A GCP project with billing enabled
- Cloud Build API and Cloud Run API enabled

### Option 1: Automated CI/CD (Cloud Build)

```bash
# 1. Set your project
gcloud config set project YOUR_PROJECT_ID

# 2. Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# 3. Set secrets as Cloud Run env vars (after first deploy)
gcloud run services update arogyamitra-api \
  --region asia-south1 \
  --set-env-vars "OPENROUTER_API_KEY=sk-...,JWT_SECRET=your-secret,DATABASE_URL=postgresql://..."

# 4. Deploy via Cloud Build
gcloud builds submit --config=cloudbuild.yaml
```

### Option 2: Manual Deploy

```bash
# Backend
cd backend
gcloud run deploy arogyamitra-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production,OPENROUTER_API_KEY=sk-...,JWT_SECRET=...,DATABASE_URL=..."

# Frontend (set VITE_API_BASE_URL to your backend Cloud Run URL)
cd frontend
docker build -t gcr.io/YOUR_PROJECT/arogyamitra-web \
  --build-arg VITE_API_BASE_URL=https://arogyamitra-api-XXXX.asia-south1.run.app .
docker push gcr.io/YOUR_PROJECT/arogyamitra-web
gcloud run deploy arogyamitra-web \
  --image gcr.io/YOUR_PROJECT/arogyamitra-web \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

### Database (Supabase PostgreSQL)

For production, use [Supabase](https://supabase.com) free-tier Postgres:

```
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

## 📮 API Examples (curl)

### Register + Generate Plan

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"strongpass123"}'

# Update Profile
curl -X PUT http://localhost:8000/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Rahul","age":28,"height_cm":175,"weight_kg":75,"fitness_level":"intermediate","goal":"muscle_gain","location":"gym","equipment":"dumbbells, barbell, bench","minutes_per_day":45,"days_per_week":5,"diet_type":"non-veg","cuisine_preference":"Indian","calorie_target":2500,"onboarding_complete":true}'

# Generate 7-Day Workout Plan
curl -X POST http://localhost:8000/plans/workout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goal":"muscle_gain","location":"gym","minutes_per_day":45}'
```

### AROMI Chat

```bash
curl -X POST http://localhost:8000/aromi/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"I injured my shoulder yesterday, what should I do?"}'
```

### Agent Events (Audit Trail)

```bash
curl http://localhost:8000/aromi/events?limit=50 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔒 Security Features

- JWT access tokens with configurable expiry
- bcrypt password hashing (passlib)
- CORS origin whitelist (configurable via env)
- Rate limiting on auth (10/min) + AI (5/min) endpoints
- Request body size limit (1MB)
- Input validation (Pydantic v2)
- No secrets/PII in logs (structlog JSON)
- AI safety: no diagnosis, no medical claims, disclaimers on all plans
- Role-based access (user/admin)
- Data export + account deletion (GDPR compliance)

## ⚠️ Disclaimer

ArogyaMitra and AROMI are AI tools for fitness guidance only. They are **not** medical professionals. Always consult qualified healthcare professionals before starting any exercise or nutrition program, especially if you have medical conditions or injuries.