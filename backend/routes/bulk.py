from fastapi import APIRouter, Depends
from firebase_db import get_db
from auth_utils import require_merchant
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import json

router = APIRouter()


class BulkProductItem(BaseModel):
    title: str
    description: Optional[str] = ""
    price: float
    unit: Optional[str] = "piece"
    category: str
    stock: Optional[int] = None
    delivery_time_minutes: Optional[int] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None
    delivery_area: Optional[dict] = None
    merchant_location: Optional[dict] = None


class BulkUploadRequest(BaseModel):
    products: List[BulkProductItem]


@router.post("/bulk-upload")
async def bulk_upload(data: BulkUploadRequest, current_user=Depends(require_merchant)):
    db = get_db()
    created = []
    errors = []

    for i, item in enumerate(data.products):
        try:
            product_id = str(uuid.uuid4())
            product_doc = {
                "id": product_id,
                "title": item.title,
                "description": item.description or "",
                "price": float(item.price),
                "unit": item.unit or "piece",
                "category": item.category,
                "image_url": None,
                "merchant_id": current_user["id"],
                "merchant_name": current_user["name"],
                "merchant_phone": current_user.get("phone"),
                "merchant_upi_id": current_user.get("upi_id"),
                "is_active": True,
                "stock": item.stock,
                "delivery_time_minutes": item.delivery_time_minutes,
                "available_from": item.available_from,
                "available_until": item.available_until,
                "rating_avg": 0.0,
                "rating_count": 0,
                "created_at": datetime.utcnow().isoformat(),
                "delivery_area": json.dumps(item.delivery_area) if item.delivery_area else None,
                "merchant_location": json.dumps(item.merchant_location) if item.merchant_location else None,
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
