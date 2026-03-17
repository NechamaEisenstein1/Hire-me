import strawberry
from strawberry.fastapi import GraphQLRouter

from app.core.config import get_settings
from app.schemas.github import GitHubStats
from app.services.github_service import GitHubService


@strawberry.type
class HealthType:
    status: str


@strawberry.type
class ProjectType:
    id: int
    slug: str
    title: str
    summary: str
    repo_url: str
    live_url: str | None
    featured: bool


@strawberry.type
class GitHubStatsType:
    username: str
    public_repos: int
    followers: int
    following: int
    stars: int
    total_commits_last_year: int


@strawberry.type
class Query:
    @strawberry.field
    def health(self) -> HealthType:
        return HealthType(status="ok")

    @strawberry.field
    async def github_stats(self) -> GitHubStatsType:
        settings = get_settings()
        service = GitHubService(username=settings.github_username, token=settings.github_token)
        stats: GitHubStats = await service.fetch_stats()
        return GitHubStatsType(
            username=stats.username,
            public_repos=stats.public_repos,
            followers=stats.followers,
            following=stats.following,
            stars=stats.stars,
            total_commits_last_year=stats.total_commits_last_year,
        )


schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)
