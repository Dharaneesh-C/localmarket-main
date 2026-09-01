from fastapi.testclient import TestClient

import main
import routes.orders as orders


class FakeDocument:
    def __init__(self, document_id, data=None):
        self.document_id = document_id
        self.data = data or {}
        self.exists = True
        self.updated_data = {}

    def set(self, data):
        self.data = data

    def get(self):
        return self

    def to_dict(self):
        return self.data

    def update(self, data):
        self.updated_data.update(data)
        self.data.update(data)


class FakeCollection:
    def __init__(self):
        self.documents = {}

    def document(self, document_id):
        if document_id not in self.documents:
            self.documents[document_id] = FakeDocument(document_id)

        return self.documents[document_id]

    def where(self, field, operator, value):
        return self

    def get(self):
        return list(self.documents.values())


class FakeDB:
    def __init__(self):
        self.orders = FakeCollection()
        self.products = FakeCollection()
        self.users = FakeCollection()

    def collection(self, name):
        if name == "orders":
            return self.orders

        if name == "products":
            return self.products

        if name == "users":
            return self.users

        raise AssertionError(f"Unexpected collection: {name}")


def get_test_buyer():
    return {
        "id": "buyer-123",
        "name": "Test Buyer",
        "phone": "9876543210",
        "role": "buyer",
    }


def get_test_merchant():
    return {
        "id": "merchant-123",
        "name": "Test Merchant",
        "phone": "9876543210",
        "role": "merchant",
    }


def disable_firestore_init(monkeypatch):
    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )


# ============================================================
# TEST 1: Place order reduces stock
# ============================================================

def test_place_order_reduces_stock(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    product = fake_db.products.document("product-123")

    product.data = {
        "id": "product-123",
        "title": "Fresh Tomatoes",
        "stock": 10,
        "is_active": True,
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        orders,
        "get_db",
        lambda: fake_db
    )

    async def fake_notification(recipient_id, notification):
        pass

    monkeypatch.setattr(
        orders,
        "store_and_send_notification",
        fake_notification
    )

    main.app.dependency_overrides[
        orders.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/orders/",
                json={
                    "product_id": "product-123",
                    "product_title": "Fresh Tomatoes",
                    "quantity": 2,
                    "unit": "kg",
                    "total_price": 100,
                    "merchant_id": "merchant-123",
                    "merchant_name": "Test Merchant",
                    "merchant_upi_id": "merchant@upi",
                }
            )

        assert response.status_code == 201

        data = response.json()

        assert data["product_id"] == "product-123"
        assert data["product_title"] == "Fresh Tomatoes"
        assert data["quantity"] == 2
        assert data["total_price"] == 100
        assert data["buyer_id"] == "buyer-123"
        assert data["buyer_name"] == "Test Buyer"
        assert data["merchant_id"] == "merchant-123"
        assert data["status"] == "pending"
        assert data["id"]

        assert product.data["stock"] == 8
        assert product.data["is_active"] is True

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 2: Stock reaches zero -> product disabled
# ============================================================

def test_place_order_stock_reaches_zero_disables_product(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    product = fake_db.products.document("product-456")

    product.data = {
        "id": "product-456",
        "title": "Fresh Apples",
        "stock": 2,
        "is_active": True,
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        orders,
        "get_db",
        lambda: fake_db
    )

    async def fake_notification(recipient_id, notification):
        pass

    monkeypatch.setattr(
        orders,
        "store_and_send_notification",
        fake_notification
    )

    main.app.dependency_overrides[
        orders.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/orders/",
                json={
                    "product_id": "product-456",
                    "product_title": "Fresh Apples",
                    "quantity": 2,
                    "unit": "kg",
                    "total_price": 120,
                    "merchant_id": "merchant-456",
                    "merchant_name": "Apple Seller",
                    "merchant_upi_id": "seller@upi",
                }
            )

        assert response.status_code == 201

        assert product.data["stock"] == 0
        assert product.data["is_active"] is False

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 3: Low stock notification
# ============================================================

def test_place_order_triggers_low_stock_notification(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    product = fake_db.products.document("product-789")

    product.data = {
        "id": "product-789",
        "title": "Fresh Bananas",
        "stock": 10,
        "is_active": True,
    }

    notifications = []

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        orders,
        "get_db",
        lambda: fake_db
    )

    async def fake_notification(recipient_id, notification):
        notifications.append({
            "recipient_id": recipient_id,
            "notification": notification,
        })

    monkeypatch.setattr(
        orders,
        "store_and_send_notification",
        fake_notification
    )

    main.app.dependency_overrides[
        orders.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/orders/",
                json={
                    "product_id": "product-789",
                    "product_title": "Fresh Bananas",
                    "quantity": 5,
                    "unit": "kg",
                    "total_price": 150,
                    "merchant_id": "merchant-789",
                    "merchant_name": "Banana Seller",
                    "merchant_upi_id": "banana@upi",
                }
            )

        assert response.status_code == 201

        assert product.data["stock"] == 5
        assert product.data["is_active"] is True

        # One normal order notification
        # + one low-stock notification
        assert len(notifications) == 2

        low_stock_notifications = [
            item
            for item in notifications
            if item["notification"].get("type") == "low_stock"
        ]

        assert len(low_stock_notifications) == 1

        low_stock = low_stock_notifications[0]

        assert low_stock["recipient_id"] == "merchant-789"

        assert (
            low_stock["notification"]["type"]
            == "low_stock"
        )

        assert (
            low_stock["notification"]["product_id"]
            == "product-789"
        )

        assert (
            low_stock["notification"]["title"]
            == "⚠️ Low stock alert"
        )

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 4: Merchant accepts order
# ============================================================

def test_merchant_accepts_order(monkeypatch):
    fake_db = FakeDB()
    merchant = get_test_merchant()

    order = fake_db.orders.document("order-123")

    order.data = {
        "id": "order-123",
        "product_id": "product-123",
        "product_title": "Fresh Tomatoes",
        "quantity": 2,
        "unit": "kg",
        "total_price": 100,
        "merchant_id": "merchant-123",
        "merchant_name": "Test Merchant",
        "buyer_id": "buyer-123",
        "buyer_name": "Test Buyer",
        "status": "pending",
    }

    notifications = []

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        orders,
        "get_db",
        lambda: fake_db
    )

    async def fake_notification(recipient_id, notification):
        notifications.append({
            "recipient_id": recipient_id,
            "notification": notification,
        })

    monkeypatch.setattr(
        orders,
        "store_and_send_notification",
        fake_notification
    )

    main.app.dependency_overrides[
        orders.require_merchant
    ] = lambda: merchant

    try:
        with TestClient(main.app) as client:
            response = client.put(
                "/api/orders/order-123/status",
                json={
                    "status": "accepted"
                }
            )

        # API request succeeded
        assert response.status_code == 200

        # API returns a message, not a status field
        data = response.json()

        assert (
            data["message"]
            == "Order status updated to OrderStatus.accepted"
        )

        # Firestore order status was updated
        assert order.data["status"] == "accepted"

        # Buyer should receive one notification
        assert len(notifications) == 1

        notification = notifications[0]

        assert notification["recipient_id"] == "buyer-123"

    finally:
        main.app.dependency_overrides.clear()