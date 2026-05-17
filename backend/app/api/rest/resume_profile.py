from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.services.resume_profile_service import get_resume_profile, save_resume_profile

router = APIRouter(prefix="/api/v1/resume-profile", tags=["resume-profile"])


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


class UpdateResumeProfileRequest(BaseModel):
    profile: ResumeProfile


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

    profile_dict: dict[str, Any] = payload.profile.model_dump()
    # Preserve fields the client-side parsers never populate (e.g. resumeFileName,
    # githubUsername) by falling back to the currently stored values.
    existing = get_resume_profile()
    for field in ("githubUsername", "resumeFileName"):
        if profile_dict.get(field) is None and existing.get(field) is not None:
            profile_dict[field] = existing[field]
    save_resume_profile(profile_dict)
    return ResumeProfile.model_validate(profile_dict)
