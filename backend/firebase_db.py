import os
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore

load_dotenv()

db = None


def _init_credentials():
    """Load Firebase credentials from env var or file."""
    # Priority 1: FIREBASE_CREDENTIALS env var
    cred_json = os.getenv("FIREBASE_CREDENTIALS")
    if cred_json:
        try:
            cred_dict = json.loads(cred_json)
            # Fix escaped newlines in private key
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
            return credentials.Certificate(cred_dict)
        except Exception as e:
            print(f"⚠️ Failed to parse FIREBASE_CREDENTIALS: {e}")

    # Priority 2: File on disk
    for path in ["firebase-credentials.json", "service-account.json"]:
        if os.path.exists(path):
            print(f"✅ Loading Firebase from file: {path}")
            return credentials.Certificate(path)

    raise RuntimeError("Firebase credentials not found.")


def _get_or_create_app():
    """Get existing Firebase app or create a new one."""
    if firebase_admin._apps:
        return firebase_admin.get_app()
    cred = _init_credentials()
    return firebase_admin.initialize_app(cred)


def init_firestore():
    global db
    try:
        app = _get_or_create_app()
        db = firestore.client(app=app)
        print("✅ Connected to Firebase Firestore")
    except Exception as e:
        print(f"⚠️ Firestore init failed: {e}")
    return db


def get_db():
    global db
    if db is None:
        init_firestore()
    return db
