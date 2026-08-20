from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..settings import settings
from .Repositories.canvas_revision_repository import CanvasRevisionRepository
from .Services.canvas_revision_service import CanvasRevisionService

DbDep = Annotated[AsyncSession, Depends(get_db)]


def get_canvas_revision_service(db: DbDep) -> CanvasRevisionService:
    return CanvasRevisionService(
        CanvasRevisionRepository(db),
        max_revisions=settings.max_revisions_per_canvas,
    )
