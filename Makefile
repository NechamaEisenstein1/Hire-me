SHELL := /bin/sh

.PHONY: help up down logs ps backend-shell backend-migrate backend-seed

help:
	@echo "Available commands:"
	@echo "  make up              - Start local stack"
	@echo "  make down            - Stop local stack"
	@echo "  make logs            - Follow all logs"
	@echo "  make ps              - Show service status"
	@echo "  make check           - Verify all services are healthy"
	@echo "  make backend-shell   - Open shell in backend container"
	@echo "  make backend-migrate - Run Alembic migrations"
	@echo "  make backend-seed    - Seed demo data"

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

check:
	docker compose ps
	curl -sf http://localhost:8000/health && echo "Backend OK" || echo "Backend FAILED"
	curl -sf http://localhost:4200 > /dev/null && echo "Frontend OK" || echo "Frontend FAILED"

backend-shell:
	docker compose exec backend /bin/sh

backend-migrate:
	docker compose exec backend alembic upgrade head

backend-seed:
	docker compose exec backend python -m app.cli seed
