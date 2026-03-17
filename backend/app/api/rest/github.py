from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.schemas.github import GitHubStats
from app.services.github_service import GitHubService

router = APIRouter(prefix="/api/v1/github", tags=["github"])
settings = get_settings()


@router.get('/stats', response_model=GitHubStats)
async def github_stats() -> GitHubStats:
    if not settings.github_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GITHUB_USERNAME is not configured",
        )

    service = GitHubService(username=settings.github_username, token=settings.github_token)
    return await service.fetch_stats()
