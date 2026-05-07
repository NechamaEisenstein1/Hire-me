import sys
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def pytest_configure(config):
    config.addinivalue_line(
        "markers", "anyio: mark test to run with anyio"
    )


@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    return request.param