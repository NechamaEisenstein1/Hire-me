# Hire Me - Production Portfolio Platform

A production-grade portfolio and interactive resume platform that demonstrates full-stack engineering skills through implementation quality, performance, and architecture.

## Stack

- Backend: FastAPI, Pydantic v2, SQLAlchemy 2.0 async, Alembic, PostgreSQL, Strawberry GraphQL
- Frontend: Angular 18 (standalone components, signals, RxJS), TailwindCSS, Angular Material, Three.js, GSAP, PWA
- Realtime: WebSocket visitor counter
- AI: Interview chatbot via Groq or Ollama provider abstraction
- Security: JWT auth, rate limiting, secure headers
- Deployment: Docker, AWS ECS Fargate, RDS, S3, CloudFront

## Core Product Features

- 3D interactive resume with floating project cards
- Live GitHub stats panel
- Interview Me chatbot
- Realtime visitor count and event stream
- Hybrid API surface: REST + GraphQL
- Dark/light mode with persistence
- PWA installability and offline support

## High-Level Architecture

- frontend/ serves a static Angular build (Nginx in container), deployed to S3 + CloudFront for production.
- backend/ serves REST, GraphQL, and WebSocket endpoints from FastAPI.
- PostgreSQL stores users, projects, visitor events, and chat sessions.
- ECS Fargate runs backend tasks behind an ALB.
- RDS PostgreSQL provides managed data persistence.
- CloudFront distributes frontend assets globally.

## Performance and Quality Targets

- Lighthouse 100 targets: Performance, Accessibility, Best Practices, SEO
- Core Web Vitals targets:
  - LCP < 2.5s
  - CLS < 0.1
  - INP < 200ms
- API p95 latency target < 200ms (cached and optimized endpoints)
- Zero critical vulnerabilities in CI scans

## Repository Structure

```text
hire-me/
  backend/
  frontend/
  infra/
  ci/
  docs/
  monitoring/
```

## Development Prerequisites

- Docker Desktop (or Docker Engine)
- Node.js 22+
- Python 3.12+
- PostgreSQL client tools (optional)
- Terraform 1.8+ (for infra)
- AWS CLI v2 (for deployment)

## Local Development Plan

1. Start with Docker Compose for backend + database.
2. Run Angular frontend with local proxy for API and WS.
3. Apply migrations using Alembic.
4. Seed demo data and verify 3D/real-time/chat features.

## Environment Variables (Summary)

Backend:

- APP_ENV
- APP_SECRET_KEY
- DATABASE_URL
- JWT_ALGORITHM
- JWT_ACCESS_TOKEN_EXPIRES_MINUTES
- RATE_LIMIT_REQUESTS_PER_MINUTE
- GITHUB_TOKEN
- GITHUB_USERNAME
- AI_PROVIDER (groq|ollama)
- GROQ_BASE_URL
- GROQ_API_KEY
- GROQ_MODEL
- OLLAMA_BASE_URL
- OLLAMA_MODEL
- AI_REQUEST_TIMEOUT_SECONDS

Frontend:

- API_BASE_URL
- GRAPHQL_URL
- WS_URL
- APP_TITLE

## API Surface (Planned)

REST:

- /api/v1/health
- /api/v1/auth/login
- /api/v1/projects
- /api/v1/github/stats
- /api/v1/chat/messages

GraphQL:

- /graphql for queries/mutations
- Optional subscriptions for selected realtime feeds

WebSocket:

- /ws/visitors

## Security Baseline

- JWT access tokens for protected operations
- Password hashing with Argon2
- Rate limiting on auth/chat/public hotspots
- CORS allowlist by environment
- Security headers middleware
- Input validation with Pydantic models

## CI/CD Overview

- backend-ci: lint, type-check, tests, security checks
- frontend-ci: lint, unit tests, production build, Lighthouse budget checks
- infra-plan: terraform validate/plan
- deploy: build/push images and deploy to ECS + invalidate CloudFront

## Milestone Build Order

1. Backend foundation (FastAPI app, config, database session, health check)
2. Frontend foundation (Angular standalone app, Tailwind, Material, theme)
3. Feature modules (projects, GitHub stats, visitor WS, chatbot)
4. 3D resume scene (Three.js + GSAP)
5. Auth + rate limiting + observability
6. Docker + infra + CI/CD hardening

## Lighthouse 100 Implementation Notes

- Optimize images (AVIF/WebP), defer non-critical media
- Use route-level code splitting and preloading strategy
- Minimize JS execution in initial route
- SSR-like rendering strategy where practical (or prerender for key pages)
- Strong semantic HTML and ARIA labels
- Strict color contrast and keyboard navigability

## Next File

Next recommended file: .gitignore
