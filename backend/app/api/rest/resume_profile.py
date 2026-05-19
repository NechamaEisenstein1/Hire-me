from __future__ import annotations

import mimetypes
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Header, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from starlette.responses import Response

from app.core.config import get_settings
from app.services.resume_profile_service import get_resume_profile, save_resume_profile

router = APIRouter(prefix="/api/v1/resume-profile", tags=["resume-profile"])
logger = logging.getLogger(__name__)


def _get_resumes_dir() -> Path:
    # parents[2] == backend/app/, so this resolves to backend/app/data/resumes
    resumes_dir = Path(__file__).resolve().parents[2] / "data" / "resumes"
    resumes_dir.mkdir(parents=True, exist_ok=True)
    return resumes_dir


class ResumeExperience(BaseModel):
    role: str = Field(default="")
    company: str = Field(default="")
    period: str = Field(default="")
    highlights: list[str] = Field(default_factory=list)


class ResumeProject(BaseModel):
    name: str = Field(default="")
    summary: str = Field(default="")
    stack: list[str] = Field(default_factory=list)


class ResumeEducation(BaseModel):
    degree: str = Field(default="")
    school: str = Field(default="")
    period: str = Field(default="")


class ResumeProfile(BaseModel):
    """Tolerant response/storage model — all fields default so historical data always deserializes."""

    name: str = Field(default="")
    title: str = Field(default="")
    location: str = Field(default="")
    email: str = Field(default="")
    githubUsername: str | None = Field(default=None)
    resumeFileName: str | None = Field(default=None)
    summary: str = Field(default="")
    skills: list[str] = Field(default_factory=list)
    experience: list[ResumeExperience] = Field(default_factory=list)
    projects: list[ResumeProject] = Field(default_factory=list)
    education: list[ResumeEducation] = Field(default_factory=list)


class ResumeProfileInput(ResumeProfile):
    """Strict write model — skills and experience are required on every publish."""

    skills: list[str] = Field(
        ...,
        description=(
            "Required. Include explicitly listed technical skills and implied technical skills "
            "evidenced in project/experience text (frameworks, cloud, API, testing, tooling)."
        ),
    )
    experience: list[ResumeExperience] = Field(
        ...,
        description=(
            "Required. Include professional experience entries and preserve narrative paragraph "
            "content as highlights when structured bullets are unavailable."
        ),
    )


class UpdateResumeProfileRequest(BaseModel):
    profile: ResumeProfileInput


class VerifyOwnerResponse(BaseModel):
    valid: bool


@router.get("", response_model=ResumeProfile)
async def read_resume_profile() -> ResumeProfile:
    raw = get_resume_profile()
    return ResumeProfile.model_validate(raw)


@router.post("/verify", response_model=VerifyOwnerResponse)
async def verify_owner_access(
    x_resume_owner_token: str | None = Header(default=None, alias="X-Resume-Owner-Token"),
) -> VerifyOwnerResponse:
    settings = get_settings()
    if not settings.resume_owner_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume owner token is not configured.",
        )

    if x_resume_owner_token != settings.resume_owner_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid owner token.")

    return VerifyOwnerResponse(valid=True)


@router.put("", response_model=ResumeProfile)
async def update_resume_profile(
    payload: UpdateResumeProfileRequest,
    x_resume_owner_token: str | None = Header(default=None, alias="X-Resume-Owner-Token"),
) -> ResumeProfile:
    settings = get_settings()
    if not settings.resume_owner_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume owner token is not configured.",
        )

    if x_resume_owner_token != settings.resume_owner_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid owner token.")

    profile = payload.profile
    logger.info(
        "resume_profile_publish",
        extra={
            "skill_count": len(profile.skills),
            "experience_count": len(profile.experience),
            "has_resume_file": bool(profile.resumeFileName),
        },
    )

    profile_dict: dict[str, Any] = profile.model_dump()
    # Preserve fields the client-side parsers never populate (e.g. resumeFileName,
    # githubUsername) by falling back to the currently stored values.
    existing = get_resume_profile()
    for field in ("githubUsername", "resumeFileName"):
        if profile_dict.get(field) is None and existing.get(field) is not None:
            profile_dict[field] = existing[field]
    save_resume_profile(profile_dict)
    return ResumeProfile.model_validate(profile_dict)


@router.post("/file")
async def upload_resume_file(
    file: UploadFile = File(...),
    x_resume_owner_token: str | None = Header(default=None, alias="X-Resume-Owner-Token"),
) -> dict[str, str]:
    settings = get_settings()
    if not settings.resume_owner_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Resume owner token is not configured.",
        )

    if x_resume_owner_token != settings.resume_owner_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid owner token.")

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")

    logger.info(
        "resume_profile_file_upload",
        extra={
            "filename": file.filename,
            "content_type": file.content_type,
        },
    )

    resumes_dir = _get_resumes_dir()

    # Save the file
    file_path = resumes_dir / file.filename
    try:
        content = await file.read()
        file_path.write_bytes(content)
        return {"filename": file.filename, "message": "File uploaded successfully."}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save file: {str(e)}")


@router.get("/file/{file_name}")
async def download_resume_file(file_name: str) -> Response:
    if not file_name or file_name in {".", ".."} or "/" in file_name or "\\" in file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    resumes_dir = _get_resumes_dir()
    file_path = resumes_dir / file_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume file not found.")

    content = file_path.read_bytes()
    media_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"
    logger.info(
        "resume_profile_file_download",
        extra={
            "filename": file_name,
            "media_type": media_type,
            "bytes": len(content),
        },
    )
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
