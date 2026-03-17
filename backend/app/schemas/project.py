from datetime import datetime

from pydantic import BaseModel, HttpUrl


class ProjectRead(BaseModel):
    id: int
    slug: str
    title: str
    summary: str
    repo_url: HttpUrl
    live_url: HttpUrl | None
    featured: bool
    created_at: datetime


class ProjectCreate(BaseModel):
    slug: str
    title: str
    summary: str
    repo_url: HttpUrl
    live_url: HttpUrl | None = None
    featured: bool = False
