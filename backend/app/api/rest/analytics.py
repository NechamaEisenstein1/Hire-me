from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel

from app.core.config import get_settings
from app.services.site_analytics_service import (
    get_today_stats,
    record_resume_download,
    record_visit,
)

router = APIRouter(prefix='/api/v1/analytics', tags=['analytics'])


class TodayStatsResponse(BaseModel):
    visitors_today: int
    resume_downloads_today: int


@router.post('/visit', status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def register_visit() -> None:
    record_visit()


@router.post('/resume-download', status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def register_resume_download() -> None:
    record_resume_download()


@router.get('/admin/today', response_model=TodayStatsResponse)
async def get_admin_today_stats(
    x_resume_owner_token: str | None = Header(
        default=None, alias='X-Resume-Owner-Token'),
) -> TodayStatsResponse:
    settings = get_settings()
    if not settings.resume_owner_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail='Resume owner token is not configured.',
        )

    if x_resume_owner_token != settings.resume_owner_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid owner token.')

    stats = get_today_stats()
    return TodayStatsResponse(**stats)
