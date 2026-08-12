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
        # DATA-ONLY payload — do NOT add a `notification=` block here.
        #
        # WHY: when a message contains a `notification` field, Android's Play
        # Services intercepts it directly and displays it using the system's
        # default channel/sound WITHOUT reliably calling onMessageReceived() in
        # MyFirebaseMessagingService while the app is backgrounded/killed. That
        # bypasses the custom notification channel (with the attached arrival
        # MP3) that the Android app sets up, and causes silent/inconsistent
        # notifications. Data-only messages always route through
        # onMessageReceived(), on foreground AND background/killed, which is
        # required for the custom sound + tap intent to work.
        payload = {k: str(v) for k, v in (data or {}).items()}
        payload["title"] = title
        payload["body"] = body

        message = messaging.Message(
            data=payload,
            android=messaging.AndroidConfig(
                priority="high",
            ),
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
        # Same data-only fix as send_push_notification — see comment above.
        payload = {k: str(v) for k, v in (data or {}).items()}
        payload["title"] = title
        payload["body"] = body

        message = messaging.MulticastMessage(
            data=payload,
            tokens=tokens,
            android=messaging.AndroidConfig(
                priority="high",
            ),
        )
        response = messaging.send_each_for_multicast(message)
        print(f"FCM multicast: {response.success_count} sent, {response.failure_count} failed")
        return response
    except Exception as e:
        print(f"FCM multicast error: {e}")


# Safe init — will not crash if credentials are missing
init_firebase()
