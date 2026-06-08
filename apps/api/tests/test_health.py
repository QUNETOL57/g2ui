def test_healthz(client) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_me_requires_auth(client) -> None:
    response = client.get("/api/v1/me")
    assert response.status_code == 401
