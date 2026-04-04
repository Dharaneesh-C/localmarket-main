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
    try:
        db = get_db()
        ts = int(time.time() * 1000)  # ms

        notif_doc = {
            "user_id": user_id,
            "message": message,
            "timestamp": ts,
            "read": False,
        }
        db.collection("notifications").add(notif_doc)
        print(f"✅ Notification stored for user {user_id[:8]}...: {message.get('type')}")
    except Exception as e:
        print(f"❌ store_notification FAILED for {user_id}: {e}")


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
        # Simple query — only filter by user_id + timestamp.
        # We sort in Python to avoid needing a Firestore composite index.
        notifs = (
            db.collection("notifications")
            .where("user_id", "==", user_id)
            .where("timestamp", ">", since)
            .limit(20)
            .get()
        )
        results = [n.to_dict() for n in notifs]
        # Sort by timestamp ascending in Python — no index required
        results.sort(key=lambda x: x.get("timestamp", 0))
        print(f"📨 Poll for {user_id[:8]}...: {len(results)} new notifications since {since}")
        return [r["message"] for r in results]
    except Exception as e:
        print(f"❌ Poll notifications error: {e}")
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
