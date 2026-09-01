from fastapi.testclient import TestClient
import main
import routes.products as products


class FakeDocument:
    def __init__(self, document_id):
        self.document_id = document_id
        self.data = {}

    def set(self, data):
        self.data = data


class FakeCollection:
    def __init__(self):
        self.saved = {}

    def document(self, document_id):
        return FakeDocument(document_id)

    def where(self, field, operator, value):
        return self

    def get(self):
        return []


class FakeDB:
    def __init__(self):
        self.products = FakeCollection()
        self.users = FakeCollection()

    def collection(self, name):
        if name == "products":
            return self.products

        if name == "users":
            return self.users

        raise AssertionError(f"Unexpected collection: {name}")


def get_test_merchant():
    return {
        "id": "merchant-123",
        "name": "Test Merchant",
        "phone": "9876543210",
        "upi_id": "merchant@upi",
        "role": "merchant",
    }


def test_create_product_supports_multiple_images(monkeypatch):
    fake_db = FakeDB()
    merchant = get_test_merchant()

    monkeypatch.setattr(main, "init_firestore", lambda: None)
    monkeypatch.setattr(products, "get_db", lambda: fake_db)

    main.app.dependency_overrides[products.require_merchant] = lambda: merchant

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/products/",
                json={
                    "title": "Fresh Tomatoes",
                    "description": "Fresh local tomatoes",
                    "price": 50,
                    "unit": "kg",
                    "category": "Vegetables & Fruits",
                    "images": [
                        "https://example.com/1.jpg",
                        "https://example.com/2.jpg",
                        "https://example.com/3.jpg",
                    ],
                    "merchant_location": {
                        "type": "Point",
                        "coordinates": [76.9558, 11.0168],
                    },
                    "stock": 10,
                    "delivery_radius_km": 5,
                },
            )

        assert response.status_code == 201

        data = response.json()

        assert data["title"] == "Fresh Tomatoes"
        assert data["images"] == [
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg",
        ]
        assert data["image_url"] == "https://example.com/1.jpg"
        assert data["merchant_id"] == "merchant-123"
        assert data["is_active"] is True

    finally:
        main.app.dependency_overrides.clear()


def test_create_product_limits_images_to_five(monkeypatch):
    fake_db = FakeDB()
    merchant = get_test_merchant()

    monkeypatch.setattr(main, "init_firestore", lambda: None)
    monkeypatch.setattr(products, "get_db", lambda: fake_db)

    main.app.dependency_overrides[products.require_merchant] = lambda: merchant

    try:
        with TestClient(main.app) as client:
            response = client.post(
                "/api/products/",
                json={
                    "title": "Fresh Apples",
                    "description": "Fresh local apples",
                    "price": 120,
                    "unit": "kg",
                    "category": "Vegetables & Fruits",
                    "images": [
                        "https://example.com/1.jpg",
                        "https://example.com/2.jpg",
                        "https://example.com/3.jpg",
                        "https://example.com/4.jpg",
                        "https://example.com/5.jpg",
                        "https://example.com/6.jpg",
                        "https://example.com/7.jpg",
                    ],
                    "merchant_location": {
                        "type": "Point",
                        "coordinates": [76.9558, 11.0168],
                    },
                    "stock": 20,
                    "delivery_radius_km": 5,
                },
            )

        assert response.status_code == 201

        data = response.json()

        assert len(data["images"]) == 5
        assert data["images"] == [
            "https://example.com/1.jpg",
            "https://example.com/2.jpg",
            "https://example.com/3.jpg",
            "https://example.com/4.jpg",
            "https://example.com/5.jpg",
        ]
        assert data["image_url"] == "https://example.com/1.jpg"

    finally:
        main.app.dependency_overrides.clear()


def test_delete_product_uses_soft_delete(monkeypatch):
    fake_db = FakeDB()
    merchant = get_test_merchant()

    class ExistingProductDocument:
        exists = True

        def __init__(self):
            self.updated_data = None

        def get(self):
            return self

        def to_dict(self):
            return {
                "id": "product-123",
                "merchant_id": "merchant-123",
                "title": "Old Product",
                "is_active": True,
            }

        def update(self, data):
            self.updated_data = data

    product_document = ExistingProductDocument()

    class ProductCollection(FakeCollection):
        def document(self, document_id):
            assert document_id == "product-123"
            return product_document

    fake_db.products = ProductCollection()

    monkeypatch.setattr(main, "init_firestore", lambda: None)
    monkeypatch.setattr(products, "get_db", lambda: fake_db)

    main.app.dependency_overrides[products.require_merchant] = lambda: merchant

    try:
        with TestClient(main.app) as client:
            response = client.delete("/api/products/product-123")

        assert response.status_code == 200
        assert response.json()["message"] == "Product removed from listings"

        assert product_document.updated_data == {
            "is_active": False,
            "deleted": True,
        }

    finally:
        main.app.dependency_overrides.clear()