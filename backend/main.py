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
from routes.orders import router as orders_router
from routes.reviews import router as reviews_router


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
app.include_router(orders_router, prefix="/api/orders", tags=["Orders"])
app.include_router(reviews_router, prefix="/api/reviews", tags=["Reviews"])


@app.get("/")
async def root():
    return {"message": "NearSell API is running ✅"}



