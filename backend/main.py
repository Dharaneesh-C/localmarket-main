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
from routes.admin import router as admin_router
from routes.analytics import router as analytics_router
from routes.chat import router as chat_router
from routes.availability import router as availability_router
from routes.bulk import router as bulk_router
from routes.reminders import router as reminders_router


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
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(analytics_router, prefix="/api/merchant", tags=["Analytics"])
app.include_router(chat_router, prefix="/api/orders", tags=["Chat"])
app.include_router(availability_router, prefix="/api/products", tags=["Availability"])
app.include_router(bulk_router, prefix="/api/products", tags=["Bulk"])
app.include_router(reminders_router, prefix="/api/reminders", tags=["Reminders"])


@app.get("/")
async def root():
    return {"message": "NearSell API is running ✅"}



