from fastapi import APIRouter, Depends
from firebase_db import get_db
from auth_utils import require_merchant
from collections import defaultdict
from datetime import datetime, timedelta
import json

router = APIRouter()


# ─── Merchant Analytics ───────────────────────────────────────────────────────
@router.get("/analytics")
async def merchant_analytics(current_user=Depends(require_merchant)):
    db = get_db()
    mid = current_user["id"]

    all_orders = [o.to_dict() for o in db.collection("orders").where("merchant_id", "==", mid).get()]
    all_products = [p.to_dict() for p in db.collection("products").where("merchant_id", "==", mid).get()]

    completed = [o for o in all_orders if o.get("status") == "completed"]
    total_revenue = sum(o.get("total_price", 0) for o in completed)

    # ── Revenue chart (last 30 days) ──────────────────────────────────────────
    daily_revenue = defaultdict(float)
    daily_orders = defaultdict(int)
    today = datetime.utcnow().date()
    for i in range(30):
        day = (today - timedelta(days=i)).isoformat()
        daily_revenue[day] = 0.0
        daily_orders[day] = 0

    for o in all_orders:
        try:
            day = o["created_at"][:10]
            if day in daily_revenue:
                daily_orders[day] += 1
            if o.get("status") == "completed" and day in daily_revenue:
                daily_revenue[day] += o.get("total_price", 0)
        except Exception:
            pass

    revenue_chart = [
        {"date": d, "revenue": round(daily_revenue[d], 2), "orders": daily_orders[d]}
        for d in sorted(daily_revenue.keys())
    ]

    # ── Best selling products ─────────────────────────────────────────────────
    product_sales = defaultdict(lambda: {"title": "", "quantity": 0, "revenue": 0})
    for o in completed:
        pid = o.get("product_id", "unknown")
        product_sales[pid]["title"] = o.get("product_title", "Unknown")
        product_sales[pid]["quantity"] += o.get("quantity", 0)
        product_sales[pid]["revenue"] += o.get("total_price", 0)

    best_selling = sorted(
        [{"product_id": k, **v, "revenue": round(v["revenue"], 2)} for k, v in product_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:5]

    # ── Peak hours (orders by hour of day) ────────────────────────────────────
    hourly = defaultdict(int)
    for h in range(24):
        hourly[h] = 0
    for o in all_orders:
        try:
            hour = int(o["created_at"][11:13])
            hourly[hour] += 1
        except Exception:
            pass

    peak_hours = [{"hour": h, "label": f"{h:02d}:00", "orders": hourly[h]} for h in range(24)]

    # ── Category breakdown ────────────────────────────────────────────────────
    category_revenue = defaultdict(float)
    for o in completed:
        pid = o.get("product_id")
        product = next((p for p in all_products if p.get("id") == pid), None)
        cat = product.get("category", "Other") if product else "Other"
        category_revenue[cat] += o.get("total_price", 0)

    category_breakdown = [
        {"category": cat, "revenue": round(rev, 2)}
        for cat, rev in sorted(category_revenue.items(), key=lambda x: x[1], reverse=True)
    ]

    # ── Order status breakdown ────────────────────────────────────────────────
    status_counts = defaultdict(int)
    for o in all_orders:
        status_counts[o.get("status", "unknown")] += 1

    return {
        "summary": {
            "total_orders": len(all_orders),
            "completed_orders": len(completed),
            "pending_orders": status_counts.get("pending", 0),
            "rejected_orders": status_counts.get("rejected", 0),
            "total_revenue": round(total_revenue, 2),
            "total_products": len(all_products),
            "active_products": len([p for p in all_products if p.get("is_active")]),
            "avg_order_value": round(total_revenue / len(completed), 2) if completed else 0,
        },
        "revenue_chart": revenue_chart,
        "best_selling": best_selling,
        "peak_hours": peak_hours,
        "category_breakdown": category_breakdown,
        "status_counts": dict(status_counts),
    }
