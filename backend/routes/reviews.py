import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from firebase_db import get_db
from auth_utils import require_buyer
from schemas import ReviewCreate

router = APIRouter()


@router.post("/", status_code=201)
async def submit_review(data: ReviewCreate, current_user=Depends(require_buyer)):
    db = get_db()

    # Validate rating
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    # Check order belongs to this buyer and is completed
    order = db.collection("orders").document(data.order_id).get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()
    if order_data.get("buyer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order_data.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed orders")

    # Check not already reviewed
    existing = db.collection("reviews").where("order_id", "==", data.order_id).get()
    if len(existing) > 0:
        raise HTTPException(status_code=400, detail="You already reviewed this order")

    # Save review
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "order_id": data.order_id,
        "product_id": data.product_id,
        "merchant_id": data.merchant_id,
        "buyer_id": current_user["id"],
        "buyer_name": current_user["name"],
        "rating": data.rating,
        "comment": data.comment,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("reviews").document(review_id).set(review_doc)

    # Update product rating average
    try:
        all_reviews = db.collection("reviews").where("product_id", "==", data.product_id).get()
        ratings = [r.to_dict().get("rating", 0) for r in all_reviews]
        avg = sum(ratings) / len(ratings) if ratings else 0
        db.collection("products").document(data.product_id).update({
            "rating_avg": round(avg, 1),
            "rating_count": len(ratings),
        })
    except Exception as e:
        print(f"Rating update error: {e}")

    return review_doc


@router.get("/product/{product_id}")
async def get_product_reviews(product_id: str):
    db = get_db()
    reviews = db.collection("reviews").where("product_id", "==", product_id).get()
    result = [r.to_dict() for r in reviews]
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result


@router.get("/merchant/{merchant_id}")
async def get_merchant_reviews(merchant_id: str):
    db = get_db()
    reviews = db.collection("reviews").where("merchant_id", "==", merchant_id).get()
    result = [r.to_dict() for r in reviews]
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result
