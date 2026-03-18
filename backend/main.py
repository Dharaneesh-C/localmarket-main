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
    import firebase_admin
    cred_env = os.getenv("FIREBASE_CREDENTIALS")
    from firebase_db import db
    return {
        "FIREBASE_CREDENTIALS_set": bool(cred_env),
        "FIREBASE_CREDENTIALS_length": len(cred_env) if cred_env else 0,
        "FIREBASE_CREDENTIALS_starts_with": cred_env[:30] if cred_env else None,
        "firebase_apps_count": len(firebase_admin._apps),
        "db_initialized": db is not None,
    }
