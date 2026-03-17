from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/health", tags=["health"])


@router.get("", summary="Liveness probe")
async def health() -> dict[str, str]:
    return {"status": "ok"}
