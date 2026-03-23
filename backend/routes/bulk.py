from fastapi import APIRouter, Depends, HTTPException
from firebase_db import get_db
from auth_utils import require_merchant
from datetime import datetime
import uuid
import json

router = APIRouter()


@router.post("/bulk-upload")
async def bulk_upload(products: list, current_user=Depends(require_merchant)):
    """
    Accept a list of product objects and create them all at once.
    Each item: { title, description, price, unit, category, stock, delivery_time_minutes,
                 available_from, available_until, delivery_area, merchant_location }
    """
    db = get_db()
    created = []
    errors = []

    for i, item in enumerate(products):
        try:
            # Validate required
            if not item.get("title") or not item.get("price") or not item.get("category"):
                errors.append({"row": i + 1, "error": "Missing title, price or category"})
                continue

            product_id = str(uuid.uuid4())
            product_doc = {
                "id": product_id,
                "title": item["title"],
                "description": item.get("description", ""),
                "price": float(item["price"]),
                "unit": item.get("unit", "piece"),
                "category": item["category"],
                "image_url": item.get("image_url"),
                "merchant_id": current_user["id"],
                "merchant_name": current_user["name"],
                "merchant_phone": current_user.get("phone"),
                "merchant_upi_id": current_user.get("upi_id"),
                "is_active": True,
                "stock": int(item["stock"]) if item.get("stock") else None,
                "delivery_time_minutes": int(item["delivery_time_minutes"]) if item.get("delivery_time_minutes") else None,
                "available_from": item.get("available_from"),
                "available_until": item.get("available_until"),
                "rating_avg": 0.0,
                "rating_count": 0,
                "created_at": datetime.utcnow().isoformat(),
                # Store delivery_area and merchant_location as JSON strings for Firestore
                "delivery_area": json.dumps(item["delivery_area"]) if item.get("delivery_area") else None,
                "merchant_location": json.dumps(item["merchant_location"]) if item.get("merchant_location") else None,
            }
            db.collection("products").document(product_id).set(product_doc)
            created.append(product_id)
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    return {
        "created": len(created),
        "errors": errors,
        "message": f"✅ {len(created)} products created, {len(errors)} errors",
    }
