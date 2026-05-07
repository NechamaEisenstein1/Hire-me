from types import SimpleNamespace
from unittest.mock import patch

import httpx
import pytest
from fastapi import FastAPI

from app.api.rest.analytics import router


@pytest.fixture
async def async_client() -> httpx.AsyncClient:
    app = FastAPI()
    app.include_router(router)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.anyio
async def test_visit_endpoint_records_visit(async_client: httpx.AsyncClient) -> None:
    with patch('app.api.rest.analytics.record_visit') as record_visit_mock:
        response = await async_client.post('/api/v1/analytics/visit')

    assert response.status_code == 204
    record_visit_mock.assert_called_once()


@pytest.mark.anyio
async def test_resume_download_endpoint_records_download(async_client: httpx.AsyncClient) -> None:
    with patch('app.api.rest.analytics.record_resume_download') as record_download_mock:
        response = await async_client.post('/api/v1/analytics/resume-download')

    assert response.status_code == 204
    record_download_mock.assert_called_once()


@pytest.mark.anyio
async def test_admin_today_requires_valid_owner_token(async_client: httpx.AsyncClient) -> None:
    with patch(
        'app.api.rest.analytics.get_settings',
        return_value=SimpleNamespace(resume_owner_token='secret'),
    ):
        response = await async_client.get('/api/v1/analytics/admin/today', headers={'X-Resume-Owner-Token': 'bad'})

    assert response.status_code == 401


@pytest.mark.anyio
async def test_admin_today_returns_stats_with_valid_token(async_client: httpx.AsyncClient) -> None:
    with patch(
        'app.api.rest.analytics.get_settings',
        return_value=SimpleNamespace(resume_owner_token='secret'),
    ), patch(
        'app.api.rest.analytics.get_today_stats',
        return_value={'visitors_today': 7, 'resume_downloads_today': 3},
    ):
        response = await async_client.get('/api/v1/analytics/admin/today', headers={'X-Resume-Owner-Token': 'secret'})

    assert response.status_code == 200
    assert response.json() == {'visitors_today': 7, 'resume_downloads_today': 3}
