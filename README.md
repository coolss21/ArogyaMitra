# ArogyaMitra 🏋️‍♀️ AI Fitness & Wellness Platform

An AI-powered fitness and wellness platform with **AROMI** — your personal AI coach for personalized workouts, nutrition plans, progress tracking, and real-time adaptive coaching.

## 🌟 Features

- **🏋️ Personalized Workout Plans** — 7-day plans with warmup, exercises, cooldown, progressive overload, and YouTube links
- **🍽️ AI Nutrition Plans** — 7-day meal plans with macros, recipes, allergy-safe substitutions, Indian cuisine focused
- **🤖 AROMI AI Coach** — Real-time chat with your AI wellness coach, with auto-adjustment detection
- **📈 Progress Tracking** — Daily logging (weight, steps, mood, sleep, water) with Recharts visualizations
- **🎯 Gamification** — Charity pledges, streak badges, and achievement tracking
- **🔐 Secure** — JWT auth, bcrypt passwords, CORS, rate limiting, input validation

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, SQLAlchemy 2.x, Pydantic v2 |
| Frontend | React 18, Vite, TypeScript, TailwindCSS |
| AI | OpenRouter (Llama 3.3 70B) |
| Database | SQLite (default) / PostgreSQL (Supabase mode) |
| Charts | Recharts |
| Auth | JWT (python-jose) + bcrypt (passlib) |

## 📂 Project Structure

```
arogyamitra/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # SQLAlchemy engine
│   │   ├── auth.py              # JWT + password utilities
│   │   ├── models/models.py     # 10 SQLAlchemy models
│   │   ├── schemas/schemas.py   # Pydantic v2 schemas
│   │   ├── routers/             # 7 API routers
│   │   │   ├── auth.py
│   │   │   ├── profile.py
│   │   │   ├── plans.py
│   │   │   ├── aromi.py
│   │   │   ├── progress.py
│   │   │   ├── gamification.py
│   │   │   └── admin.py
│   │   └── services/            # AI + integration services
│   │       ├── ai_orchestrator.py
│   │       ├── openrouter.py
│   │       ├── youtube.py
│   │       └── spoonacular.py
│   ├── tests/test_core.py       # 7 pytest unit tests
│   ├── alembic/                 # Database migrations
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   ├── lib/api.ts           # API client with JWT
│   │   ├── components/Layout.tsx
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── OnboardingPage.tsx
│   │       ├── DashboardPage.tsx
│   │       ├── WorkoutPage.tsx
│   │       ├── NutritionPage.tsx
│   │       ├── AromiPage.tsx
│   │       ├── ProgressPage.tsx
│   │       └── SettingsPage.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker-compose.yml
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
cp .env.example .env
# Edit .env and set at minimum:
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

This starts backend (8000), frontend (5173), and PostgreSQL (5432).

For Supabase/Postgres mode, set in your `.env`:
```
SUPABASE_MODE=true
SUPABASE_DATABASE_URL=postgresql://aromi:aromi_secret@localhost:5432/arogyamitra
```

## 🧪 Running Tests

```bash
cd backend
python -m pytest tests/ -v
```

## 📮 API Examples (curl)

### Scenario 1: Register + Generate Workout Plan

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"strongpass123"}'

# Save the token from response, then:

# Update Profile
curl -X PUT http://localhost:8000/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Rahul","age":28,"height_cm":175,"weight_kg":75,
    "fitness_level":"intermediate","goal":"muscle_gain",
    "location":"gym","equipment":"dumbbells, barbell, bench",
    "minutes_per_day":45,"days_per_week":5,
    "diet_type":"non-veg","cuisine_preference":"Indian",
    "calorie_target":2500,"onboarding_complete":true
  }'

# Generate 7-Day Workout Plan
curl -X POST http://localhost:8000/plans/workout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"goal":"muscle_gain","location":"gym","minutes_per_day":45}'
```

### Scenario 2: Generate Nutrition Plan

```bash
curl -X POST http://localhost:8000/plans/nutrition \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"calorie_target":2500,"diet_type":"non-veg","allergies":"peanut","cuisine_preference":"Indian"}'
```

### Scenario 3: AROMI Chat + Plan Adjustment

```bash
# Chat with AROMI
curl -X POST http://localhost:8000/aromi/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"I injured my shoulder yesterday, what should I do?"}'

# Direct plan adjustment
curl -X POST http://localhost:8000/aromi/adjust \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"change_type":"injury","details":"shoulder pain, cannot do overhead presses","days_to_adjust":5}'
```

### Progress Logging

```bash
curl -X POST http://localhost:8000/progress/log \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-02","weight_kg":74.5,"steps":8500,"workout_completed":true,"mood":4,"sleep_hours":7.5,"water_litres":2.5}'
```

## 👤 Sample Users

| Email | Password | Role |
|-------|----------|------|
| test@example.com | strongpass123 | user |
| admin@arogyamitra.com | AdminP@ss2026 | admin (set role in DB) |

## 🔒 Security Features

- JWT access tokens with configurable expiry
- bcrypt password hashing (passlib)
- CORS origin whitelist (configurable)
- Rate limiting on auth + AI generation endpoints (slowapi)
- Request body size limit (1MB)
- Input validation (Pydantic v2)
- No secrets/PII in logs
- AI safety: no diagnosis, no medical claims, disclaimers on all plans
- Role-based access (user/admin)
- Data export + account deletion (privacy compliance)

## ⚠️ Disclaimer

ArogyaMitra and AROMI are AI tools for fitness guidance only. They are **not** medical professionals. Always consult qualified healthcare professionals before starting any exercise or nutrition program, especially if you have medical conditions or injuries.
