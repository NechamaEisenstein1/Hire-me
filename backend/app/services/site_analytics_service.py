from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from app.core.config import Settings, get_settings


AnalyticsDocument = dict[str, dict[str, int]]


def record_visit(*, settings: Settings | None = None) -> None:
    _increment('visits_by_day', settings=settings)


def record_resume_download(*, settings: Settings | None = None) -> None:
    _increment('resume_downloads_by_day', settings=settings)


def get_today_stats(*, settings: Settings | None = None) -> dict[str, int]:
    resolved_settings = settings or get_settings()
    data = _read_analytics_data(resolved_settings)
    today_key = _today_key()

    return {
        'visitors_today': int(data.get('visits_by_day', {}).get(today_key, 0)),
        'resume_downloads_today': int(data.get('resume_downloads_by_day', {}).get(today_key, 0)),
    }


def _increment(bucket: str, *, settings: Settings | None = None) -> None:
    resolved_settings = settings or get_settings()
    data = _read_analytics_data(resolved_settings)

    if bucket not in data:
        data[bucket] = {}

    today_key = _today_key()
    current = int(data[bucket].get(today_key, 0))
    data[bucket][today_key] = current + 1
    _write_analytics_data_atomic(data, resolved_settings)


def _read_analytics_data(settings: Settings) -> AnalyticsDocument:
    path = _resolve_analytics_path(settings)
    if not path.exists():
        _write_analytics_data_atomic(_default_analytics_data(), settings)

    try:
        payload = json.loads(path.read_text(encoding='utf-8'))
    except (json.JSONDecodeError, OSError):
        payload = _default_analytics_data()

    visits = payload.get('visits_by_day')
    downloads = payload.get('resume_downloads_by_day')
    return {
        'visits_by_day': visits if isinstance(visits, dict) else {},
        'resume_downloads_by_day': downloads if isinstance(downloads, dict) else {},
    }


def _write_analytics_data_atomic(data: AnalyticsDocument, settings: Settings) -> None:
    """Write atomically: serialise to a temp file then rename over the target.

    os.replace() is atomic on POSIX and best-effort on Windows (will fail if
    the target is locked, but never produces a partial file).
    """
    path = _resolve_analytics_path(settings)
    path.parent.mkdir(parents=True, exist_ok=True)

    payload = json.dumps(data, ensure_ascii=False, indent=2)
    fd, tmp_path = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as fh:
            fh.write(payload)
        os.replace(tmp_path, path)
    except Exception:
        # Clean up the temp file if the rename fails.
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


def _resolve_analytics_path(settings: Settings) -> Path:
    configured = Path(settings.analytics_stats_path)
    if configured.is_absolute():
        return configured

    backend_root = Path(__file__).resolve().parents[2]
    return (backend_root / configured).resolve()


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def _default_analytics_data() -> AnalyticsDocument:
    return {'visits_by_day': {}, 'resume_downloads_by_day': {}}
