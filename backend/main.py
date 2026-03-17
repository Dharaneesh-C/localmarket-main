from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from firebase_db import init_firestore
from routes import auth, merchant, products
from websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firestore()
    yield


app = FastAPI(title="NearSell API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(merchant.router, prefix="/api/merchant", tags=["Merchant"])
app.include_router(buyer.router, prefix="/api/buyer", tags=["Buyer"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)


@app.get("/")
async def root():
    return {"message": "NearSell API is running"}
