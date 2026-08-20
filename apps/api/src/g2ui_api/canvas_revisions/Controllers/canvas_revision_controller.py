import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from ...auth import CurrentUserDep
from ..dependencies import get_canvas_revision_service
from ..Models.canvas_revision_dto import CanvasRevisionListItem, CanvasRevisionRead
from ..Services.canvas_revision_service import CanvasRevisionService

router = APIRouter(prefix="/canvases/{canvas_id}/revisions", tags=["canvas-revisions"])

CanvasRevisionServiceDep = Annotated[
    CanvasRevisionService, Depends(get_canvas_revision_service)
]


@router.get("", response_model=list[CanvasRevisionListItem])
async def list_revisions(
    canvas_id: uuid.UUID,
    current_user: CurrentUserDep,
    service: CanvasRevisionServiceDep,
) -> list[CanvasRevisionListItem]:
    return await service.list_for_owner(canvas_id, current_user.id)


@router.get("/{revision_id}", response_model=CanvasRevisionRead)
async def get_revision(
    canvas_id: uuid.UUID,
    revision_id: uuid.UUID,
    current_user: CurrentUserDep,
    service: CanvasRevisionServiceDep,
) -> CanvasRevisionRead:
    return await service.get_for_owner(canvas_id, revision_id, current_user.id)
