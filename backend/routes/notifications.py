import time
from fastapi import APIRouter, Query, Depends, Request
from auth_utils import get_current_user
from firebase_db import get_db

router = APIRouter()

# ─── Rate limiting (in-memory per-instance, good enough for Vercel) ──────────
# Key: user_id, Value: last poll timestamp (seconds)
_last_poll: dict = {}
POLL_MIN_INTERVAL = 4  # seconds — faster than 10s feels unresponsive, slower is fine


def store_notification(user_id: str, message: dict):
    """
    Persist notification to Firestore so it survives Vercel cold starts.
    Called by orders/products routes when events happen.
    """
    db = get_db()
    ts = int(time.time() * 1000)  # ms

    notif_doc = {
        "user_id": user_id,
        "message": message,
        "timestamp": ts,
        "read": False,
    }

    # Use auto-ID document under notifications collection
    db.collection("notifications").add(notif_doc)

    # Cleanup: keep only last 50 per user (lazy cleanup on write)
    try:
        old_notifs = (
            db.collection("notifications")
            .where("user_id", "==", user_id)
            .order_by("timestamp")
            .get()
        )
        docs = list(old_notifs)
        if len(docs) > 50:
            # Delete oldest ones beyond 50
            for doc in docs[: len(docs) - 50]:
                doc.reference.delete()
    except Exception as e:
        print(f"Notification cleanup error: {e}")


@router.get("/poll")
async def poll_notifications(
    request: Request,
    since: int = Query(default=0),
    current_user=Depends(get_current_user),
):
    """
    Polling endpoint — returns notifications since a given timestamp (ms).
    Rate-limited to POLL_MIN_INTERVAL seconds per user to protect Firestore.
    """
    user_id = current_user["id"]

    # ── Rate limiting ────────────────────────────────────────────────────────
    now = time.time()
    last = _last_poll.get(user_id, 0)
    if now - last < POLL_MIN_INTERVAL:
        # Too soon — return empty list without hitting Firestore
        return []
    _last_poll[user_id] = now

    # ── Fetch from Firestore ─────────────────────────────────────────────────
    try:
        db = get_db()
        # Composite index required: user_id ASC, timestamp ASC
        # Firestore will suggest the index URL in the error log on first run
        notifs = (
            db.collection("notifications")
            .where("user_id", "==", user_id)
            .where("timestamp", ">", since)
            .order_by("timestamp")
            .limit(20)  # cap per poll
            .get()
        )
        return [n.to_dict()["message"] for n in notifs]
    except Exception as e:
        print(f"Poll notifications error (may need Firestore index): {e}")
        # Fallback: fetch without ordering if index not yet created
        try:
            db = get_db()
            notifs = (
                db.collection("notifications")
                .where("user_id", "==", user_id)
                .where("timestamp", ">", since)
                .limit(20)
                .get()
            )
            return [n.to_dict()["message"] for n in notifs]
        except Exception:
            return []


@router.delete("/clear")
async def clear_notifications(current_user=Depends(get_current_user)):
    """Mark all notifications as read / clear for the user."""
    user_id = current_user["id"]
    try:
        db = get_db()
        notifs = db.collection("notifications").where("user_id", "==", user_id).get()
        for n in notifs:
            n.reference.delete()
        return {"message": "Cleared"}
    except Exception as e:
        return {"message": str(e)}
