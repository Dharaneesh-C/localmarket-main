from fastapi.testclient import TestClient

import main
import routes.reviews as reviews


class FakeDocument:
    def __init__(self, document_id, data=None, exists=True):
        self.document_id = document_id
        self.data = data or {}
        self.exists = exists
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
        results = []

        for document in self.documents.values():
            if document.data.get(field) == value:
                results.append(document)

        return FakeQuery(results)

    def get(self):
        return list(self.documents.values())


class FakeQuery:
    def __init__(self, results):
        self.results = results

    def get(self):
        return self.results


class FakeDB:
    def __init__(self):
        self.orders = FakeCollection()
        self.reviews = FakeCollection()
        self.products = FakeCollection()

    def collection(self, name):
        if name == "orders":
            return self.orders

        if name == "reviews":
            return self.reviews

        if name == "products":
            return self.products

        raise AssertionError(
            f"Unexpected collection: {name}"
        )


def get_test_buyer():
    return {
        "id": "buyer-123",
        "name": "Test Buyer",
        "phone": "9876543210",
        "role": "buyer",
    }


def disable_firestore_init(monkeypatch):
    monkeypatch.setattr(
        main,
        "init_firestore",
        lambda: None
    )


# ============================================================
# TEST 1: Buyer can submit a review for completed order
# ============================================================

def test_submit_review_for_completed_order(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    order = fake_db.orders.document("order-123")

    order.data = {
        "id": "order-123",
        "product_id": "product-123",
        "merchant_id": "merchant-123",
        "buyer_id": "buyer-123",
        "status": "completed",
    }

    product = fake_db.products.document("product-123")

    product.data = {
        "id": "product-123",
        "title": "Fresh Tomatoes",
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        reviews.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/reviews/",
                json={
                    "order_id": "order-123",
                    "product_id": "product-123",
                    "merchant_id": "merchant-123",
                    "rating": 5,
                    "comment": "Very fresh tomatoes!"
                }
            )

        assert response.status_code == 201

        data = response.json()

        assert data["order_id"] == "order-123"
        assert data["product_id"] == "product-123"
        assert data["merchant_id"] == "merchant-123"
        assert data["buyer_id"] == "buyer-123"
        assert data["buyer_name"] == "Test Buyer"
        assert data["rating"] == 5
        assert data["comment"] == "Very fresh tomatoes!"
        assert data["id"]
        assert data["created_at"]

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 2: Cannot review an incomplete order
# ============================================================

def test_submit_review_requires_completed_order(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    order = fake_db.orders.document("order-456")

    order.data = {
        "id": "order-456",
        "product_id": "product-456",
        "merchant_id": "merchant-456",
        "buyer_id": "buyer-123",
        "status": "pending",
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        reviews.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/reviews/",
                json={
                    "order_id": "order-456",
                    "product_id": "product-456",
                    "merchant_id": "merchant-456",
                    "rating": 4,
                    "comment": "Good"
                }
            )

        assert response.status_code == 400

        assert response.json()["detail"] == (
            "Can only review completed orders"
        )

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 3: Buyer cannot review another buyer's order
# ============================================================

def test_submit_review_rejects_other_buyers_order(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    order = fake_db.orders.document("order-789")

    order.data = {
        "id": "order-789",
        "product_id": "product-789",
        "merchant_id": "merchant-789",
        "buyer_id": "another-buyer",
        "status": "completed",
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        reviews.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/reviews/",
                json={
                    "order_id": "order-789",
                    "product_id": "product-789",
                    "merchant_id": "merchant-789",
                    "rating": 5,
                    "comment": "Excellent"
                }
            )

        assert response.status_code == 403

        assert response.json()["detail"] == "Not your order"

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 4: Cannot submit duplicate review
# ============================================================

def test_submit_duplicate_review_is_rejected(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    order = fake_db.orders.document("order-duplicate")

    order.data = {
        "id": "order-duplicate",
        "product_id": "product-duplicate",
        "merchant_id": "merchant-duplicate",
        "buyer_id": "buyer-123",
        "status": "completed",
    }

    existing_review = fake_db.reviews.document(
        "review-existing"
    )

    existing_review.data = {
        "id": "review-existing",
        "order_id": "order-duplicate",
        "product_id": "product-duplicate",
        "merchant_id": "merchant-duplicate",
        "buyer_id": "buyer-123",
        "rating": 5,
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        reviews.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/reviews/",
                json={
                    "order_id": "order-duplicate",
                    "product_id": "product-duplicate",
                    "merchant_id": "merchant-duplicate",
                    "rating": 4,
                    "comment": "Trying twice"
                }
            )

        assert response.status_code == 400

        assert response.json()["detail"] == (
            "You already reviewed this order"
        )

    finally:
        main.app.dependency_overrides.clear()


# ============================================================
# TEST 5: Product reviews can be retrieved
# ============================================================

def test_get_product_reviews(monkeypatch):
    fake_db = FakeDB()

    review_1 = fake_db.reviews.document("review-1")

    review_1.data = {
        "id": "review-1",
        "product_id": "product-123",
        "merchant_id": "merchant-123",
        "buyer_id": "buyer-123",
        "buyer_name": "Test Buyer",
        "rating": 5,
        "comment": "Excellent product",
        "created_at": "2026-08-17T10:00:00",
    }

    review_2 = fake_db.reviews.document("review-2")

    review_2.data = {
        "id": "review-2",
        "product_id": "product-123",
        "merchant_id": "merchant-123",
        "buyer_id": "buyer-456",
        "buyer_name": "Another Buyer",
        "rating": 4,
        "comment": "Good product",
        "created_at": "2026-08-18T10:00:00",
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    with TestClient(main.app) as client:
        response = client.get(
            "/api/reviews/product/product-123"
        )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2

    # Newest review should appear first
    assert data[0]["id"] == "review-2"
    assert data[1]["id"] == "review-1"

    assert data[0]["rating"] == 4
    assert data[1]["rating"] == 5


# ============================================================
# TEST 6: Merchant reviews can be retrieved
# ============================================================

def test_get_merchant_reviews(monkeypatch):
    fake_db = FakeDB()

    review_1 = fake_db.reviews.document("review-merchant-1")

    review_1.data = {
        "id": "review-merchant-1",
        "product_id": "product-1",
        "merchant_id": "merchant-123",
        "buyer_id": "buyer-123",
        "buyer_name": "Test Buyer",
        "rating": 5,
        "comment": "Great seller",
        "created_at": "2026-08-17T10:00:00",
    }

    review_2 = fake_db.reviews.document("review-merchant-2")

    review_2.data = {
        "id": "review-merchant-2",
        "product_id": "product-2",
        "merchant_id": "merchant-123",
        "buyer_id": "buyer-456",
        "buyer_name": "Another Buyer",
        "rating": 4,
        "comment": "Good seller",
        "created_at": "2026-08-18T10:00:00",
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    with TestClient(main.app) as client:
        response = client.get(
            "/api/reviews/merchant/merchant-123"
        )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 2

    # Newest review should appear first
    assert data[0]["id"] == "review-merchant-2"
    assert data[1]["id"] == "review-merchant-1"

    assert data[0]["merchant_id"] == "merchant-123"
    assert data[1]["merchant_id"] == "merchant-123"


# ============================================================
# TEST 7: Invalid rating is rejected
# ============================================================

def test_submit_review_invalid_rating(monkeypatch):
    fake_db = FakeDB()
    buyer = get_test_buyer()

    order = fake_db.orders.document("order-rating")

    order.data = {
        "id": "order-rating",
        "product_id": "product-rating",
        "merchant_id": "merchant-rating",
        "buyer_id": "buyer-123",
        "status": "completed",
    }

    disable_firestore_init(monkeypatch)

    monkeypatch.setattr(
        reviews,
        "get_db",
        lambda: fake_db
    )

    main.app.dependency_overrides[
        reviews.require_buyer
    ] = lambda: buyer

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/reviews/",
                json={
                    "order_id": "order-rating",
                    "product_id": "product-rating",
                    "merchant_id": "merchant-rating",
                    "rating": 6,
                    "comment": "Invalid rating"
                }
            )

        assert response.status_code == 400

        assert response.json()["detail"] == (
            "Rating must be between 1 and 5"
        )

    finally:
        main.app.dependency_overrides.clear()