import httpx
from fastapi import APIRouter, HTTPException, status

from app.core.config import get_settings
from app.schemas.github import GitHubStats
from app.services.github_service import GitHubService

router = APIRouter(prefix="/api/v1/github", tags=["github"])


@router.get('/stats', response_model=GitHubStats)
async def github_stats() -> GitHubStats:
    settings = get_settings()
    if not settings.github_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GITHUB_USERNAME is not configured",
        )

    try:
        service = GitHubService(username=settings.github_username, token=settings.github_token)
        return await service.fetch_stats()
    except httpx.HTTPStatusError as e:
        # Handle GitHub API rate limiting or auth failures
        if e.response.status_code == 403:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GitHub API rate limit exceeded or unauthorized",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API returned: {e.response.status_code}",
        )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach GitHub API",
        )
