import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CanvasRevisionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    content_hash: str


class CanvasRevisionRead(CanvasRevisionListItem):
    content: dict[str, Any]
