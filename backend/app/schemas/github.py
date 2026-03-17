from pydantic import BaseModel


class GitHubStats(BaseModel):
    username: str
    public_repos: int
    followers: int
    following: int
    stars: int
    total_commits_last_year: int
