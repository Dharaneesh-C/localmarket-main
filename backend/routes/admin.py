from fastapi import APIRouter, Depends, HTTPException
from firebase_db import get_db
from auth_utils import get_current_user
from collections import defaultdict
from datetime import datetime, timedelta
import json
import uuid
import bcrypt

router = APIRouter()

# Add your admin email — must match the email used to register on NearSell
ADMIN_EMAILS = [
    "dharaneesh04@gmail.com",
    "dharineeshdharineesh54@gmail.com",
]

# ─── Admin credentials to auto-seed ──────────────────────────────────────────
_SEED_EMAIL    = "dharineeshdharineesh54@gmail.com"
_SEED_PASSWORD = "dharangayou@04"
_SEED_NAME     = "Admin"


def require_admin(current_user=Depends(get_current_user)):
    if current_user.get("email") not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ─── One-time seed endpoint — creates admin account if not exists ─────────────
@router.post("/seed")
async def seed_admin():
    """
    Call this ONCE to create the admin account in Firestore.
    POST https://nearsell-backend.vercel.app/api/admin/seed
    Safe to call multiple times — idempotent (updates password if user exists).
    """
    db = get_db()
    hashed = bcrypt.hashpw(_SEED_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    existing = db.collection("users").where("email", "==", _SEED_EMAIL).get()

    if existing:
        user_id = existing[0].id
        db.collection("users").document(user_id).update({"password": hashed})
        return {
            "status": "updated",
            "message": f"Admin account password updated for {_SEED_EMAIL}",
            "user_id": user_id,
        }

    user_id = str(uuid.uuid4())
    db.collection("users").document(user_id).set({
        "id": user_id,
        "name": _SEED_NAME,
        "email": _SEED_EMAIL,
        "password": hashed,
        "role": "buyer",   # role=buyer allows login; admin access is email-based
        "phone": None,
        "location": None,
        "fcm_token": None,
        "favourites": [],
        "created_at": datetime.utcnow().isoformat(),
    })

    return {
        "status": "created",
        "message": f"Admin account created for {_SEED_EMAIL}",
        "user_id": user_id,
    }


# ─── Admin: Full Dashboard Summary ───────────────────────────────────────────
@router.get("/summary")
async def admin_summary(current_user=Depends(require_admin)):
    db = get_db()

    all_users = [u.to_dict() for u in db.collection("users").get()]
    all_products = [p.to_dict() for p in db.collection("products").get()]
    all_orders = [o.to_dict() for o in db.collection("orders").get()]

    merchants = [u for u in all_users if u.get("role") == "merchant"]
    buyers = [u for u in all_users if u.get("role") == "buyer"]

    total_revenue = sum(o.get("total_price", 0) for o in all_orders if o.get("status") == "completed")
    pending_orders = [o for o in all_orders if o.get("status") == "pending"]

    return {
        "total_merchants": len(merchants),
        "total_buyers": len(buyers),
        "total_products": len(all_products),
        "active_products": len([p for p in all_products if p.get("is_active")]),
        "total_orders": len(all_orders),
        "pending_orders": len(pending_orders),
        "completed_orders": len([o for o in all_orders if o.get("status") == "completed"]),
        "total_revenue": round(total_revenue, 2),
    }


# ─── Admin: All Merchants ─────────────────────────────────────────────────────
@router.get("/merchants")
async def admin_merchants(current_user=Depends(require_admin)):
    db = get_db()
    all_users = [u.to_dict() for u in db.collection("users").get()]
    all_orders = [o.to_dict() for o in db.collection("orders").get()]
    all_products = [p.to_dict() for p in db.collection("products").get()]

    merchants = [u for u in all_users if u.get("role") == "merchant"]
    result = []
    for m in merchants:
        mid = m["id"]
        m_orders = [o for o in all_orders if o.get("merchant_id") == mid]
        m_products = [p for p in all_products if p.get("merchant_id") == mid]
        revenue = sum(o.get("total_price", 0) for o in m_orders if o.get("status") == "completed")
        result.append({
            "id": mid,
            "name": m.get("name"),
            "email": m.get("email"),
            "phone": m.get("phone"),
            "bio": m.get("bio"),
            "working_hours": m.get("working_hours"),
            "rating_avg": m.get("rating_avg", 0),
            "rating_count": m.get("rating_count", 0),
            "total_products": len(m_products),
            "active_products": len([p for p in m_products if p.get("is_active")]),
            "total_orders": len(m_orders),
            "total_revenue": round(revenue, 2),
            "joined": m.get("created_at"),
        })
    result.sort(key=lambda x: x["total_revenue"], reverse=True)
    return result


# ─── Admin: All Buyers ────────────────────────────────────────────────────────
@router.get("/buyers")
async def admin_buyers(current_user=Depends(require_admin)):
    db = get_db()
    all_users = [u.to_dict() for u in db.collection("users").get()]
    all_orders = [o.to_dict() for o in db.collection("orders").get()]

    buyers = [u for u in all_users if u.get("role") == "buyer"]
    result = []
    for b in buyers:
        bid = b["id"]
        b_orders = [o for o in all_orders if o.get("buyer_id") == bid]
        spent = sum(o.get("total_price", 0) for o in b_orders if o.get("status") == "completed")
        result.append({
            "id": bid,
            "name": b.get("name"),
            "email": b.get("email"),
            "phone": b.get("phone"),
            "total_orders": len(b_orders),
            "total_spent": round(spent, 2),
            "joined": b.get("created_at"),
        })
    result.sort(key=lambda x: x["total_spent"], reverse=True)
    return result


# ─── Admin: All Orders ────────────────────────────────────────────────────────
@router.get("/orders")
async def admin_orders(current_user=Depends(require_admin)):
    db = get_db()
    orders = [o.to_dict() for o in db.collection("orders").get()]
    for o in orders:
        if isinstance(o.get("buyer_location"), str):
            try:
                o["buyer_location"] = json.loads(o["buyer_location"])
            except Exception:
                pass
    orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return orders


# ─── Admin: Platform Revenue Graph (last 30 days) ────────────────────────────
@router.get("/revenue-chart")
async def admin_revenue_chart(current_user=Depends(require_admin)):
    db = get_db()
    orders = [o.to_dict() for o in db.collection("orders").get()]
    completed = [o for o in orders if o.get("status") == "completed" and o.get("created_at")]

    daily = defaultdict(float)
    today = datetime.utcnow().date()
    for i in range(30):
        day = (today - timedelta(days=i)).isoformat()
        daily[day] = 0.0

    for o in completed:
        try:
            day = o["created_at"][:10]
            daily[day] += o.get("total_price", 0)
        except Exception:
            pass

    chart = [{"date": d, "revenue": round(daily[d], 2)} for d in sorted(daily.keys())]
    return chart
