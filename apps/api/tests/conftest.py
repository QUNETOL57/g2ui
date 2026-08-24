import asyncio
import os
import uuid
from collections.abc import AsyncGenerator, Callable, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from g2ui_api.db import Base, get_db
from g2ui_api.main import create_app
from g2ui_api.models import Canvas, CanvasRevision, User

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")

engine = create_async_engine(TEST_DATABASE_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


@pytest.fixture(scope="session", autouse=True)
def prepare_database() -> Generator[None]:
    async def setup() -> None:
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)

    asyncio.run(setup())
    yield
    asyncio.run(engine.dispose())


@pytest.fixture(autouse=True)
def clean_tables() -> Generator[None]:
    async def clean() -> None:
        async with SessionLocal() as session:
            await session.execute(delete(CanvasRevision))
            await session.execute(delete(Canvas))
            await session.execute(delete(User))
            await session.commit()

    asyncio.run(clean())
    yield


@pytest.fixture
def client() -> Generator[TestClient]:
    app = create_app()

    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        async with SessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@example.com",
            "password": "password123",
            "password_confirm": "password123",
        },
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def delete_canvas_revisions() -> Callable[[str], None]:
    def _delete(canvas_id: str) -> None:
        async def run() -> None:
            async with SessionLocal() as session:
                await session.execute(
                    delete(CanvasRevision).where(CanvasRevision.canvas_id == uuid.UUID(canvas_id))
                )
                await session.commit()

        asyncio.run(run())

    return _delete


@pytest.fixture
def count_canvas_revisions() -> Callable[[str], int]:
    def _count(canvas_id: str) -> int:
        async def run() -> int:
            async with SessionLocal() as session:
                result = await session.scalar(
                    select(func.count())
                    .select_from(CanvasRevision)
                    .where(CanvasRevision.canvas_id == uuid.UUID(canvas_id))
                )
                return int(result or 0)

        return asyncio.run(run())

    return _count
