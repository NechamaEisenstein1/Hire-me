from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.rest.analytics import router


def create_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_visit_endpoint_records_visit() -> None:
    client = create_client()

    with patch('app.api.rest.analytics.record_visit') as record_visit_mock:
        response = client.post('/api/v1/analytics/visit')

    assert response.status_code == 204
    record_visit_mock.assert_called_once()


def test_resume_download_endpoint_records_download() -> None:
    client = create_client()

    with patch('app.api.rest.analytics.record_resume_download') as record_download_mock:
        response = client.post('/api/v1/analytics/resume-download')

    assert response.status_code == 204
    record_download_mock.assert_called_once()


def test_admin_today_requires_valid_owner_token() -> None:
    client = create_client()

    with patch(
        'app.api.rest.analytics.get_settings',
        return_value=SimpleNamespace(resume_owner_token='secret'),
    ):
        response = client.get('/api/v1/analytics/admin/today', headers={'X-Resume-Owner-Token': 'bad'})

    assert response.status_code == 401


def test_admin_today_returns_stats_with_valid_token() -> None:
    client = create_client()

    with patch(
        'app.api.rest.analytics.get_settings',
        return_value=SimpleNamespace(resume_owner_token='secret'),
    ), patch(
        'app.api.rest.analytics.get_today_stats',
        return_value={'visitors_today': 7, 'resume_downloads_today': 3},
    ):
        response = client.get('/api/v1/analytics/admin/today', headers={'X-Resume-Owner-Token': 'secret'})

    assert response.status_code == 200
    assert response.json() == {'visitors_today': 7, 'resume_downloads_today': 3}
