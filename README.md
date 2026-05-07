# Hire Me

Production-ready fullstack portfolio platform with an interview chatbot, live analytics, resume management, and modern Angular UI.

## Current Status

- AI provider: Gemini only
- Backend: FastAPI
- Frontend: Angular
- Database: PostgreSQL
- Chat endpoint: `/api/v1/chat/messages`

This repository no longer uses Groq or Ollama.

## Tech Stack

- Backend: FastAPI, Pydantic v2, SQLAlchemy async, Alembic, Strawberry GraphQL
- Frontend: Angular 18, RxJS, TailwindCSS, Angular Material, Three.js, GSAP, PWA
- Realtime: WebSocket visitor feed
- Data: PostgreSQL
- AI: Gemini API
- Infra: Docker Compose for local setup, Terraform for cloud infra

## Repository Layout

```text
hire-me/
  backend/
  frontend/
  infra/
  docker-compose.yml
  .env
  .env.example
```

## Environment Configuration

Use `.env` (workspace root) for local runtime configuration.

Required AI variables:

```env
AI_PROVIDER=gemini
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
AI_REQUEST_TIMEOUT_SECONDS=30
AI_VERIFY_TLS=true
```

Notes:

- `AI_PROVIDER` must be `gemini`.
- Recommended model: `gemini-2.5-flash`.
- Rotate keys regularly and never commit real keys.

## Local Run (Recommended)

### 1) Backend

From workspace root:

```powershell
python run_backend.py
```

Backend runs on:

- `http://127.0.0.1:8001`
- health: `GET /api/v1/health`

### 2) Frontend

From `frontend/`:

```powershell
npm install
npm run start
```

Frontend runs on:

- `http://localhost:4200`

## Chat Flow

1. Frontend sends question to `POST /api/v1/chat/messages`.
2. Backend enriches with resume context.
3. Backend calls Gemini `generateContent`.
4. Assistant response returns to UI.

## Validation Checklist

- `GET http://127.0.0.1:8001/api/v1/health` returns `{"status":"ok"}`
- `POST /api/v1/chat/messages` returns HTTP 200 with `answer`
- Interview page shows real answer (not fallback)

## Troubleshooting

### 429 RESOURCE_EXHAUSTED

If Gemini returns 429:

- Verify model is allowed for your key (recommended: `gemini-2.5-flash`)
- Check quota in Google AI Studio / Google Cloud project
- Confirm your key belongs to the same active project
- Ensure API key restrictions do not block `generativelanguage.googleapis.com`

### 502 from chat endpoint

- Usually means upstream provider returned an error
- Check backend logs for `Gemini returned HTTP ...`
- Validate `GEMINI_API_KEY` and `GEMINI_MODEL`

### Fallback message in UI

- Means backend call failed and frontend fallback answered from profile data
- Fix provider connectivity/quota first

## Docker Compose

`docker-compose.yml` is aligned to Gemini-only backend env wiring.

Start services:

```powershell
docker compose up --build
```

## Security Notes

- Never commit real API keys
- Keep secrets in environment variables or secret manager
- Rotate keys exposed in logs/chats immediately

## Owner Resume Endpoints

Owner token is required for private resume management:

- `POST /api/v1/resume-profile/verify`
- `PUT /api/v1/resume-profile`
- `GET /api/v1/analytics/admin/today`

Use header:

```text
X-Resume-Owner-Token: <RESUME_OWNER_TOKEN>
```
