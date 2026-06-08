from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import canvases, health
from .settings import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="G2UI API",
        version="0.1.0",
        description="Backend API for G2UI.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)

    api_v1 = "/api/v1"
    app.include_router(canvases.router, prefix=api_v1)

    return app


app = create_app()
