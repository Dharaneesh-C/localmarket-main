from fastapi import APIRouter, Query, Depends
from auth_utils import get_current_user

router = APIRouter()

# In-memory store for notifications (per user)
# Key: user_id, Value: list of {message, timestamp}
_notification_store: dict = {}


def store_notification(user_id: str, message: dict):
    """Called by products route when a new product is posted."""
    import time
    if user_id not in _notification_store:
        _notification_store[user_id] = []
    _notification_store[user_id].append({
        "message": message,
        "timestamp": int(time.time() * 1000),  # ms
    })
    # Keep only last 50 notifications per user
    _notification_store[user_id] = _notification_store[user_id][-50:]


@router.get("/poll")
async def poll_notifications(
    since: int = Query(default=0),
    current_user=Depends(get_current_user)
):
    """
    Polling endpoint for Vercel (no WebSocket support).
    Returns notifications since the given timestamp (ms).
    """
    user_id = current_user["id"]
    all_notifs = _notification_store.get(user_id, [])
    new_notifs = [n["message"] for n in all_notifs if n["timestamp"] > since]
    return new_notifs
