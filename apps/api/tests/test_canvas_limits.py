from g2ui_api.settings import settings

CANVAS_PAYLOAD = {
    "title": "Test canvas",
    "content": {"screens": []},
    "settings": {},
    "schema_version": 1,
}


def test_create_canvas_limit(client, auth_headers, monkeypatch) -> None:
    monkeypatch.setattr(settings, "max_canvases_per_user", 2)

    for index in range(2):
        response = client.post(
            "/api/v1/canvases",
            headers=auth_headers,
            json={**CANVAS_PAYLOAD, "title": f"Canvas {index + 1}"},
        )
        assert response.status_code == 201

    blocked = client.post(
        "/api/v1/canvases",
        headers=auth_headers,
        json={**CANVAS_PAYLOAD, "title": "Canvas 3"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"] == "Project limit reached (2 max)"

    list_response = client.get("/api/v1/canvases", headers=auth_headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 2


def test_delete_canvas_allows_creating_again(client, auth_headers, monkeypatch) -> None:
    monkeypatch.setattr(settings, "max_canvases_per_user", 1)

    create_response = client.post(
        "/api/v1/canvases",
        headers=auth_headers,
        json=CANVAS_PAYLOAD,
    )
    assert create_response.status_code == 201
    canvas_id = create_response.json()["id"]

    blocked = client.post("/api/v1/canvases", headers=auth_headers, json=CANVAS_PAYLOAD)
    assert blocked.status_code == 409

    delete_response = client.delete(f"/api/v1/canvases/{canvas_id}", headers=auth_headers)
    assert delete_response.status_code == 204

    create_again = client.post("/api/v1/canvases", headers=auth_headers, json=CANVAS_PAYLOAD)
    assert create_again.status_code == 201
