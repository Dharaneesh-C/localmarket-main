from fastapi import APIRouter, Depends, HTTPException
from firebase_db import get_db
from auth_utils import require_merchant
from datetime import datetime

router = APIRouter()


@router.post("/check-availability")
async def check_and_pause_products(_=Depends(require_merchant)):
    """
    Called periodically (or on demand) to auto-pause products whose
    availability window has ended, and re-activate those whose window has started.
    """
    db = get_db()
    now = datetime.utcnow()
    current_minutes = now.hour * 60 + now.minute  # minutes since midnight UTC (IST = UTC+5:30)
    # Adjust for IST
    ist_total = current_minutes + 330  # +5h30m
    ist_hour = (ist_total // 60) % 24
    ist_minute = ist_total % 60
    ist_now_minutes = ist_hour * 60 + ist_minute

    products = db.collection("products").get()
    updated = 0

    for p_doc in products:
        p = p_doc.to_dict()
        avail_from = p.get("available_from_minutes")   # minutes since midnight
        avail_until = p.get("available_until_minutes")

        if avail_from is None and avail_until is None:
            continue  # no window set — skip

        in_window = True
        if avail_from is not None and avail_until is not None:
            if avail_from <= avail_until:
                in_window = avail_from <= ist_now_minutes <= avail_until
            else:
                # overnight window e.g. 22:00 → 06:00
                in_window = ist_now_minutes >= avail_from or ist_now_minutes <= avail_until
        elif avail_from is not None:
            in_window = ist_now_minutes >= avail_from
        elif avail_until is not None:
            in_window = ist_now_minutes <= avail_until

        current_active = p.get("is_active", True)
        if in_window and not current_active and not p.get("manually_paused"):
            db.collection("products").document(p["id"]).update({"is_active": True})
            updated += 1
        elif not in_window and current_active:
            db.collection("products").document(p["id"]).update({
                "is_active": False,
                "paused_reason": "availability_window",
            })
            updated += 1

    return {"message": f"Checked {len(products)} products, updated {updated}"}
