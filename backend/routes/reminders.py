import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from firebase_db import get_db
from schemas import ReminderCreate
from auth_utils import require_buyer

router = APIRouter()


def normalize(term: str) -> str:
    return " ".join(term.strip().lower().split())


def serialize_reminder(r: dict) -> dict:
    return {
        "id": r["id"],
        "search_term": r["search_term"],
        "category": r.get("category"),
        "created_at": r.get("created_at"),
        "active": r.get("active", True),
        "available": r.get("available", False),
        "last_notified_at": r.get("last_notified_at"),
        "matched_merchant_name": r.get("matched_merchant_name"),
        "matched_product_id": r.get("matched_product_id"),
    }


@router.post("", status_code=201)
async def create_reminder(data: ReminderCreate, current_user=Depends(require_buyer)):
    db = get_db()
    reminder_id = str(uuid.uuid4())
    doc = {
        "id": reminder_id,
        "buyer_id": current_user["id"],
        "search_term": data.search_term.strip(),
        "normalized_search_term": normalize(data.search_term),
        "category": data.category,
        "created_at": datetime.utcnow().isoformat(),
        "active": True,
        "available": False,
        "last_notified_at": None,
        "matched_merchant_name": None,
        "matched_product_id": None,
    }
    db.collection("reminders").document(reminder_id).set(doc)
    return serialize_reminder(doc)


@router.get("")
async def list_reminders(current_user=Depends(require_buyer)):
    db = get_db()
    docs = db.collection("reminders").where("buyer_id", "==", current_user["id"]).where("active", "==", True).get()
    reminders = [d.to_dict() for d in docs]
    reminders.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return [serialize_reminder(r) for r in reminders]


@router.delete("/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user=Depends(require_buyer)):
    db = get_db()
    ref = db.collection("reminders").document(reminder_id)
    doc = ref.get()
    if not doc.exists or doc.to_dict().get("buyer_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Reminder not found")
    # Soft-delete (matches the app's existing soft-delete convention for
    # products) rather than a hard delete — keeps the record for any future
    # "reminder history" feature without extra migration later.
    ref.update({"active": False})
    return {"message": "Reminder removed"}
