from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.projects_repo import ProjectsRepository
from app.db.session import get_db_session
from app.schemas.project import ProjectRead

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


@router.get("", response_model=list[ProjectRead])
async def list_projects(session: AsyncSession = Depends(get_db_session)) -> list[ProjectRead]:
    projects = await ProjectsRepository(session).list_projects()
    return [
        ProjectRead(
            id=project.id,
            slug=project.slug,
            title=project.title,
            summary=project.summary,
            repo_url=project.repo_url,
            live_url=project.live_url,
            featured=project.featured,
            created_at=project.created_at,
        )
        for project in projects
    ]
