from fastapi.testclient import TestClient

import main
import routes.notifications as notifications


class FakeDocument:
    def __init__(self, document_id, data=None):
        self.id = document_id
        self.document_id = document_id
        self.data = data or {}
        self.exists = True
        self.updated_data = {}

    @property
    def reference(self):
        return self

    def set(self, data):
        self.data = data

    def get(self):
        return self

    def to_dict(self):
        return self.data

    def update(self, data):
        self.updated_data.update(data)
        self.data.update(data)

    def delete(self):
        self.exists = False


class FakeCollection:
    def __init__(self):
        self.documents = {}

    def document(self, document_id):
        if document_id not in self.documents:
            self.documents[document_id] = FakeDocument(
                document_id,
                {}
            )

        return self.documents[document_id]

    def add(self, data):
        document_id = f"notification-{len(self.documents) + 1}"

        document = FakeDocument(
            document_id,
            data.copy()
        )

        self.documents[document_id] = document

        return document

    def where(self, field, operator, value):
        filtered = FakeCollection()

        for document_id, document in self.documents.items():
            if not document.exists:
                continue

            document_value = document.data.get(field)

            matched = False

            if operator == "==":
                matched = document_value == value

            elif operator == ">":
                matched = (
                    document_value is not None
                    and document_value > value
                )

            if matched:
                filtered.documents[document_id] = document

        return filtered

    def limit(self, count):
        limited = FakeCollection()

        for document_id, document in list(
            self.documents.items()
        )[:count]:
            limited.documents[document_id] = document

        return limited

    def get(self):
        return list(self.documents.values())


class FakeDB:
    def __init__(self):
        self.notifications = FakeCollection()

    def collection(self, name):
        if name == "notifications":
            return self.notifications

        raise AssertionError(
            f"Unexpected collection: {name}"
        )


def get_test_user():
    return {
        "id": "user-123",
        "name": "Test User",
        "email": "test@example.com",
        "role": "buyer",
    }


def create_notification(
    fake_db,
    notification_id,
    user_id,
    message,
    timestamp,
    read=False,
):
    document = FakeDocument(
        notification_id,
        {
            "user_id": user_id,
            "message": message,
            "timestamp": timestamp,
            "read": read,
        },
    )

    fake_db.notifications.documents[notification_id] = document

    return document


def test_store_notification(monkeypatch):
    fake_db = FakeDB()

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    message = {
        "type": "order",
        "title": "New Order",
        "body": "You received a new order",
    }

    notifications.store_notification(
        "user-123",
        message
    )

    assert len(fake_db.notifications.documents) == 1

    document = list(
        fake_db.notifications.documents.values()
    )[0]

    assert document.data["user_id"] == "user-123"
    assert document.data["message"] == message
    assert document.data["read"] is False
    assert document.data["timestamp"]


def test_get_notifications_returns_user_notifications(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    create_notification(
        fake_db,
        "notification-1",
        "user-123",
        {
            "type": "order",
            "title": "Order Accepted",
        },
        1000,
    )

    create_notification(
        fake_db,
        "notification-2",
        "user-123",
        {
            "type": "message",
            "title": "New Message",
        },
        2000,
    )

    create_notification(
        fake_db,
        "notification-3",
        "other-user",
        {
            "type": "order",
            "title": "Other User",
        },
        3000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.get(
                "/api/notifications"
            )

        assert response.status_code == 200

        data = response.json()

        assert len(data) == 2

        # Newest first
        assert data[0]["id"] == "notification-2"
        assert data[1]["id"] == "notification-1"

    finally:
        main.app.dependency_overrides.clear()


def test_poll_notifications_returns_notifications_since_timestamp(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    create_notification(
        fake_db,
        "notification-1",
        "user-123",
        {
            "type": "order",
            "title": "Old Notification",
        },
        1000,
    )

    create_notification(
        fake_db,
        "notification-2",
        "user-123",
        {
            "type": "order",
            "title": "New Notification",
        },
        2000,
    )

    create_notification(
        fake_db,
        "notification-3",
        "other-user",
        {
            "type": "order",
            "title": "Other User",
        },
        3000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    notifications._last_poll.clear()

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.get(
                "/api/notifications/poll?since=1500"
            )

        assert response.status_code == 200

        data = response.json()

        assert len(data) == 1
        assert data[0]["id"] == "notification-2"
        assert data[0]["message"]["title"] == "New Notification"

    finally:
        main.app.dependency_overrides.clear()
        notifications._last_poll.clear()


def test_poll_notifications_rate_limit(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    create_notification(
        fake_db,
        "notification-1",
        "user-123",
        {
            "type": "order",
            "title": "New Order",
        },
        1000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    notifications._last_poll.clear()

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:

            first_response = client.get(
                "/api/notifications/poll?since=0"
            )

            second_response = client.get(
                "/api/notifications/poll?since=0"
            )

        assert first_response.status_code == 200
        assert second_response.status_code == 200

        assert len(first_response.json()) == 1

        # Second request happens within 4 seconds.
        assert second_response.json() == []

    finally:
        main.app.dependency_overrides.clear()
        notifications._last_poll.clear()


def test_mark_notification_as_read(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    notification = create_notification(
        fake_db,
        "notification-1",
        "user-123",
        {
            "type": "order",
            "title": "Order Accepted",
        },
        1000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.put(
                "/api/notifications/read/notification-1"
            )

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is True
        assert notification.data["read"] is True

    finally:
        main.app.dependency_overrides.clear()


def test_mark_notification_read_rejects_other_user(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    create_notification(
        fake_db,
        "notification-1",
        "other-user",
        {
            "type": "order",
            "title": "Private Notification",
        },
        1000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.put(
                "/api/notifications/read/notification-1"
            )

        assert response.status_code == 403

    finally:
        main.app.dependency_overrides.clear()


def test_mark_all_notifications_as_read(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    notification_1 = create_notification(
        fake_db,
        "notification-1",
        "user-123",
        {
            "type": "order",
            "title": "Order 1",
        },
        1000,
    )

    notification_2 = create_notification(
        fake_db,
        "notification-2",
        "user-123",
        {
            "type": "order",
            "title": "Order 2",
        },
        2000,
    )

    notification_3 = create_notification(
        fake_db,
        "notification-3",
        "other-user",
        {
            "type": "order",
            "title": "Other User",
        },
        3000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.put(
                "/api/notifications/read-all"
            )

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is True

        assert notification_1.data["read"] is True
        assert notification_2.data["read"] is True

        # Other user's notification must remain unread.
        assert notification_3.data["read"] is False

    finally:
        main.app.dependency_overrides.clear()


def test_delete_notification(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    notification = create_notification(
        fake_db,
        "notification-1",
        "user-123",
        {
            "type": "order",
            "title": "Delete Me",
        },
        1000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.delete(
                "/api/notifications/notification-1"
            )

        assert response.status_code == 200

        data = response.json()

        assert data["success"] is True
        assert notification.exists is False

    finally:
        main.app.dependency_overrides.clear()


def test_delete_notification_rejects_other_user(
    monkeypatch,
):
    fake_db = FakeDB()
    user = get_test_user()

    create_notification(
        fake_db,
        "notification-1",
        "other-user",
        {
            "type": "order",
            "title": "Private Notification",
        },
        1000,
    )

    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )

    monkeypatch.setattr(
        notifications,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        notifications.get_current_user
    ] = lambda: user

    try:
        with TestClient(main.app) as client:
            response = client.delete(
                "/api/notifications/notification-1"
            )

        assert response.status_code == 403

    finally:
        main.app.dependency_overrides.clear()