import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from firebase_db import get_db
from auth_utils import get_current_user
from routes.orders import store_and_send_notification

router = APIRouter()


class SendMessage(BaseModel):
    text: str


@router.post("/{order_id}/messages")
async def send_message(order_id: str, data: SendMessage, current_user=Depends(get_current_user)):
    db = get_db()
    order = db.collection("orders").document(order_id).get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()

    # Only buyer or merchant of this order can chat
    if current_user["id"] not in [order_data.get("buyer_id"), order_data.get("merchant_id")]:
        raise HTTPException(status_code=403, detail="Not your order")

    msg_id = str(uuid.uuid4())
    msg = {
        "id": msg_id,
        "order_id": order_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "sender_role": current_user["role"],
        "text": data.text.strip(),
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("order_chats").document(msg_id).set(msg)

    # ISSUE 1 FIX — chat message notifications.
    # The receiver (whichever party isn't the sender) gets a notification
    # through the existing polling + FCM pipeline (store_and_send_notification
    # from routes.orders — the same helper used for order/status/arrival
    # notifications), so no new infra/WebSockets are introduced.
    recipient_id = (
        order_data.get("buyer_id")
        if current_user["id"] == order_data.get("merchant_id")
        else order_data.get("merchant_id")
    )
    if recipient_id:
        preview = msg["text"][:80] + ("…" if len(msg["text"]) > 80 else "")
        notification = {
            "type": "chat_message",
            "order_id": order_id,
            "message_id": msg_id,
            "title": "New message",
            "body": f"{current_user['name']}: {preview}",
            "sender_id": current_user["id"],
            "sender_name": current_user["name"],
        }
        await store_and_send_notification(recipient_id, notification)

    return msg


@router.get("/{order_id}/messages")
async def get_messages(order_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    order = db.collection("orders").document(order_id).get()
    if not order.exists:
        raise HTTPException(status_code=404, detail="Order not found")
    order_data = order.to_dict()

    if current_user["id"] not in [order_data.get("buyer_id"), order_data.get("merchant_id")]:
        raise HTTPException(status_code=403, detail="Not your order")

    msgs = db.collection("order_chats").where("order_id", "==", order_id).get()
    result = [m.to_dict() for m in msgs]
    result.sort(key=lambda x: x.get("created_at", ""))
    return result
