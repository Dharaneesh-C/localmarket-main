from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from firebase_db import init_firestore

# Explicit imports — required for Vercel serverless Python runtime
from routes.auth import router as auth_router
from routes.merchant import router as merchant_router
from routes.buyer import router as buyer_router
from routes.products import router as products_router
from routes.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        init_firestore()
    except Exception as e:
        print(f"⚠️ Firestore init warning: {e}")
    yield


app = FastAPI(
    title="NearSell API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
cors_origins = (
    [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
    if settings.CORS_ORIGINS != "*"
    else ["*"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(merchant_router, prefix="/api/merchant", tags=["Merchant"])
app.include_router(buyer_router, prefix="/api/buyer", tags=["Buyer"])
app.include_router(products_router, prefix="/api/products", tags=["Products"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["Notifications"])


@app.get("/")
async def root():
    return {"message": "NearSell API is running ✅"}


@app.get("/debug/firebase")
async def debug_firebase():
    import os
    import json
    import firebase_admin
    from firebase_admin import credentials, firestore

    cred_env = os.getenv("FIREBASE_CREDENTIALS")
    result = {
        "FIREBASE_CREDENTIALS_set": bool(cred_env),
        "FIREBASE_CREDENTIALS_length": len(cred_env) if cred_env else 0,
        "firebase_apps_count": len(firebase_admin._apps),
        "db_initialized": False,
        "error": None,
        "private_key_preview": None,
    }

    try:
        cred_dict = json.loads(cred_env)
        pk = cred_dict.get("private_key", "")
        # Show first and last 40 chars of private key for diagnosis
        result["private_key_preview"] = pk[:40] + " ... " + pk[-40:]
        result["private_key_has_newlines"] = "\n" in pk
        result["private_key_has_escaped_newlines"] = "\\n" in pk

        # Fix and attempt init
        pk = pk.replace("\\n", "\n")
        cred_dict["private_key"] = pk

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_dict)
            firebase_admin.initialize_app(cred)

        db_client = firestore.client()
        result["db_initialized"] = db_client is not None
        result["firebase_apps_count"] = len(firebase_admin._apps)
        result["status"] = "SUCCESS"
    except Exception as e:
        result["error"] = str(e)
        result["status"] = "FAILED"

    return result
