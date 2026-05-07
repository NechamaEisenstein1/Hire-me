from types import SimpleNamespace
from unittest.mock import patch

import httpx
import pytest
from fastapi import FastAPI

from app.api.rest.resume_profile import router


@pytest.fixture
async def async_client() -> httpx.AsyncClient:
    app = FastAPI()
    app.include_router(router)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.mark.anyio
async def test_read_resume_profile_returns_public_data(async_client: httpx.AsyncClient) -> None:
    profile = {
        "name": "Nechama",
        "title": "Full Stack Engineer",
        "location": "Israel",
        "email": "n@example.com",
        "summary": "Summary",
        "skills": ["Angular"],
        "experience": [],
        "projects": [],
        "education": [],
    }

    with patch("app.api.rest.resume_profile.get_resume_profile", return_value=profile):
        response = await async_client.get("/api/v1/resume-profile")

    assert response.status_code == 200
    assert response.json()["name"] == "Nechama"


@pytest.mark.anyio
async def test_verify_owner_access_requires_valid_token(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.resume_profile.get_settings",
        return_value=SimpleNamespace(resume_owner_token="secret"),
    ):
        response = await async_client.post("/api/v1/resume-profile/verify", headers={"X-Resume-Owner-Token": "bad"})

    assert response.status_code == 401


@pytest.mark.anyio
async def test_verify_owner_access_returns_valid_true(async_client: httpx.AsyncClient) -> None:
    with patch(
        "app.api.rest.resume_profile.get_settings",
        return_value=SimpleNamespace(resume_owner_token="secret"),
    ):
        response = await async_client.post(
            "/api/v1/resume-profile/verify",
            headers={"X-Resume-Owner-Token": "secret"},
        )

    assert response.status_code == 200
    assert response.json() == {"valid": True}


@pytest.mark.anyio
async def test_update_resume_profile_persists_when_token_valid(async_client: httpx.AsyncClient) -> None:
    payload = {
        "profile": {
            "name": "Nechama",
            "title": "Engineer",
            "location": "Israel",
            "email": "n@example.com",
            "summary": "Summary",
            "skills": ["Angular"],
            "experience": [],
            "projects": [],
            "education": [],
        }
    }

    with patch(
        "app.api.rest.resume_profile.get_settings",
        return_value=SimpleNamespace(resume_owner_token="secret"),
    ), patch("app.api.rest.resume_profile.save_resume_profile") as save_mock:
        response = await async_client.put(
            "/api/v1/resume-profile",
            json=payload,
            headers={"X-Resume-Owner-Token": "secret"},
        )

    assert response.status_code == 200
    save_mock.assert_called_once()
    assert response.json()["name"] == "Nechama"
