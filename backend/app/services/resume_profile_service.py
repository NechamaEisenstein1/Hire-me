from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.core.config import Settings, get_settings


def get_resume_profile(*, settings: Settings | None = None) -> dict[str, Any]:
    resolved_settings = settings or get_settings()
    profile_path = _resolve_profile_path(resolved_settings)

    if not profile_path.exists():
        profile_path.parent.mkdir(parents=True, exist_ok=True)
        profile_path.write_text(_default_profile_json(), encoding="utf-8")

    try:
        return json.loads(profile_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return json.loads(_default_profile_json())


def save_resume_profile(profile: dict[str, Any], *, settings: Settings | None = None) -> None:
    resolved_settings = settings or get_settings()
    profile_path = _resolve_profile_path(resolved_settings)
    profile_path.parent.mkdir(parents=True, exist_ok=True)
    profile_path.write_text(json.dumps(profile, ensure_ascii=False, indent=2), encoding="utf-8")


def build_resume_profile_context(profile: dict[str, Any]) -> str:
    skills = _as_list(profile.get("skills"))
    projects = _as_list(profile.get("projects"))
    education = _as_list(profile.get("education"))

    project_summaries: list[str] = []
    for item in projects[:4]:
        if isinstance(item, dict):
            name = str(item.get("name", "Project")).strip()
            summary = str(item.get("summary", "")).strip()
            project_summaries.append(f"- {name}: {summary}")

    education_summaries: list[str] = []
    for item in education[:3]:
        if isinstance(item, dict):
            degree = str(item.get("degree", "Degree")).strip()
            school = str(item.get("school", "School")).strip()
            education_summaries.append(f"- {degree}, {school}")

    return (
        "Candidate profile context (source of truth):\n"
        f"Name: {profile.get('name', 'Unknown')}\n"
        f"Title: {profile.get('title', 'Unknown')}\n"
        f"Summary: {profile.get('summary', '')}\n"
        f"Skills: {', '.join(str(skill) for skill in skills[:20])}\n"
        "Projects:\n"
        f"{chr(10).join(project_summaries) if project_summaries else '- None provided'}\n"
        "Education:\n"
        f"{chr(10).join(education_summaries) if education_summaries else '- None provided'}"
    )


def _resolve_profile_path(settings: Settings) -> Path:
    configured = Path(settings.resume_profile_path)
    if configured.is_absolute():
        return configured

    backend_root = Path(__file__).resolve().parents[2]
    return (backend_root / configured).resolve()


def _as_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _default_profile_json() -> str:
    return json.dumps(
        {
            "name": "Your Name",
            "title": "Full Stack Engineer",
            "location": "Location",
            "email": "email@example.com",
            "summary": "Short professional summary.",
            "skills": ["Angular", "TypeScript", "Python"],
            "experience": [],
            "projects": [],
            "education": [],
        },
        ensure_ascii=False,
        indent=2,
    )
