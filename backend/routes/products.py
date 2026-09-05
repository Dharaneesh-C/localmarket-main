from fastapi import APIRouter, HTTPException, Depends, Query
from firebase_db import get_db
from schemas import ProductCreate, ProductUpdate
from auth_utils import get_current_user, require_merchant
from websocket_manager import manager
from fcm_service import send_multicast_notification
from routes.notifications import store_notification
from datetime import datetime
import uuid
import math
import json

router = APIRouter()


def haversine(lon1, lat1, lon2, lat2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def point_in_polygon(px, py, polygon_coords):
    try:
        coords = polygon_coords[0]
        inside = False
        j = len(coords) - 1
        for i in range(len(coords)):
            xi, yi = coords[i][0], coords[i][1]
            xj, yj = coords[j][0], coords[j][1]
            if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi + 1e-10) + xi):
                inside = not inside
            j = i
        return inside
    except:
        return False


def flatten_for_firestore(data: dict) -> dict:
    """
    Firestore cannot store deeply nested arrays (e.g. GeoJSON Polygon coordinates).
    Serialize delivery_area and merchant_location as JSON strings before saving.
    """
    result = dict(data)
    for key in ["delivery_area", "merchant_location"]:
        if key in result and isinstance(result[key], dict):
            result[key] = json.dumps(result[key])
    return result


def unflatten_from_firestore(data: dict) -> dict:
    """
    Deserialize delivery_area and merchant_location back to dicts when reading.
    """
    result = dict(data)
    for key in ["delivery_area", "merchant_location"]:
        if key in result and isinstance(result[key], str):
            try:
                result[key] = json.loads(result[key])
            except Exception:
                pass
    return result


def serialize_product(p, distance_km=None):
    p = unflatten_from_firestore(p)
    stock = p.get("stock")
    # Backward compatibility: older products only have a single image_url and
    # no images list. New products store both (images[0] == image_url).
    images = p.get("images")
    if not images:
        images = [p["image_url"]] if p.get("image_url") else []
    return {
        "id": p["id"],
        "title": p["title"],
        "description": p["description"],
        "price": p["price"],
        "unit": p.get("unit", "piece"),
        "category": p["category"],
        "image_url": p.get("image_url") or (images[0] if images else None),
        "images": images,
        "merchant_id": p["merchant_id"],
        "merchant_name": p.get("merchant_name", ""),
        "merchant_phone": p.get("merchant_phone"),
        "merchant_location": p["merchant_location"],
        "delivery_area": p.get("delivery_area"),
        "is_active": p.get("is_active", True),
        "stock": stock,
        "sold_out": stock is not None and stock <= 0,
        "rating_avg": round(p.get("rating_avg", 0.0), 1),
        "rating_count": p.get("rating_count", 0),
        "delivery_time_minutes": p.get("delivery_time_minutes"),
        "available_from": p.get("available_from"),
        "available_until": p.get("available_until"),
        "delivery_radius_km": p.get("delivery_radius_km", 5.0),
        "merchant_upi_id": p.get("merchant_upi_id"),
        "created_at": p.get("created_at"),
        "distance_km": round(distance_km, 2) if distance_km is not None else None,
    }


@router.post("/", status_code=201)
async def create_product(data: ProductCreate, current_user=Depends(require_merchant)):
    db = get_db()
    product_id = str(uuid.uuid4())

    # Normalize images/image_url so both are always populated consistently,
    # regardless of which one the client sent (older clients may only send
    # image_url; the multi-image uploader sends `images`).
    images = data.images or ([data.image_url] if data.image_url else [])
    images = images[:5]  # cap at 5 photos per product
    image_url = images[0] if images else None

    raw_doc = {
        "id": product_id,
        **data.model_dump(),
        "image_url": image_url,
        "images": images,
        "merchant_id": current_user["id"],
        "merchant_name": current_user["name"],
        "merchant_phone": current_user.get("phone"),
        "merchant_upi_id": current_user.get("upi_id"),
        "is_active": True,
        "stock": data.stock,
        "available_from": data.available_from,
        "available_until": data.available_until,
        "delivery_radius_km": data.delivery_radius_km or 5.0,
        "rating_avg": 0.0,
        "rating_count": 0,
        "created_at": datetime.utcnow().isoformat(),
    }

    # Flatten nested GeoJSON for Firestore compatibility
    product_doc = flatten_for_firestore(raw_doc)
    db.collection("products").document(product_id).set(product_doc)

    try:
        m_loc = data.merchant_location.coordinates
        delivery_radius = data.delivery_radius_km or 5.0
        all_buyers = db.collection("users").where("role", "==", "buyer").get()
        buyers_to_notify = []

        for b_doc in all_buyers:
            b = b_doc.to_dict()
            b_loc = b.get("location")
            if not b_loc:
                continue
            if isinstance(b_loc, str):
                try:
                    b_loc = json.loads(b_loc)
                except Exception:
                    continue
            if not b_loc.get("coordinates"):
                continue
            b_lng, b_lat = b_loc["coordinates"][0], b_loc["coordinates"][1]
            # Use radius-based check only
            dist = haversine(m_loc[0], m_loc[1], b_lng, b_lat)
            if dist <= delivery_radius:
                buyers_to_notify.append(b)

        notification_payload = {
            "type": "new_product",
            "product_id": product_id,
            "title": f"🛒 {current_user['name']} is selling nearby!",
            "body": f"{data.title} — ₹{data.price}/{data.unit}",
            "merchant_name": current_user["name"],
            "merchant_location": data.merchant_location.model_dump(),
        }

        buyer_ids = [b["id"] for b in buyers_to_notify]
        await manager.broadcast_to_users(buyer_ids, notification_payload)

        fcm_tokens = [b["fcm_token"] for b in buyers_to_notify if b.get("fcm_token")]
        if fcm_tokens:
            await send_multicast_notification(
    fcm_tokens,
    notification_payload["title"],
    notification_payload["body"],
    {
        "type": notification_payload["type"],
        "product_id": notification_payload["product_id"],
    }
)

        print(f"📢 Notified {len(buyers_to_notify)} buyers")
    except Exception as e:
        print(f"Notification error: {e}")

    return serialize_product(raw_doc)


@router.get("/nearby")
async def get_nearby_products(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=20),
    current_user=Depends(get_current_user)
):
    db = get_db()
    all_products = db.collection("products").where("is_active", "==", True).get()

    # ISSUE 4 FIX (product visibility follows merchant's CURRENT location):
    # Previously distance was computed from `p["merchant_location"]` — the
    # location captured once at product-creation time. If a merchant later
    # physically moved (e.g. a mobile cart/stall), their existing products
    # never became visible at the new location; only a brand-new product
    # posted from the new spot would show up. That's wrong — a product is
    # inventory belonging to the merchant, not a fixed listing tied to
    # wherever they happened to be standing when they created it.
    #
    # Fix: batch-fetch every merchant's CURRENT location (the same
    # `users.{id}.location` field already updated via PUT /auth/location —
    # reused as-is, no new field/collection) once, then use that as the
    # distance source for every one of their products. `merchant_location`
    # on the product itself is left untouched (still shown/used elsewhere
    # for display/history) — only the nearby-visibility query changes.
    # Merchants who have never updated a live location (only ever set one at
    # product-creation) fall back to the product's own stored location, so
    # nothing regresses for accounts that predate this change.
    merchant_current_loc = {}
    all_merchants = db.collection("users").where("role", "==", "merchant").get()
    for m_doc in all_merchants:
        m = m_doc.to_dict()
        loc = m.get("location")
        if isinstance(loc, str):
            try:
                loc = json.loads(loc)
            except Exception:
                loc = None
        if loc and loc.get("coordinates") and len(loc["coordinates"]) == 2:
            merchant_current_loc[m_doc.id] = loc["coordinates"]  # [lng, lat]

    result = []
    # Track each distinct merchant that is currently within range of THIS
    # buyer, for the arrival-notification check below — independent of
    # per-product radius so a merchant with several products only triggers
    # one arrival check, not one per product.
    merchants_in_range = {}  # merchant_id -> {name, products: [...]}

    for p_doc in all_products:
        p = unflatten_from_firestore(p_doc.to_dict())
        merchant_id = p.get("merchant_id")

        coords = merchant_current_loc.get(merchant_id)
        if not coords:
            # Fallback: no live location on file for this merchant yet —
            # use the product's own stored location (old behavior),
            # matching pre-fix behavior for accounts that haven't started
            # sending live location updates.
            m_loc = p.get("merchant_location", {})
            coords = m_loc.get("coordinates", [0, 0]) if isinstance(m_loc, dict) else [0, 0]

        dist = haversine(lng, lat, coords[0], coords[1])
        # Use the product's own delivery_radius_km — fallback to buyer's search radius
        product_radius = p.get("delivery_radius_km") or radius_km
        if dist <= product_radius:
            result.append(serialize_product(p, distance_km=dist))
            entry = merchants_in_range.setdefault(merchant_id, {
                "name": p.get("merchant_name", "A merchant"),
                "products": [],
            })
            entry["products"].append(p.get("title", "item"))

    result.sort(key=lambda x: x["distance_km"] or 999)

    # ── Merchant-arrival notification (with OUTSIDE→INSIDE dedup) ──────────
    # Reuses the existing notification polling architecture (store_notification
    # + the buyer app's existing GET /api/notifications/poll loop) — no new
    # WebSocket/cron infrastructure, per the "reuse polling, no WebSockets"
    # requirement. This check piggybacks on every nearby-products call (the
    # buyer app already calls this on load, refresh, and radius/filter
    # changes), rather than adding a separate background job.
    try:
        buyer_id = current_user["id"]
        arrival_state_ref = db.collection("arrival_state")
        for merchant_id, info in merchants_in_range.items():
            state_id = f"{buyer_id}_{merchant_id}"
            state_doc = arrival_state_ref.document(state_id).get()
            was_inside = state_doc.exists and state_doc.to_dict().get("inside")
            if not was_inside:
                # Transition detected: merchant just entered this buyer's range.
                product_list = ", ".join(info["products"][:5])
                store_notification(buyer_id, {
                    "type": "merchant_nearby",  # distinct from 'merchant_arrived'
                    # (the per-order "I've Arrived" alarm) so this passive,
                    # ambient notification never triggers the existing
                    # full-screen ringing alarm banner on the buyer app.
                    "title": f"📍 {info['name']} is now near you!",
                    "body": f"Available: {product_list}",
                    "merchant_id": merchant_id,
                    "merchant_name": info["name"],
                })
            arrival_state_ref.document(state_id).set({
                "buyer_id": buyer_id, "merchant_id": merchant_id, "inside": True,
                "updated_at": datetime.utcnow().isoformat(),
            })

        # Merchants who WERE inside for this buyer but are no longer in the
        # current in-range set have left — reset their state so a future
        # re-entry notifies again (matches the OUTSIDE→INSIDE→OUTSIDE→INSIDE
        # transition model, not a one-time-ever notification).
        prev_states = arrival_state_ref.where("buyer_id", "==", buyer_id).where("inside", "==", True).get()
        for s in prev_states:
            sd = s.to_dict()
            if sd.get("merchant_id") not in merchants_in_range:
                s.reference.update({"inside": False})
    except Exception as e:
        print(f"Arrival notification check failed: {e}")

    # ── Product reminder matching ("notify me when available") ─────────────
    # Checked against this same now-current `result` list, so a reminder
    # only fires once the matching product is actually visible under the
    # Issue-4 current-location rule above — exactly the trigger condition
    # described in the spec (merchant's current location brings a matching
    # product into range).
    try:
        buyer_id = current_user["id"]
        reminders = db.collection("reminders") \
            .where("buyer_id", "==", buyer_id) \
            .where("active", "==", True) \
            .where("available", "==", False) \
            .get()
        for r_doc in reminders:
            r = r_doc.to_dict()
            term = r.get("normalized_search_term", "")
            if not term:
                continue
            match = next((prod for prod in result if term in prod["title"].lower()), None)
            if match:
                r_doc.reference.update({
                    "available": True,
                    "last_notified_at": datetime.utcnow().isoformat(),
                    "matched_merchant_name": match["merchant_name"],
                    "matched_product_id": match["id"],
                })
                store_notification(buyer_id, {
                    "type": "reminder_available",
                    "title": "🔔 Your reminder is available!",
                    "body": f"{match['title']} is now available near you from {match['merchant_name']}.",
                    "reminder_id": r.get("id"),
                    "product_id": match["id"],
                })
    except Exception as e:
        print(f"Reminder matching check failed: {e}")

    return result


@router.get("/merchant/my-products")
async def get_my_products(current_user=Depends(require_merchant)):
    db = get_db()
    products = db.collection("products").where("merchant_id", "==", current_user["id"]).get()
    result = [unflatten_from_firestore(p.to_dict()) for p in products]
    result.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return [serialize_product(p) for p in result]


@router.get("/{product_id}")
async def get_product(product_id: str):
    db = get_db()
    p = db.collection("products").document(product_id).get()
    if not p.exists:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product(p.to_dict())


@router.put("/{product_id}")
async def update_product(product_id: str, data: ProductUpdate, current_user=Depends(require_merchant)):
    db = get_db()
    p_ref = db.collection("products").document(product_id)
    p = p_ref.get()
    if not p.exists or p.to_dict().get("merchant_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Product not found")
    # Use model_dump(exclude_unset=True) so only explicitly-provided fields are updated.
    # This correctly handles is_active=False, stock=0 — previously filtered out by `if v is not None`.
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items()}
    # Keep image_url/images consistent if either was provided.
    if "images" in update_data and update_data["images"] is not None:
        update_data["images"] = update_data["images"][:5]
        update_data["image_url"] = update_data["images"][0] if update_data["images"] else None
    elif "image_url" in update_data and "images" not in update_data:
        update_data["images"] = [update_data["image_url"]] if update_data["image_url"] else []
    if update_data:
        p_ref.update(update_data)
    return {"message": "Product updated"}


@router.delete("/{product_id}")
async def delete_product(product_id: str, current_user=Depends(require_merchant)):
    db = get_db()
    p_ref = db.collection("products").document(product_id)
    p = p_ref.get()
    if not p.exists or p.to_dict().get("merchant_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Product not found")
    # BUG FIX: previously this called p_ref.delete(), a permanent Firestore
    # delete. Any past order referencing this product_id would then have a
    # dangling reference — order history/receipts would show a broken/missing
    # product forever. Soft-delete (is_active=False) instead: the product
    # disappears from buyer browsing (GET /products already filters on
    # is_active == True) but stays intact for existing order records.
    #
    # BUG FIX (audit): availability.py's periodic check_and_pause_products
    # job also flips is_active back to True for any product whose time
    # window is back "in range", using the same is_active field. Without a
    # separate marker, a soft-deleted product with an availability window
    # would silently be resurrected on the buyer feed the next time that
    # job ran. "deleted": True distinguishes a real deletion from a
    # window-based pause so the availability job can skip it.
    p_ref.update({"is_active": False, "deleted": True})
    return {"message": "Product removed from listings"}
