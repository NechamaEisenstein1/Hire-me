# Hire Me

An interactive portfolio and resume platform designed for recruiters and hiring managers. It presents experience, projects, and resume content through a polished frontend, a lightweight AI Q&A flow, and an admin surface for keeping content current.

![Angular](https://img.shields.io/badge/Angular-18-DD0031?logo=angular&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.116-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Gemini-4285F4?logo=google&logoColor=white)

---

## What It Shows

- A portfolio that feels like a product, not just a static profile page
- A fullstack build: Angular frontend, FastAPI backend, database, WebSockets, and AI integration
- A deployment-ready setup with Docker for local use and Terraform for cloud infrastructure

---

## Features

| Feature | Description |
|---|---|
| 🤖 **AI Interview Chat** | Ask questions about experience, projects, and background through a Gemini-powered chat flow |
| 📄 **Resume Studio** | Browse resume content with sections for skills, timeline, education, and project highlights |
| 🎲 **3D Resume Card** | Explore a Three.js resume card with motion and parallax effects |
| 🗂 **GitHub + Resume Import** | Pull project data from GitHub and upload resume files for parsing and preview |
| 📊 **Live Analytics** | Track visits in real time through REST metrics, WebSockets, and an owner dashboard |
| 🔐 **Owner Admin Panel** | Update and publish resume content through a token-protected admin flow |

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

**Backend**:

```powershell
cp .env.example .env
cd backend
poetry install
cd ..
poetry run python run_backend.py
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
| `POST` | `/api/v1/resume-profile/verify` | Verify owner token (owner only) |
| `POST` | `/api/v1/resume-profile/file` | Upload resume file (owner only) |
| `GET` | `/public/<filename>` | Download stored resume file |
| `GET` | `/api/v1/github/repos` | Load GitHub repositories for project mapping |
| `GET` | `/api/v1/analytics/admin/today` | Analytics dashboard (owner only) |
| `WS` | `/ws/visitors` | Live visitor feed |

Owner-protected endpoints require header: `X-Resume-Owner-Token: <token>`

**Resume Upload Flow**:
1. Owner uploads resume file (PDF/DOCX) in admin panel
2. Frontend parses and displays extracted content for review
3. On publish, frontend sends both profile JSON and original file to backend
4. Backend stores file in `backend/app/data/resumes/` and saves profile metadata
5. Public can download via `/public/<filename>` or use default `resume.pdf` fallback

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
