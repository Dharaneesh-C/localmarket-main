from fastapi.testclient import TestClient
import main
import routes.auth as auth
from auth_utils import hash_password


class FakeDocument:
    def __init__(self, document_id):
        self.document_id = document_id
        self.data = {}

    def set(self, data):
        self.data = data


class FakeUserDocument:
    def __init__(self, user_data):
        self.user_data = user_data

    def to_dict(self):
        return self.user_data


class FakeCollection:
    def __init__(self):
        self.saved = {}

    def where(self, field, operator, value):
        return self

    def get(self):
        return []

    def document(self, document_id):
        return FakeDocument(document_id)


class LoginCollection(FakeCollection):
    def __init__(self, user):
        super().__init__()
        self.user = user

    def get(self):
        return [FakeUserDocument(self.user)]


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()

    def collection(self, name):
        if name == "users":
            return self.users

        raise AssertionError(f"Unexpected collection: {name}")


def test_register_user_without_real_firebase(monkeypatch):
    fake_db = FakeDB()

    monkeypatch.setattr(main, "init_firestore", lambda: None)
    monkeypatch.setattr(auth, "get_db", lambda: fake_db)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "TestPassword123",
                "role": "buyer"
            }
        )

    assert response.status_code == 201

    data = response.json()

    assert data["token_type"] == "bearer"
    assert data["role"] == "buyer"
    assert data["name"] == "Test User"
    assert data["user_id"]
    assert data["access_token"]


def test_login_user_without_real_firebase(monkeypatch):
    user_password = "TestPassword123"

    stored_user = {
        "id": "test-user-123",
        "name": "Test User",
        "email": "login@example.com",
        "role": "buyer",
        "password": hash_password(user_password),
    }

    fake_db = FakeDB()
    fake_db.users = LoginCollection(stored_user)

    monkeypatch.setattr(main, "init_firestore", lambda: None)
    monkeypatch.setattr(auth, "get_db", lambda: fake_db)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/auth/login",
            json={
                "email": "login@example.com",
                "password": user_password
            }
        )

    assert response.status_code == 200

    data = response.json()

    assert data["token_type"] == "bearer"
    assert data["user_id"] == "test-user-123"
    assert data["role"] == "buyer"
    assert data["name"] == "Test User"
    assert data["access_token"]


def test_login_wrong_password_returns_401(monkeypatch):
    stored_user = {
        "id": "test-user-456",
        "name": "Test User",
        "email": "wrong-password@example.com",
        "role": "buyer",
        "password": hash_password("CorrectPassword123"),
    }

    fake_db = FakeDB()
    fake_db.users = LoginCollection(stored_user)

    monkeypatch.setattr(main, "init_firestore", lambda: None)
    monkeypatch.setattr(auth, "get_db", lambda: fake_db)

    with TestClient(main.app) as client:
        response = client.post(
            "/api/auth/login",
            json={
                "email": "wrong-password@example.com",
                "password": "WrongPassword123"
            }
        )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"