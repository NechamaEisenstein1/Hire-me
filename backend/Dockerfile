FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_TRUSTED_HOST="pypi.org files.pythonhosted.org pypi.python.org"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pyproject.toml + app source so pip can build the package and read its dependencies
COPY pyproject.toml ./
COPY app ./app

# Use pip directly (respects PIP_TRUSTED_HOST) instead of poetry's own HTTP client
RUN pip install --upgrade pip && pip install .

# Copy remaining files (alembic, entrypoint, etc.)
COPY . .

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
