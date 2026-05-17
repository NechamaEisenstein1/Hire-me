import time
from typing import Any

import httpx

from app.schemas.github import GitHubRepo, GitHubStats


class GitHubService:
    # Class-level cache shared across all instances: username -> (timestamp, raw repos list)
    _repos_cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}

    def __init__(self, username: str, token: str, verify_tls: bool = True) -> None:
        self.username = username
        self.token = token
        self.verify_tls = verify_tls

    def _auth_headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "hire-me-portfolio",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def fetch_stats(self) -> GitHubStats:
        headers = self._auth_headers()

        async with httpx.AsyncClient(timeout=10.0, verify=self.verify_tls) as client:
            user_resp = await client.get(f"https://api.github.com/users/{self.username}", headers=headers)
            user_resp.raise_for_status()
            user_data = user_resp.json()

            repos_resp = await client.get(
                f"https://api.github.com/users/{self.username}/repos?per_page=100", headers=headers
            )
            repos_resp.raise_for_status()
            repos_data = repos_resp.json()

        total_stars = sum(int(repo.get("stargazers_count", 0)) for repo in repos_data)

        return GitHubStats(
            username=self.username,
            public_repos=int(user_data.get("public_repos", 0)),
            followers=int(user_data.get("followers", 0)),
            following=int(user_data.get("following", 0)),
            stars=total_stars,
            total_commits_last_year=0,
        )

    async def fetch_repos(self, cache_seconds: int = 300) -> list[GitHubRepo]:
        cached = GitHubService._repos_cache.get(self.username)
        if cached and (time.monotonic() - cached[0]) < cache_seconds:
            repos_data = cached[1]
        else:
            async with httpx.AsyncClient(timeout=10.0, verify=self.verify_tls) as client:
                resp = await client.get(
                    f"https://api.github.com/users/{self.username}/repos?per_page=100&sort=updated&type=owner",
                    headers=self._auth_headers(),
                )
                resp.raise_for_status()
                repos_data = resp.json()
            GitHubService._repos_cache[self.username] = (time.monotonic(), repos_data)

        all_repos = [
            GitHubRepo(
                id=r["id"],
                name=r["name"],
                description=r.get("description"),
                html_url=r["html_url"],
                homepage=r.get("homepage") or None,
                language=r.get("language"),
                stargazers_count=r.get("stargazers_count", 0),
                updated_at=r.get("updated_at", ""),
                fork=r.get("fork", False),
                archived=r.get("archived", False),
            )
            for r in repos_data
        ]

        non_fork = [r for r in all_repos if not r.fork and not r.archived]
        non_fork.sort(key=lambda r: r.updated_at, reverse=True)
        non_fork.sort(key=lambda r: r.stargazers_count, reverse=True)
        return non_fork[:12] if non_fork else [r for r in all_repos if not r.archived][:12]
