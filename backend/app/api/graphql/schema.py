import strawberry
from strawberry.fastapi import GraphQLRouter

from app.core.config import get_settings
from app.schemas.github import GitHubStats
from app.services.github_service import GitHubService
from app.services.resume_profile_service import get_resume_profile


@strawberry.type
class HealthType:
    status: str


@strawberry.type
class GitHubStatsType:
    username: str
    public_repos: int
    followers: int
    following: int
    stars: int
    total_commits_last_year: int


@strawberry.type
class ResumeExperienceType:
    role: str
    company: str
    period: str
    highlights: list[str]


@strawberry.type
class ResumeProjectType:
    name: str
    summary: str
    stack: list[str]


@strawberry.type
class ResumeEducationType:
    degree: str
    school: str
    period: str


@strawberry.type
class ResumeProfileType:
    name: str
    title: str
    location: str
    email: str
    github_username: str | None
    resume_file_name: str | None
    summary: str
    skills: list[str]
    experience: list[ResumeExperienceType]
    projects: list[ResumeProjectType]
    education: list[ResumeEducationType]


@strawberry.type
class Query:
    @strawberry.field
    def health(self) -> HealthType:
        return HealthType(status="ok")

    @strawberry.field
    def resume_profile(self) -> ResumeProfileType:
        profile = get_resume_profile()

        experience = [
            ResumeExperienceType(
                role=str(item.get("role", "")),
                company=str(item.get("company", "")),
                period=str(item.get("period", "")),
                highlights=[str(highlight) for highlight in item.get("highlights", []) if isinstance(highlight, str)],
            )
            for item in profile.get("experience", [])
            if isinstance(item, dict)
        ]

        projects = [
            ResumeProjectType(
                name=str(item.get("name", "")),
                summary=str(item.get("summary", "")),
                stack=[str(skill) for skill in item.get("stack", []) if isinstance(skill, str)],
            )
            for item in profile.get("projects", [])
            if isinstance(item, dict)
        ]

        education = [
            ResumeEducationType(
                degree=str(item.get("degree", "")),
                school=str(item.get("school", "")),
                period=str(item.get("period", "")),
            )
            for item in profile.get("education", [])
            if isinstance(item, dict)
        ]

        return ResumeProfileType(
            name=str(profile.get("name", "")),
            title=str(profile.get("title", "")),
            location=str(profile.get("location", "")),
            email=str(profile.get("email", "")),
            github_username=(
                str(profile.get("githubUsername"))
                if isinstance(profile.get("githubUsername"), str)
                else None
            ),
            resume_file_name=(
                str(profile.get("resumeFileName"))
                if isinstance(profile.get("resumeFileName"), str)
                else None
            ),
            summary=str(profile.get("summary", "")),
            skills=[str(skill) for skill in profile.get("skills", []) if isinstance(skill, str)],
            experience=experience,
            projects=projects,
            education=education,
        )

    @strawberry.field
    async def github_stats(self) -> GitHubStatsType:
        import httpx

        settings = get_settings()
        if not settings.github_username:
            raise Exception(
                "GitHub stats query requires GITHUB_USERNAME to be configured. "
                "Set it via environment variable."
            )

        try:
            service = GitHubService(
                username=settings.github_username,
                token=settings.github_token,
                verify_tls=settings.ai_verify_tls,
            )
            stats: GitHubStats = await service.fetch_stats()
            return GitHubStatsType(
                username=stats.username,
                public_repos=stats.public_repos,
                followers=stats.followers,
                following=stats.following,
                stars=stats.stars,
                total_commits_last_year=stats.total_commits_last_year,
            )
        except httpx.HTTPError as e:
            raise Exception(
                f"Failed to fetch GitHub stats: {str(e)}. "
                "This may indicate a network issue or rate limit."
            )


schema = strawberry.Schema(query=Query)
graphql_router = GraphQLRouter(schema)
