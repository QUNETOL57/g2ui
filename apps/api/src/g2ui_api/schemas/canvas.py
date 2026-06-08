import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CanvasBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    schema_version: int = Field(default=1, ge=1)


class CanvasCreate(CanvasBase):
    pass


class CanvasUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: dict[str, Any] | None = None
    settings: dict[str, Any] | None = None
    schema_version: int | None = Field(default=None, ge=1)


class CanvasRead(CanvasBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
