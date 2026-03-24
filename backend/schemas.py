from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    merchant = "merchant"
    buyer = "buyer"


class GeoLocation(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]


class DeliveryArea(BaseModel):
    type: str = "Polygon"
    coordinates: List[List[List[float]]]  # GeoJSON polygon


# ─── Auth ──────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    phone: Optional[str] = None
    location: Optional[GeoLocation] = None
    fcm_token: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    role: str
    name: str


class UpdateFCMToken(BaseModel):
    fcm_token: str


class UpdateLocation(BaseModel):
    location: GeoLocation


# ─── Products ──────────────────────────────────────────
class ProductCategory(str, Enum):
    vegetables = "Vegetables & Fruits"
    dairy = "Dairy"
    handmade = "Handmade Goods"
    food = "Cooked Food"
    other = "Other"


class ProductCreate(BaseModel):
    title: str
    description: str
    price: float
    unit: str = "piece"
    category: ProductCategory
    image_url: Optional[str] = None
    delivery_area: DeliveryArea
    merchant_location: GeoLocation
    stock: Optional[int] = None
    delivery_time_minutes: Optional[int] = None
    available_from: Optional[str] = None   # "06:00" 24h format IST
    available_until: Optional[str] = None  # "10:00" 24h format IST


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[ProductCategory] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    stock: Optional[int] = None
    available_from: Optional[str] = None
    available_until: Optional[str] = None


# ─── Ratings ───────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    order_id: str
    product_id: str
    merchant_id: str
    rating: int  # 1-5
    comment: Optional[str] = None


class ProductResponse(BaseModel):
    id: str
    title: str
    description: str
    price: float
    unit: str
    category: str
    image_url: Optional[str]
    merchant_id: str
    merchant_name: str
    merchant_phone: Optional[str]
    merchant_location: GeoLocation
    delivery_area: DeliveryArea
    is_active: bool
    created_at: datetime
    distance_km: Optional[float] = None


# ─── Orders ───────────────────────────────────────────
class OrderStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    completed = "completed"
    cancelled = "cancelled"


class OrderCreate(BaseModel):
    product_id: str
    product_title: str
    quantity: float
    unit: str
    total_price: float
    merchant_id: str
    merchant_name: str
    merchant_upi_id: Optional[str] = None
    buyer_location: Optional[GeoLocation] = None
    note: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


# ─── Merchant Profile ────────────────────────────────────────────────────────
class MerchantProfileUpdate(BaseModel):
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    working_hours: Optional[str] = None
    delivery_time_minutes: Optional[int] = None
    upi_id: Optional[str] = None  # e.g. merchant@upi


# ─── Favourites ───────────────────────────────────────────────────────────────
class ToggleFavourite(BaseModel):
    merchant_id: str
    merchant_name: str


# ─── Address Book ───────────────────────────────────────────────────────────────
class SavedAddress(BaseModel):
    label: str          # e.g. "Home", "Work"
    address_text: str   # human readable
    lat: float
    lng: float


# ─── COD Confirmation ─────────────────────────────────────────────────────────
class CODConfirm(BaseModel):
    order_id: str


# ─── Notifications ─────────────────────────────────────
class NotificationPayload(BaseModel):
    type: str  # "new_product", "product_update"
    product_id: str
    title: str
    body: str
    merchant_name: str
    merchant_location: dict
    image_url: Optional[str] = None
