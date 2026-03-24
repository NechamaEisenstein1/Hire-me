from types import SimpleNamespace
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.rest.resume_profile import router


def create_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_read_resume_profile_returns_public_data() -> None:
    client = create_client()
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
        response = client.get("/api/v1/resume-profile")

    assert response.status_code == 200
    assert response.json()["name"] == "Nechama"


def test_verify_owner_access_requires_valid_token() -> None:
    client = create_client()

    with patch(
        "app.api.rest.resume_profile.get_settings",
        return_value=SimpleNamespace(resume_owner_token="secret"),
    ):
        response = client.post("/api/v1/resume-profile/verify", headers={"X-Resume-Owner-Token": "bad"})

    assert response.status_code == 401


def test_verify_owner_access_returns_valid_true() -> None:
    client = create_client()

    with patch(
        "app.api.rest.resume_profile.get_settings",
        return_value=SimpleNamespace(resume_owner_token="secret"),
    ):
        response = client.post(
            "/api/v1/resume-profile/verify",
            headers={"X-Resume-Owner-Token": "secret"},
        )

    assert response.status_code == 200
    assert response.json() == {"valid": True}


def test_update_resume_profile_persists_when_token_valid() -> None:
    client = create_client()
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
        response = client.put(
            "/api/v1/resume-profile",
            json=payload,
            headers={"X-Resume-Owner-Token": "secret"},
        )

    assert response.status_code == 200
    save_mock.assert_called_once()
    assert response.json()["name"] == "Nechama"
