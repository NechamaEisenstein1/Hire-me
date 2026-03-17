from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.project import Project


class ProjectsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list_projects(self) -> list[Project]:
        result = await self.session.execute(select(Project).order_by(Project.created_at.desc()))
        return list(result.scalars().all())
