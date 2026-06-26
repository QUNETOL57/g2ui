import asyncio

from g2ui_api.models import Canvas
from g2ui_api.routers.auth import SINGLE_USER_ID
from tests.conftest import SessionLocal

REGISTER_PAYLOAD = {
    "email": "new@example.com",
    "password": "password123",
    "password_confirm": "password123",
}


def test_register_returns_token(client) -> None:
    response = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 201
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)
    assert len(body["access_token"]) > 0


def test_register_duplicate_email(client) -> None:
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert response.status_code == 409


def test_register_password_mismatch(client) -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "mismatch@example.com",
            "password": "password123",
            "password_confirm": "different123",
        },
    )
    assert response.status_code == 422


def test_login_success(client) -> None:
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": REGISTER_PAYLOAD["password"]},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_invalid_credentials(client) -> None:
    client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    response = client.post(
        "/api/v1/auth/login",
        json={"email": REGISTER_PAYLOAD["email"], "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_me_returns_current_user(client, auth_headers) -> None:
    response = client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "user@example.com"
    assert "id" in body
    assert "created_at" in body


def test_me_requires_auth(client) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_change_password_success(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers,
        json={
            "current_password": "password123",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123",
        },
    )
    assert response.status_code == 204

    login_old = client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert login_old.status_code == 401

    login_new = client.post(
        "/api/v1/auth/login",
        json={"email": "user@example.com", "password": "newpassword123"},
    )
    assert login_new.status_code == 200


def test_change_password_wrong_current(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers,
        json={
            "current_password": "wrong-password",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Current password is incorrect"


def test_change_password_requires_auth(client) -> None:
    response = client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "password123",
            "new_password": "newpassword123",
            "new_password_confirm": "newpassword123",
        },
    )
    assert response.status_code == 401


def test_change_password_mismatch(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers,
        json={
            "current_password": "password123",
            "new_password": "newpassword123",
            "new_password_confirm": "different123",
        },
    )
    assert response.status_code == 422


def test_change_password_too_short(client, auth_headers) -> None:
    response = client.post(
        "/api/v1/auth/change-password",
        headers=auth_headers,
        json={
            "current_password": "password123",
            "new_password": "short",
            "new_password_confirm": "short",
        },
    )
    assert response.status_code == 422


def test_canvases_requires_auth(client) -> None:
    response = client.get("/api/v1/canvases")
    assert response.status_code == 401


def test_canvases_crud_with_auth(client, auth_headers) -> None:
    create_response = client.post(
        "/api/v1/canvases",
        headers=auth_headers,
        json={
            "title": "Test canvas",
            "content": {"screens": []},
            "settings": {},
            "schema_version": 1,
        },
    )
    assert create_response.status_code == 201
    canvas_id = create_response.json()["id"]

    list_response = client.get("/api/v1/canvases", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = client.get(f"/api/v1/canvases/{canvas_id}", headers=auth_headers)
    assert get_response.status_code == 200

    delete_response = client.delete(f"/api/v1/canvases/{canvas_id}", headers=auth_headers)
    assert delete_response.status_code == 204


def test_first_user_reassigns_legacy_canvases(client) -> None:
    async def seed_legacy_canvas() -> None:
        async with SessionLocal() as session:
            session.add(
                Canvas(
                    owner_id=SINGLE_USER_ID,
                    title="Legacy canvas",
                    content={"screens": []},
                    settings={},
                    schema_version=1,
                )
            )
            await session.commit()

    asyncio.run(seed_legacy_canvas())

    register_response = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    assert register_response.status_code == 201
    token = register_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    list_response = client.get("/api/v1/canvases", headers=headers)
    assert list_response.status_code == 200
    canvases = list_response.json()
    assert len(canvases) == 1
    assert canvases[0]["title"] == "Legacy canvas"

    me_response = client.get("/api/v1/auth/me", headers=headers)
    user_id = me_response.json()["id"]
    assert canvases[0]["owner_id"] == user_id


def test_other_users_do_not_see_foreign_canvases(client) -> None:
    first = client.post("/api/v1/auth/register", json=REGISTER_PAYLOAD)
    first_headers = {"Authorization": f"Bearer {first.json()['access_token']}"}
    create_response = client.post(
        "/api/v1/canvases",
        headers=first_headers,
        json={
            "title": "Private canvas",
            "content": {"screens": []},
            "settings": {},
            "schema_version": 1,
        },
    )
    assert create_response.status_code == 201

    second = client.post(
        "/api/v1/auth/register",
        json={
            "email": "other@example.com",
            "password": "password123",
            "password_confirm": "password123",
        },
    )
    assert second.status_code == 201
    second_headers = {"Authorization": f"Bearer {second.json()['access_token']}"}

    list_response = client.get("/api/v1/canvases", headers=second_headers)
    assert list_response.status_code == 200
    assert list_response.json() == []
