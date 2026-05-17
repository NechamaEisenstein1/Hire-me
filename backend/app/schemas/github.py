from pydantic import BaseModel


class GitHubRepo(BaseModel):
    id: int
    name: str
    description: str | None
    html_url: str
    homepage: str | None
    language: str | None
    stargazers_count: int
    created_at: str
    updated_at: str
    fork: bool
    archived: bool


class GitHubStats(BaseModel):
    username: str
    public_repos: int
    followers: int
    following: int
    stars: int
    total_commits_last_year: int
