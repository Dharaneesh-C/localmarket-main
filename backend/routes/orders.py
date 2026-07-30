import json
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException

from auth_utils import get_current_user, require_merchant, require_buyer
from fcm_service import send_push_notification
from firebase_db import get_db
from routes.notifications import store_notification
from schemas import OrderCreate, OrderStatusUpdate, CODConfirm

router = APIRouter()


def flatten_order(order: dict) -> dict:
    """Serialize nested buyer_location to JSON string for Firestore."""
    result = dict(order)
    if "buyer_location" in result and isinstance(result["buyer_location"], dict):
        result["buyer_location"] = json.dumps(result["buyer_location"])
    return result


def unflatten_order(order: dict) -> dict:
    """Deserialize buyer_location back to dict."""
    result = dict(order)
    if "buyer_location" in result and isinstance(result["buyer_location"], str):
        try:
            result["buyer_location"] = json.loads(result["buyer_location"])
        except Exception:
            pass
    return result


async def store_and_send_notification(recipient_id: str, notification: dict) -> None:
    """Store a polling notification and attempt FCM delivery when a token exists."""
    store_notification(recipient_id, notification)

    try:
        db = get_db()
        user_doc = db.collection("users").document(recipient_id).get()
        if not user_doc.exists:
            return

        user_data = user_doc.to_dict() or {}
        fcm_token = user_data.get("fcm_token")
        if not fcm_token:
            return

        data_payload = {}
        for key, value in notification.items():
            if key in {"title", "body"} or value is None:
                continue
            data_payload[key] = str(value)

        await send_push_notification(
            fcm_token,
            notification.get("title", ""),
            notification.get("body", ""),
            data_payload,
        )
    except Exception as e:
        print(f"Notification FCM delivery error: {e}")


# ─── Buyer: Place an order ────────────────────────────────────────────────────
@router.post("/", status_code=201)
async def place_order(data: OrderCreate, current_user=Depends(require_buyer)):
    db = get_db()
    order_id = str(uuid.uuid4())

    order_doc = {
        "id": order_id,
        "product_id": data.product_id,
        "product_title": data.product_title,
        "quantity": data.quantity,
        "unit": data.unit,
        "total_price": data.total_price,
        "merchant_id": data.merchant_id,
        "merchant_name": data.merchant_name,
        "merchant_upi_id": data.merchant_upi_id,
        "buyer_id": current_user["id"],
        "buyer_name": current_user["name"],
        "buyer_phone": current_user.get("phone"),
        "buyer_location": data.buyer_location.model_dump() if data.buyer_location else None,
        "note": data.note,
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    }

    # Save to Firestore (flatten nested location)
    db.collection("orders").document(order_id).set(flatten_order(order_doc))

    # Reduce stock if product has limited stock
    try:
        p_ref = db.collection("products").document(data.product_id)
        p_doc = p_ref.get()
        if p_doc.exists:
            p_data = p_doc.to_dict()
            current_stock = p_data.get("stock")
            if current_stock is not None:
                new_stock = max(0, current_stock - int(data.quantity))
                p_ref.update({"stock": new_stock, "is_active": new_stock > 0})
    except Exception as e:
        print(f"Stock update error: {e}")

    # Notify the merchant via polling store
    notification = {
        "type": "new_order",
        "order_id": order_id,
        "title": f"🛒 New order from {current_user['name']}!",
        "body": f"{data.quantity} {data.unit} of {data.product_title} — ₹{data.total_price}",
        "buyer_name": current_user["name"],
        "buyer_phone": current_user.get("phone"),
        "buyer_location": data.buyer_location.model_dump() if data.buyer_location else None,
        "product_title": data.product_title,
        "quantity": data.quantity,
        "unit": data.unit,
        "total_price": data.total_price,
        "order_id": order_id,
    }
    await store_and_send_notification(data.merchant_id, notification)

    return unflatten_order(order_doc)


# ─── Buyer: Get my orders ─────────────────────────────────────────────────────
@router.get("/my-orders")
async def get_my_orders(current_user=Depends(require_buyer)):
    db = get_db()
    orders = db.collection("orders").where("buyer_id", "==", current_user["id"]).get()
    result = [unflatten_order(o.to_dict()) for o in orders]
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result


# ─── Merchant: Get incoming orders ───────────────────────────────────────────
@router.get("/merchant-orders")
async def get_merchant_orders(current_user=Depends(require_merchant)):
    db = get_db()
    orders = db.collection("orders").where("merchant_id", "==", current_user["id"]).get()
    result = [unflatten_order(o.to_dict()) for o in orders]
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return result


# ─── Merchant: Update order status ───────────────────────────────────────────
@router.put("/{order_id}/status")
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    current_user=Depends(require_merchant)
):
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()

    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")

    order_data = order.to_dict()
    if order_data.get("merchant_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    order_ref.update({"status": data.status})

    # Notify buyer about status change
    status_messages = {
        "accepted": "✅ Your order was accepted!",
        "rejected": "❌ Your order was rejected.",
        "completed": "🎉 Your order is completed!",
    }
    notification = {
        "type": "order_update",
        "order_id": order_id,
        "title": status_messages.get(data.status, "Order updated"),
        "body": f"{order_data.get('product_title')} — {data.status}",
        "status": data.status,
    }
    await store_and_send_notification(order_data["buyer_id"], notification)

    return {"message": f"Order status updated to {data.status}"}


# ─── Merchant: Ring buyer alarm (I've Arrived!) ───────────────────────────────
@router.post("/{order_id}/arrived")
async def merchant_arrived(
    order_id: str,
    current_user=Depends(require_merchant)
):
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()

    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")

    order_data = order.to_dict()
    if order_data.get("merchant_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    # Send alarm notification to buyer
    notification = {
        "type": "merchant_arrived",
        "order_id": order_id,
        "title": f"🔔 {current_user['name']} has arrived!",
        "body": f"Your merchant is at your door for: {order_data.get('product_title')}",
        "merchant_name": current_user["name"],
        "product_title": order_data.get("product_title"),
        "alarm": True,
    }

    await store_and_send_notification(order_data["buyer_id"], notification)
    

    return {"message": "Buyer has been alerted"}


# ─── Merchant: Update live location while delivering ────────────────────────
@router.put("/{order_id}/location")
async def put_merchant_location(
    order_id: str,
    lat: float,
    lng: float,
    current_user=Depends(require_merchant)
):
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()
    if order_data.get("merchant_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order_data.get("status") != "accepted":
        raise HTTPException(status_code=400, detail="Order must be accepted")

    order_ref.update({
        "merchant_live_lat": lat,
        "merchant_live_lng": lng,
        "merchant_location_updated_at": datetime.utcnow().isoformat(),
    })
    return {"message": "Location updated"}


# ─── Buyer: Get merchant live location for accepted order ─────────────────────
@router.get("/{order_id}/merchant-location")
async def get_merchant_live_location(
    order_id: str,
    current_user=Depends(require_buyer)
):
    db = get_db()
    order = db.collection("orders").document(order_id).get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()
    if order_data.get("buyer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    lat = order_data.get("merchant_live_lat")
    lng = order_data.get("merchant_live_lng")
    updated_at = order_data.get("merchant_location_updated_at")

    if lat is None or lng is None:
        return {"available": False}

    return {
        "available": True,
        "lat": lat,
        "lng": lng,
        "updated_at": updated_at,
        "status": order_data.get("status"),
    }


# ─── Buyer: Confirm Cash on Delivery payment ─────────────────────────────────
@router.post("/{order_id}/confirm-payment")
async def confirm_payment(order_id: str, current_user=Depends(require_buyer)):
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()
    if order_data.get("buyer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order_data.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Order must be completed first")

    order_ref.update({"payment_confirmed": True, "payment_confirmed_at": datetime.utcnow().isoformat()})

    # Notify merchant
    notification = {
        "type": "payment_confirmed",
        "order_id": order_id,
        "title": f"💵 Payment confirmed!",
        "body": f"{current_user['name']} confirmed cash payment for {order_data.get('product_title')}",
    }
    await store_and_send_notification(order_data["merchant_id"], notification)
    return {"message": "Payment confirmed"}


# ─── Buyer: Cancel a pending order ──────────────────────────────────────────────────
@router.post("/{order_id}/cancel")
async def cancel_order(order_id: str, current_user=Depends(require_buyer)):
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()
    if order_data.get("buyer_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not your order")
    if order_data.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    order_ref.update({
        "status": "cancelled",
        "cancelled_at": datetime.utcnow().isoformat(),
        "cancelled_by": "buyer",
    })

    # Restore stock if product had limited stock
    try:
        p_ref = db.collection("products").document(order_data["product_id"])
        p_doc = p_ref.get()
        if p_doc.exists:
            p_data = p_doc.to_dict()
            if p_data.get("stock") is not None:
                restored = p_data["stock"] + int(order_data.get("quantity", 0))
                p_ref.update({"stock": restored, "is_active": restored > 0})
    except Exception as e:
        print(f"Stock restore error: {e}")

    # Notify merchant
    await store_and_send_notification(order_data["merchant_id"], {
        "type": "order_cancelled",
        "order_id": order_id,
        "title": f"🚫 Order cancelled by {current_user['name']}",
        "body": f"{order_data.get('product_title')} order has been cancelled",
    })
    return {"message": "Order cancelled successfully"}
