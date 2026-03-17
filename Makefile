SHELL := /bin/sh

.PHONY: help up down logs ps backend-shell backend-migrate backend-seed

help:
	@echo "Available commands:"
	@echo "  make up              - Start local stack"
	@echo "  make down            - Stop local stack"
	@echo "  make logs            - Follow all logs"
	@echo "  make ps              - Show service status"
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

backend-shell:
	docker compose exec backend /bin/sh

backend-migrate:
	docker compose exec backend alembic upgrade head

backend-seed:
	docker compose exec backend python -m app.cli seed
