from fastapi import APIRouter, Depends
from firebase_db import get_db
from auth_utils import require_merchant

router = APIRouter()


@router.get("/dashboard")
async def merchant_dashboard(current_user=Depends(require_merchant)):
    db = get_db()
    all_products = db.collection("products").where("merchant_id", "==", current_user["id"]).get()
    products = [p.to_dict() for p in all_products]
    total = len(products)
    active = len([p for p in products if p.get("is_active")])
    return {
        "merchant_name": current_user["name"],
        "total_products": total,
        "active_products": active,
        "paused_products": total - active,
    }
