import time
from fastapi import APIRouter, Depends, HTTPException, Query
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
       
    except Exception as e:
        print(f"❌ store_notification FAILED for {user_id}: {e}")


def serialize_notification(notification) -> dict:
    """Return the public notification shape from a Firestore document."""
    data = notification.to_dict()
    return {
        "id": notification.id,
        "read": data.get("read", False),
        "timestamp": data.get("timestamp"),
        "message": data.get("message", {}),
    }


@router.get("/poll")
async def poll_notifications(
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
        results = []

        for notif in notifs:
            results.append(serialize_notification(notif))

        results.sort(
            key=lambda x: x.get("timestamp", 0)
        )

        return results
    except Exception as e:
        print(f"❌ Poll notifications error: {e}")
        return []

@router.get("")
async def get_notifications(current_user=Depends(get_current_user)):
    """
    Get all notifications for the current user.
    """
    user_id = current_user["id"]

    try:
        db = get_db()

        notifications = (
            db.collection("notifications")
            .where("user_id", "==", user_id)
            .get()
        )

        results = []

        for notif in notifications:
            results.append(serialize_notification(notif))

        # Newest notification first
        results.sort(
            key=lambda x: x.get("timestamp", 0),
            reverse=True
        )

        return results

    except Exception as e:
        print(f"❌ Get notifications error: {e}")
        return []
@router.put("/read/{notification_id}")
async def mark_notification_read(
    notification_id: str,
    current_user=Depends(get_current_user),
):
    """
    Mark a notification as read.
    """
    user_id = current_user["id"]

    try:
        db = get_db()

        doc_ref = db.collection("notifications").document(notification_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Notification not found")

        data = doc.to_dict()

        # Security check
        if data.get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        doc_ref.update({"read": True})

        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Mark notification read error: {e}")
        return {"success": False, "message": str(e)}
@router.put("/read-all")
async def mark_all_notifications_read(
    current_user=Depends(get_current_user),
):
    """
    Mark all notifications as read.
    """
    user_id = current_user["id"]

    try:
        db = get_db()

        notifications = (
            db.collection("notifications")
            .where("user_id", "==", user_id)
            .where("read", "==", False)
            .get()
        )

        for notif in notifications:
            notif.reference.update({"read": True})

        return {"success": True}

    except Exception as e:
        print(f"❌ Mark all read error: {e}")
        return {"success": False, "message": str(e)}
@router.delete("/clear")
async def clear_notifications(current_user=Depends(get_current_user)):
    """Delete all notifications for the current user."""
    user_id = current_user["id"]
    try:
        db = get_db()
        notifs = db.collection("notifications").where("user_id", "==", user_id).get()
        for n in notifs:
            n.reference.delete()
        return {"message": "Cleared"}
    except Exception as e:
        return {"message": str(e)}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user=Depends(get_current_user),
):
    """Delete one notification belonging to the current user."""
    user_id = current_user["id"]

    try:
        db = get_db()
        doc_ref = db.collection("notifications").document(notification_id)
        doc = doc_ref.get()

        if not doc.exists:
            raise HTTPException(status_code=404, detail="Notification not found")

        if doc.to_dict().get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

        doc_ref.delete()
        return {"success": True}

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Delete notification error: {e}")
        return {"success": False, "message": str(e)}
