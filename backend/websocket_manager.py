from fastapi import WebSocket
from typing import Dict
import json


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"🔌 WebSocket connected: {user_id} | Total: {len(self.active_connections)}")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"❌ WebSocket disconnected: {user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.active_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
                return True
            except Exception:
                self.disconnect(user_id)
        return False

    async def broadcast_to_users(self, user_ids: list, message: dict):
        results = []
        for uid in user_ids:
            sent = await self.send_to_user(uid, message)
            results.append({"user_id": uid, "sent": sent})
        return results

    def get_connected_users(self) -> list:
        return list(self.active_connections.keys())


manager = ConnectionManager()
