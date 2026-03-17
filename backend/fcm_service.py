import firebase_admin
from firebase_admin import credentials, messaging
from config import settings
import os
import json

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    try:
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            _firebase_initialized = True
            print("✅ Firebase initialized")
        else:
            print("⚠️  Firebase credentials not found — FCM push notifications disabled")
    except Exception as e:
        print(f"⚠️  Firebase init error: {e}")


async def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None):
    if not _firebase_initialized:
        return False
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=fcm_token,
        )
        response = messaging.send(message)
        print(f"📲 FCM sent: {response}")
        return True
    except Exception as e:
        print(f"FCM error: {e}")
        return False


async def send_multicast_notification(tokens: list, title: str, body: str, data: dict = None):
    if not _firebase_initialized or not tokens:
        return
    try:
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            tokens=tokens,
        )
        response = messaging.send_each_for_multicast(message)
        print(f"📲 FCM multicast: {response.success_count} sent, {response.failure_count} failed")
        return response
    except Exception as e:
        print(f"FCM multicast error: {e}")


# Initialize on import
init_firebase()
