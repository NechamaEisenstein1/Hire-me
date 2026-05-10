# Hire Me — Interactive Portfolio Platform

A production-grade fullstack portfolio with an AI interview chatbot, live visitor analytics, 3D resume card, and an interactive Resume Studio — built to be explored by recruiters and hiring managers.

![Angular](https://img.shields.io/badge/Angular-18-DD0031?logo=angular&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google&logoColor=white)

---

## Features

| Feature | Description |
|---|---|
| 🤖 **AI Interview Chatbot** | Ask me anything about my experience — powered by Gemini |
| 📄 **Resume Studio** | Interactive CV viewer with skills, timeline, projects, and education |
| 🎲 **3D Resume Card** | Flippable Three.js card with live resume data and parallax tilt |
| 📊 **Live Analytics** | Real-time visitor WebSocket feed and owner admin dashboard |
| 🗂 **Resume Parser** | Upload JSON, TXT, PDF, or DOCX to preview parsed resume data |
| 🔐 **Owner Admin Panel** | Token-protected panel for managing the live resume profile |

---

## Tech Stack

**Backend** — FastAPI · Pydantic v2 · SQLAlchemy async · Alembic · Strawberry GraphQL · PostgreSQL · Gemini API · WebSockets · SlowAPI rate limiting

**Frontend** — Angular 18 · TailwindCSS · Angular Material · Three.js · GSAP · PWA · RxJS

**Infrastructure** — Docker Compose (local) · Terraform (cloud) · Nginx

---

## Project Layout

```
hire-me/
├── backend/          # FastAPI app, DB models, AI service, REST + GraphQL + WS
├── frontend/         # Angular SPA — home, resume studio, 3D resume, interview, admin
├── infra/terraform/  # ECS, RDS, S3/CloudFront cloud deployment
├── docker-compose.yml
└── .env.example
```

---

## Quick Start

### Option A — Docker Compose (recommended)

```powershell
cp .env.example .env   # fill in APP_SECRET_KEY and GEMINI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

### Option B — Local dev (no Docker)

**Backend** (from workspace root):

```powershell
cp .env.example .env   # fill in secrets
python run_backend.py
# runs on http://127.0.0.1:8001
```

**Frontend** (from `frontend/`):

```powershell
npm install
npm run start
# runs on http://localhost:4200
```

---

## Environment Variables

Copy `.env.example` to `.env` and set at minimum:

```env
APP_SECRET_KEY=replace-with-strong-secret
DATABASE_URL=sqlite+aiosqlite:///./hire_me_local.db   # SQLite for local dev
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
RESUME_OWNER_TOKEN=your-private-owner-token
```

> For Docker, use PostgreSQL: `postgresql+asyncpg://hire_me:hire_me_password@postgres:5432/hire_me`

> Never commit real keys. Rotate any key exposed in logs immediately.

---

## Key API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Health check |
| `POST` | `/api/v1/chat/messages` | AI interview chat |
| `GET` | `/api/v1/resume-profile` | Public resume data |
| `PUT` | `/api/v1/resume-profile` | Update resume (owner only) |
| `GET` | `/api/v1/analytics/admin/today` | Analytics dashboard (owner only) |
| `WS` | `/ws/visitors` | Live visitor feed |

Owner-protected endpoints require header: `X-Resume-Owner-Token: <token>`

---

## Troubleshooting

**`429 RESOURCE_EXHAUSTED` from chat**
- Verify `GEMINI_MODEL=gemini-2.5-flash` is enabled for your key
- Check quota in [Google AI Studio](https://aistudio.google.com)

**`502` from chat endpoint**
- Check backend logs for `Gemini returned HTTP ...`
- Validate `GEMINI_API_KEY` in your `.env`

**Fallback answer shown in UI**
- Backend call failed — fix provider connectivity and quota first

---

## Security Notes

- All secrets are loaded from environment variables — never hardcoded
- Rate limiting via SlowAPI on all public endpoints
- Owner token kept separate from public API surface
- TLS verification configurable via `AI_VERIFY_TLS`
