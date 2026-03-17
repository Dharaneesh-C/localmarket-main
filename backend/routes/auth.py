from fastapi import APIRouter, HTTPException, Depends
from firebase_db import get_db
from schemas import UserRegister, UserLogin, UpdateFCMToken, UpdateLocation
from auth_utils import hash_password, verify_password, create_access_token, get_current_user
from datetime import datetime
import uuid

router = APIRouter()


def serialize_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user.get("phone"),
        "location": user.get("location"),
        "fcm_token": user.get("fcm_token"),
    }


@router.post("/register", status_code=201)
async def register(data: UserRegister):
    db = get_db()
    existing = db.collection("users").where("email", "==", data.email).get()
    if len(existing) > 0:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "role": data.role,
        "phone": data.phone,
        "location": data.location.model_dump() if data.location else None,
        "fcm_token": data.fcm_token,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("users").document(user_id).set(user_doc)

    token = create_access_token({"sub": user_id, "role": data.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user_id,
        "role": data.role,
        "name": data.name,
    }


@router.post("/login")
async def login(data: UserLogin):
    db = get_db()
    users = db.collection("users").where("email", "==", data.email).get()
    if not users:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = users[0].to_dict()
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": user["id"],
        "role": user["role"],
        "name": user["name"],
    }


@router.get("/me")
async def get_me(current_user=Depends(get_current_user)):
    return serialize_user(current_user)


@router.put("/fcm-token")
async def update_fcm_token(data: UpdateFCMToken, current_user=Depends(get_current_user)):
    db = get_db()
    db.collection("users").document(current_user["id"]).update({"fcm_token": data.fcm_token})
    return {"message": "FCM token updated"}


@router.put("/location")
async def update_location(data: UpdateLocation, current_user=Depends(get_current_user)):
    db = get_db()
    db.collection("users").document(current_user["id"]).update(
        {"location": data.location.model_dump()}
    )
    return {"message": "Location updated"}
