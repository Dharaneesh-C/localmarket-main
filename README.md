# 🛒 LocalMart — Hyperlocal Merchant Platform

A full-stack platform where merchants post products and notify nearby buyers in real-time — like Swiggy, but for independent door-to-door sellers.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js + Material UI |
| Maps | Google Maps API (DrawingManager + Directions) |
| Real-time | WebSocket (Socket.io-style via FastAPI) |
| Backend | FastAPI (Python) |
| Database | MongoDB (with GeoJSON 2dsphere indexes) |
| Auth | JWT (jose + bcrypt) |
| Push Notifications | Firebase Cloud Messaging (FCM) |

---

## 📁 Project Structure

```
localmart/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── config.py                # Environment settings
│   ├── schemas.py               # Pydantic request/response models
│   ├── auth_utils.py            # JWT helpers, password hashing
│   ├── websocket_manager.py     # WebSocket connection manager
│   ├── fcm_service.py           # Firebase push notifications
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py              # Register, login, /me
│       ├── products.py          # CRUD + geo-query + notifications
│       ├── merchant.py          # Merchant dashboard stats
│       └── buyer.py             # Nearby merchants query
│
└── frontend/
    ├── public/
    │   ├── index.html
    │   └── firebase-messaging-sw.js   # Background FCM handler
    ├── src/
    │   ├── App.js               # Router + providers
    │   ├── index.js
    │   ├── context/
    │   │   ├── AuthContext.js         # Auth state (login/logout)
    │   │   └── NotificationContext.js # WebSocket + notification state
    │   ├── hooks/
    │   │   └── useWebSocket.js        # Auto-reconnecting WS hook
    │   ├── utils/
    │   │   ├── api.js                 # All Axios API calls
    │   │   ├── firebase.js            # Firebase/FCM setup
    │   │   └── theme.js               # MUI custom theme
    │   ├── components/
    │   │   ├── Navbar.js              # Top nav + notifications drawer
    │   │   └── AreaSelector.js        # Google Maps polygon drawing
    │   └── pages/
    │       ├── AuthPage.js            # Login + Register
    │       ├── MerchantPage.js        # Merchant dashboard
    │       └── BuyerPage.js           # Buyer feed + map
    ├── package.json
    └── .env.example
```

---

## 🚀 Setup Instructions

### Step 1 — Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Google Maps API key (with Maps JS + Drawing + Directions APIs enabled)
- Firebase project (for push notifications)

---

### Step 2 — Backend Setup

```bash
cd localmart/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in your values

# Start the server
uvicorn main:app --reload --port 8000
```

Your backend runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

### Step 3 — Frontend Setup

```bash
cd localmart/frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and fill in your API keys

# Start the dev server
npm start
```

Your frontend runs at: http://localhost:3000

---

### Step 4 — MongoDB Setup

MongoDB needs a **2dsphere** index for geospatial queries. These are created automatically when the backend starts. If you're using MongoDB Atlas, make sure your cluster allows connections from your IP.

```
MongoDB URI (local):   mongodb://localhost:27017
MongoDB URI (Atlas):   mongodb+srv://<user>:<pass>@cluster.mongodb.net/localmart
```

---

### Step 5 — Google Maps API Setup

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable these APIs:
   - Maps JavaScript API
   - Drawing Library
   - Directions API
   - Geocoding API
4. Create an API key and add it to both `.env` files

---

### Step 6 — Firebase Setup (Push Notifications)

1. Go to https://console.firebase.google.com
2. Create a new project
3. Add a Web app → copy config to `frontend/.env`
4. Go to Project Settings → Service Accounts → Generate new private key
5. Save as `backend/firebase-credentials.json`
6. Go to Project Settings → Cloud Messaging → Generate VAPID key
7. Add VAPID key to `frontend/.env`

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user (merchant or buyer) |
| POST | /api/auth/login | Login and get JWT token |
| GET | /api/auth/me | Get current user profile |
| PUT | /api/auth/fcm-token | Update FCM push token |
| PUT | /api/auth/location | Update user location |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/products | Create product (merchant only) |
| GET | /api/products/nearby?lat=&lng= | Get products in buyer's area |
| GET | /api/products/merchant/my-products | Get merchant's own products |
| PUT | /api/products/{id} | Update product |
| DELETE | /api/products/{id} | Delete product |

### WebSocket
```
ws://localhost:8000/ws/{user_id}
```
Buyers connect here to receive real-time product notifications.

---

## 🔄 How Notifications Work

```
Merchant posts product
        ↓
Backend finds all buyers whose location is inside the delivery polygon
        ↓
    ┌───────────────────────────┐
    │                           │
    ↓                           ↓
WebSocket (real-time)      FCM Push (background)
  → active browser users    → offline / closed browser users
```

---

## 🗺️ How the Map Works

**Merchant side:**
1. Merchant clicks map to pin their exact location
2. Merchant draws a polygon (delivery area) using the Drawing Manager
3. The polygon is stored as a GeoJSON Polygon in MongoDB

**Buyer side:**
1. Buyer's location is auto-detected via browser geolocation
2. MongoDB `$geoIntersects` query finds products whose delivery polygon contains the buyer's point
3. Products are shown sorted by distance
4. "Get Directions" opens Google Maps navigation to the merchant

---

## 🛠️ Environment Variables

### Backend `.env`
```
MONGODB_URL=mongodb://localhost:27017
DB_NAME=localmart
SECRET_KEY=your-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=1440
FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
GOOGLE_MAPS_API_KEY=your-key
```

### Frontend `.env`
```
REACT_APP_GOOGLE_MAPS_API_KEY=your-key
REACT_APP_FIREBASE_API_KEY=your-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=000000000000
REACT_APP_FIREBASE_APP_ID=1:000:web:xxxxx
REACT_APP_FIREBASE_VAPID_KEY=your-vapid-key
```

---

## 🚢 Deployment

**Frontend** → Vercel
```bash
npm run build
# Deploy /build folder to Vercel
```

**Backend** → Railway or Render
```bash
# Set all env variables in Railway/Render dashboard
# Start command: uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Database** → MongoDB Atlas (free tier available)
