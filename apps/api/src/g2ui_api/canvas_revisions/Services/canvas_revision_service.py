import hashlib
import json
import uuid
from typing import Any

from fastapi import HTTPException, status

from ...models import Canvas
from ..Models.canvas_revision_dto import CanvasRevisionListItem, CanvasRevisionRead
from ..Repositories.canvas_revision_repository import CanvasRevisionRepository


def hash_canvas_content(content: dict[str, Any]) -> str:
    payload = json.dumps(content, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class CanvasRevisionService:
    def __init__(self, repository: CanvasRevisionRepository, max_revisions: int) -> None:
        self._repository = repository
        self._max_revisions = max_revisions

    async def record_if_changed(self, canvas: Canvas) -> None:
        content = canvas.content if isinstance(canvas.content, dict) else {}
        content_hash = hash_canvas_content(content)
        latest = await self._repository.latest_for_canvas(canvas.id)
        if latest is not None and latest.content_hash == content_hash:
            return
        await self._repository.add(
            canvas_id=canvas.id,
            owner_id=canvas.owner_id,
            content=content,
            content_hash=content_hash,
        )
        await self._prune(canvas.id)

    async def list_for_owner(
        self, canvas_id: uuid.UUID, owner_id: uuid.UUID
    ) -> list[CanvasRevisionListItem]:
        canvas = await self._require_canvas(canvas_id, owner_id)
        revisions = await self._repository.list_for_canvas(canvas_id)
        if not revisions:
            await self.record_if_changed(canvas)
            revisions = await self._repository.list_for_canvas(canvas_id)
        return [CanvasRevisionListItem.model_validate(item) for item in revisions]

    async def get_for_owner(
        self, canvas_id: uuid.UUID, revision_id: uuid.UUID, owner_id: uuid.UUID
    ) -> CanvasRevisionRead:
        await self._require_canvas(canvas_id, owner_id)
        revision = await self._repository.get_for_canvas(canvas_id, revision_id)
        if revision is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Revision not found"
            )
        return CanvasRevisionRead.model_validate(revision)

    async def _require_canvas(self, canvas_id: uuid.UUID, owner_id: uuid.UUID) -> Canvas:
        canvas = await self._repository.get_canvas_for_owner(canvas_id, owner_id)
        if canvas is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Canvas not found"
            )
        return canvas

    async def _prune(self, canvas_id: uuid.UUID) -> None:
        ids = await self._repository.ids_oldest_first(canvas_id)
        overflow = len(ids) - self._max_revisions
        if overflow <= 0:
            return
        await self._repository.delete_ids(ids[:overflow])
