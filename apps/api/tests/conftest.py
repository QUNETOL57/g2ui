import pytest
from fastapi.testclient import TestClient

from g2ui_api.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())
