from typing import Any

from g2ui_api.canvas_revisions.Services.canvas_revision_service import hash_canvas_content
from g2ui_api.settings import settings

CANVAS_PAYLOAD: dict[str, Any] = {
    "title": "Test canvas",
    "content": {"screens": [{"id": "screen_main"}]},
    "settings": {},
    "schema_version": 1,
}


def _create_canvas(client, auth_headers, content: dict[str, Any] | None = None) -> str:
    payload = {**CANVAS_PAYLOAD, "content": content or CANVAS_PAYLOAD["content"]}
    response = client.post("/api/v1/canvases", headers=auth_headers, json=payload)
    assert response.status_code == 201
    return response.json()["id"]


def test_revisions_require_auth(client) -> None:
    response = client.get("/api/v1/canvases/11111111-1111-4111-8111-111111111111/revisions")
    assert response.status_code == 401


def test_revisions_404_for_missing_or_foreign_canvas(client, auth_headers) -> None:
    missing = client.get(
        "/api/v1/canvases/11111111-1111-4111-8111-111111111111/revisions",
        headers=auth_headers,
    )
    assert missing.status_code == 404

    canvas_id = _create_canvas(client, auth_headers)
    second = client.post(
        "/api/v1/auth/register",
        json={
            "email": "other@example.com",
            "password": "password123",
            "password_confirm": "password123",
        },
    )
    assert second.status_code == 201
    other_headers = {"Authorization": f"Bearer {second.json()['access_token']}"}
    foreign = client.get(f"/api/v1/canvases/{canvas_id}/revisions", headers=other_headers)
    assert foreign.status_code == 404


def test_create_records_revision_and_skips_unchanged_content(client, auth_headers) -> None:
    canvas_id = _create_canvas(client, auth_headers)
    listed = client.get(f"/api/v1/canvases/{canvas_id}/revisions", headers=auth_headers)
    assert listed.status_code == 200
    items = listed.json()
    assert len(items) == 1
    assert "content" not in items[0]
    assert items[0]["content_hash"]

    same = client.patch(
        f"/api/v1/canvases/{canvas_id}",
        headers=auth_headers,
        json={"content": CANVAS_PAYLOAD["content"]},
    )
    assert same.status_code == 200
    listed_again = client.get(f"/api/v1/canvases/{canvas_id}/revisions", headers=auth_headers)
    assert len(listed_again.json()) == 1

    changed = client.patch(
        f"/api/v1/canvases/{canvas_id}",
        headers=auth_headers,
        json={"content": {"screens": [{"id": "screen_other"}]}},
    )
    assert changed.status_code == 200
    items_after = client.get(
        f"/api/v1/canvases/{canvas_id}/revisions", headers=auth_headers
    ).json()
    assert len(items_after) == 2

    detail = client.get(
        f"/api/v1/canvases/{canvas_id}/revisions/{items_after[0]['id']}",
        headers=auth_headers,
    )
    assert detail.status_code == 200
    assert detail.json()["content"] == {"screens": [{"id": "screen_other"}]}


def test_revision_cap_prunes_oldest(client, auth_headers, monkeypatch) -> None:
    monkeypatch.setattr(settings, "max_revisions_per_canvas", 2)
    canvas_id = _create_canvas(client, auth_headers, {"n": 1})
    client.patch(
        f"/api/v1/canvases/{canvas_id}",
        headers=auth_headers,
        json={"content": {"n": 2}},
    )
    client.patch(
        f"/api/v1/canvases/{canvas_id}",
        headers=auth_headers,
        json={"content": {"n": 3}},
    )
    items = client.get(f"/api/v1/canvases/{canvas_id}/revisions", headers=auth_headers).json()
    assert len(items) == 2
    hashes = {item["content_hash"] for item in items}
    assert hash_canvas_content({"n": 1}) not in hashes
    assert hash_canvas_content({"n": 2}) in hashes
    assert hash_canvas_content({"n": 3}) in hashes
