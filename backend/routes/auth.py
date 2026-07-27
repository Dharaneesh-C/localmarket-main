from fastapi import APIRouter, HTTPException, Depends
from firebase_db import get_db
from schemas import (
    UserRegister,
    UserLogin,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    UpdateFCMToken,
    UpdateLocation,
    MerchantProfileUpdate,
    ToggleFavourite,
    SavedAddress,
)
from auth_utils import hash_password, verify_password, create_access_token, get_current_user, require_buyer, require_merchant
from datetime import datetime, timedelta, timezone
import uuid
import random
from email_service import send_otp_email

router = APIRouter()


def generate_otp():
    return str(random.randint(100000, 999999))


def get_password_reset_or_error(db, email: str):
    reset_doc = db.collection("password_resets").document(email).get()
    if not reset_doc.exists:
        raise HTTPException(status_code=400, detail="No password reset request found. Please request a new OTP.")

    password_reset = reset_doc.to_dict()
    expires_at = password_reset.get("expires_at")
    if not expires_at or expires_at <= datetime.now(timezone.utc):
        db.collection("password_resets").document(email).delete()
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")

    return password_reset


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    db = get_db()
    users = db.collection("users").where("email", "==", data.email).get()
    if not users:
        raise HTTPException(status_code=404, detail="No account found with this email address")

    otp = generate_otp()
    reset_data = {
        "email": data.email,
        "otp": otp,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "verified": False,
    }
    db.collection("password_resets").document(data.email).set(reset_data)

    try:
        send_otp_email(data.email, otp)
    except Exception:
        # Do not leave a usable reset code behind when delivery failed.
        db.collection("password_resets").document(data.email).delete()
        raise HTTPException(status_code=500, detail="Unable to send OTP email. Please try again.")

    return {"message": "OTP sent to your email address"}


@router.post("/verify-otp")
async def verify_otp(data: VerifyOTPRequest):
    db = get_db()
    if not data.otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must contain only digits")
    password_reset = get_password_reset_or_error(db, data.email)

    if password_reset.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if password_reset.get("verified"):
        raise HTTPException(status_code=400, detail="This OTP has already been used. Please request a new one.")

    db.collection("password_resets").document(data.email).update({"verified": True})
    return {"message": "OTP verified successfully"}


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest):
    db = get_db()
    if not data.otp.isdigit():
        raise HTTPException(status_code=400, detail="OTP must contain only digits")
    password_reset = get_password_reset_or_error(db, data.email)

    if password_reset.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    if not password_reset.get("verified"):
        raise HTTPException(status_code=400, detail="Please verify your OTP before resetting your password")

    users = db.collection("users").where("email", "==", data.email).get()
    if not users:
        # The reset request is no longer valid if its account was removed.
        db.collection("password_resets").document(data.email).delete()
        raise HTTPException(status_code=404, detail="No account found with this email address")

    db.collection("users").document(users[0].id).update({"password": hash_password(data.new_password)})
    db.collection("password_resets").document(data.email).delete()
    return {"message": "Password reset successfully"}


def serialize_user(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "phone": user.get("phone"),
        "location": user.get("location"),
        "fcm_token": user.get("fcm_token"),
        # Merchant profile fields
        "bio": user.get("bio"),
        "photo_url": user.get("photo_url"),
        "working_hours": user.get("working_hours"),
        "delivery_time_minutes": user.get("delivery_time_minutes"),
        "rating_avg": user.get("rating_avg", 0.0),
        "rating_count": user.get("rating_count", 0),
        "upi_id": user.get("upi_id"),
        # Buyer favourites
        "favourites": user.get("favourites", []),
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
        "favourites": [],
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


# ─── Merchant: Update Profile ─────────────────────────────────────────────────
@router.put("/merchant-profile")
async def update_merchant_profile(data: MerchantProfileUpdate, current_user=Depends(require_merchant)):
    db = get_db()
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    db.collection("users").document(current_user["id"]).update(update_data)
    return {"message": "Profile updated"}


# ─── Merchant: Get public profile ────────────────────────────────────────────
@router.get("/merchant/{merchant_id}")
async def get_merchant_profile(merchant_id: str):
    db = get_db()
    user_doc = db.collection("users").document(merchant_id).get()
    if not user_doc.exists:
        raise HTTPException(status_code=404, detail="Merchant not found")
    user = user_doc.to_dict()
    if user.get("role") != "merchant":
        raise HTTPException(status_code=404, detail="Not a merchant")
    return {
        "id": user["id"],
        "name": user["name"],
        "phone": user.get("phone"),
        "bio": user.get("bio"),
        "photo_url": user.get("photo_url"),
        "working_hours": user.get("working_hours"),
        "delivery_time_minutes": user.get("delivery_time_minutes"),
        "rating_avg": user.get("rating_avg", 0.0),
        "rating_count": user.get("rating_count", 0),
        "upi_id": user.get("upi_id"),
    }


# ─── Buyer: Toggle Favourite Merchant ────────────────────────────────────────
@router.post("/favourites/toggle")
async def toggle_favourite(data: ToggleFavourite, current_user=Depends(require_buyer)):
    db = get_db()
    favourites = current_user.get("favourites", [])
    ids = [f["merchant_id"] for f in favourites]

    if data.merchant_id in ids:
        # Remove
        favourites = [f for f in favourites if f["merchant_id"] != data.merchant_id]
        action = "removed"
    else:
        # Add
        favourites.append({"merchant_id": data.merchant_id, "merchant_name": data.merchant_name})
        action = "added"

    db.collection("users").document(current_user["id"]).update({"favourites": favourites})
    return {"action": action, "favourites": favourites}


@router.get("/favourites")
async def get_favourites(current_user=Depends(require_buyer)):
    return current_user.get("favourites", [])


# ─── Buyer: Address Book ─────────────────────────────────────────────────────────────
@router.get("/addresses")
async def get_addresses(current_user=Depends(require_buyer)):
    return current_user.get("saved_addresses", [])


@router.post("/addresses")
async def save_address(data: SavedAddress, current_user=Depends(require_buyer)):
    db = get_db()
    addresses = current_user.get("saved_addresses", [])
    # Max 5 saved addresses
    if len(addresses) >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 saved addresses allowed")
    new_address = {
        "id": str(uuid.uuid4())[:8],
        "label": data.label,
        "address_text": data.address_text,
        "lat": data.lat,
        "lng": data.lng,
    }
    addresses.append(new_address)
    db.collection("users").document(current_user["id"]).update({"saved_addresses": addresses})
    return {"addresses": addresses}


@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, current_user=Depends(require_buyer)):
    db = get_db()
    addresses = [a for a in current_user.get("saved_addresses", []) if a["id"] != address_id]
    db.collection("users").document(current_user["id"]).update({"saved_addresses": addresses})
    return {"addresses": addresses}
