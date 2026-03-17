import httpx

from app.schemas.github import GitHubStats


class GitHubService:
    def __init__(self, username: str, token: str) -> None:
        self.username = username
        self.token = token

    async def fetch_stats(self) -> GitHubStats:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "hire-me-portfolio"
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        async with httpx.AsyncClient(timeout=10.0) as client:
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
