import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..models import Canvas
from ..schemas import CanvasCreate, CanvasRead, CanvasUpdate

router = APIRouter(prefix="/canvases", tags=["canvases"])
SINGLE_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DbDep = Annotated[AsyncSession, Depends(get_db)]


@router.get("", response_model=list[CanvasRead])
async def list_canvases(
    db: DbDep,
) -> list[Canvas]:
    result = await db.execute(
        select(Canvas)
        .where(Canvas.owner_id == SINGLE_USER_ID)
        .order_by(Canvas.updated_at.desc())
    )
    return list(result.scalars().all())


@router.post("", response_model=CanvasRead, status_code=status.HTTP_201_CREATED)
async def create_canvas(
    body: CanvasCreate,
    db: DbDep,
) -> Canvas:
    canvas = Canvas(
        owner_id=SINGLE_USER_ID,
        title=body.title,
        content=body.content,
        settings=body.settings,
        schema_version=body.schema_version,
    )
    db.add(canvas)
    await db.flush()
    await db.refresh(canvas)
    return canvas


@router.get("/{canvas_id}", response_model=CanvasRead)
async def get_canvas(
    canvas_id: uuid.UUID,
    db: DbDep,
) -> Canvas:
    canvas = await db.get(Canvas, canvas_id)
    if not canvas or canvas.owner_id != SINGLE_USER_ID:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canvas not found")
    return canvas


@router.patch("/{canvas_id}", response_model=CanvasRead)
async def update_canvas(
    canvas_id: uuid.UUID,
    body: CanvasUpdate,
    db: DbDep,
) -> Canvas:
    canvas = await db.get(Canvas, canvas_id)
    if not canvas or canvas.owner_id != SINGLE_USER_ID:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canvas not found")

    if body.title is not None:
        canvas.title = body.title
    if body.content is not None:
        canvas.content = body.content
    if body.settings is not None:
        canvas.settings = body.settings
    if body.schema_version is not None:
        canvas.schema_version = body.schema_version
    await db.flush()
    await db.refresh(canvas)
    return canvas


@router.delete("/{canvas_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_canvas(
    canvas_id: uuid.UUID,
    db: DbDep,
) -> None:
    canvas = await db.get(Canvas, canvas_id)
    if not canvas or canvas.owner_id != SINGLE_USER_ID:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Canvas not found")
    await db.delete(canvas)
