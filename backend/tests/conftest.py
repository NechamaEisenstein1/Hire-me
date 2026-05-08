import sys
from pathlib import Path
from collections.abc import AsyncGenerator

import httpx
import pytest
from fastapi import APIRouter, FastAPI


BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    return request.param


@pytest.fixture
async def async_client(test_router: APIRouter) -> AsyncGenerator[httpx.AsyncClient, None]:
    app = FastAPI()
    app.include_router(test_router)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
