import asyncio

from sqlalchemy import insert

from app.db.models.project import Project
from app.db.session import SessionLocal


def seed() -> None:
    asyncio.run(_seed())


async def _seed() -> None:
    demo_projects = [
        {
            "slug": "realtime-analytics-engine",
            "title": "Realtime Analytics Engine",
            "summary": "Low-latency event pipeline with streaming dashboards.",
            "repo_url": "https://github.com/yourname/realtime-analytics-engine",
            "live_url": "https://example.com/analytics",
            "featured": True,
        },
        {
            "slug": "vision-ai-assistant",
            "title": "Vision AI Assistant",
            "summary": "Multimodal assistant with retrieval and workflow automation.",
            "repo_url": "https://github.com/yourname/vision-ai-assistant",
            "live_url": "https://example.com/vision-ai",
            "featured": True,
        },
    ]

    async with SessionLocal() as session:
        for project in demo_projects:
            await session.execute(insert(Project).values(**project))
        await session.commit()


if __name__ == "__main__":
    seed()
