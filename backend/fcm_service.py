from firebase_admin import messaging
from firebase_utils import get_firebase_app

_firebase_initialized = False


def init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    try:
        get_firebase_app()
        _firebase_initialized = True
        print("✅ Firebase messaging initialized")
    except Exception as e:
        print(f"⚠️ Firebase credentials not found — FCM push notifications disabled: {e}")


async def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None):
    if not _firebase_initialized:
        return False
    try:
        message = messaging.Message(
    notification=messaging.Notification(
        title=title,
        body=body,
    ),

    android=messaging.AndroidConfig(
        priority="high",
        notification=messaging.AndroidNotification(
            channel_id="nearsell_notifications",
            sound="default",
        ),
    ),

    data={k: str(v) for k, v in (data or {}).items()},
    token=fcm_token,
)
        response = messaging.send(message)
        print(f"FCM sent: {response}")
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
        print(f"FCM multicast: {response.success_count} sent, {response.failure_count} failed")
        return response
    except Exception as e:
        print(f"FCM multicast error: {e}")


# Safe init — will not crash if credentials are missing
init_firebase()
