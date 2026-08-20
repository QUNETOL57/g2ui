"""create canvas revisions

Revision ID: 20260820_0004
Revises: 20260624_0003
Create Date: 2026-08-20 10:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260820_0004"
down_revision: str | None = "20260624_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "canvas_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("canvas_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["canvas_id"], ["canvases.id"], ondelete="CASCADE"),
    )
    op.create_index(
        op.f("ix_canvas_revisions_canvas_id"),
        "canvas_revisions",
        ["canvas_id"],
        unique=False,
    )
    op.create_index(
        "ix_canvas_revisions_canvas_id_created_at",
        "canvas_revisions",
        ["canvas_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_canvas_revisions_canvas_id_created_at", table_name="canvas_revisions")
    op.drop_index(op.f("ix_canvas_revisions_canvas_id"), table_name="canvas_revisions")
    op.drop_table("canvas_revisions")
