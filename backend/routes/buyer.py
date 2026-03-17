from fastapi import APIRouter, Depends, Query
from database import get_db
from auth_utils import require_buyer, get_current_user
from bson import ObjectId

router = APIRouter()


@router.get("/nearby-merchants")
async def nearby_merchants(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=5),
    current_user=Depends(get_current_user)
):
    db = get_db()
    radius_meters = radius_km * 1000

    cursor = db.users.find({
        "role": "merchant",
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius_meters,
            }
        }
    })
    merchants = await cursor.to_list(length=50)
    return [
        {
            "id": str(m["_id"]),
            "name": m["name"],
            "phone": m.get("phone"),
            "location": m.get("location"),
        }
        for m in merchants
    ]
