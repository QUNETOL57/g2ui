import uuid
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ...models import Canvas
from ..Models.canvas_revision import CanvasRevision


class CanvasRevisionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_canvas_for_owner(
        self, canvas_id: uuid.UUID, owner_id: uuid.UUID
    ) -> Canvas | None:
        canvas = await self._session.get(Canvas, canvas_id)
        if canvas is None or canvas.owner_id != owner_id:
            return None
        return canvas

    async def latest_for_canvas(self, canvas_id: uuid.UUID) -> CanvasRevision | None:
        result = await self._session.execute(
            select(CanvasRevision)
            .where(CanvasRevision.canvas_id == canvas_id)
            .order_by(CanvasRevision.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_for_canvas(self, canvas_id: uuid.UUID) -> list[CanvasRevision]:
        result = await self._session.execute(
            select(CanvasRevision)
            .where(CanvasRevision.canvas_id == canvas_id)
            .order_by(CanvasRevision.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_for_canvas(
        self, canvas_id: uuid.UUID, revision_id: uuid.UUID
    ) -> CanvasRevision | None:
        revision = await self._session.get(CanvasRevision, revision_id)
        if revision is None or revision.canvas_id != canvas_id:
            return None
        return revision

    async def add(
        self,
        *,
        canvas_id: uuid.UUID,
        owner_id: uuid.UUID,
        content: dict[str, Any],
        content_hash: str,
    ) -> CanvasRevision:
        revision = CanvasRevision(
            canvas_id=canvas_id,
            owner_id=owner_id,
            content=content,
            content_hash=content_hash,
        )
        self._session.add(revision)
        await self._session.flush()
        return revision

    async def ids_oldest_first(self, canvas_id: uuid.UUID) -> list[uuid.UUID]:
        result = await self._session.execute(
            select(CanvasRevision.id)
            .where(CanvasRevision.canvas_id == canvas_id)
            .order_by(CanvasRevision.created_at.asc())
        )
        return list(result.scalars().all())

    async def delete_ids(self, revision_ids: list[uuid.UUID]) -> None:
        if not revision_ids:
            return
        await self._session.execute(
            delete(CanvasRevision).where(CanvasRevision.id.in_(revision_ids))
        )
