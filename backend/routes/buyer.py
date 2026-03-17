from fastapi import APIRouter, Depends, Query
from firebase_db import get_db
from auth_utils import get_current_user
import math

router = APIRouter()


def haversine(lon1, lat1, lon2, lat2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


@router.get("/nearby-merchants")
async def nearby_merchants(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=10),
    current_user=Depends(get_current_user)
):
    db = get_db()

    all_merchants = db.collection("users").where("role", "==", "merchant").get()

    result = []

    for m_doc in all_merchants:
        m = m_doc.to_dict()

        m_loc = m.get("location")
        if not m_loc:
            continue

        coords = m_loc.get("coordinates")
        if not coords or len(coords) != 2:
            continue

        m_lng, m_lat = coords

        dist = haversine(lng, lat, m_lng, m_lat)

        if dist <= radius_km:
            result.append({
                "id": m_doc.id,   # ✅ FIXED
                "name": m.get("name"),
                "phone": m.get("phone"),
                "location": m.get("location"),
                "distance_km": round(dist, 2),
            })

    result.sort(key=lambda x: x["distance_km"])

    return result