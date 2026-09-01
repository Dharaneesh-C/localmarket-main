from fastapi.testclient import TestClient
import main


def test_root_endpoint(monkeypatch):
    monkeypatch.setattr(main, "init_firestore", lambda: None)

    with TestClient(main.app) as client:
        response = client.get("/")

    assert response.status_code == 200
    assert "NearSell API is running" in response.json()["message"]