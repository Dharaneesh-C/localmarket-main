import json
import os

import firebase_admin
from firebase_admin import credentials


def _load_credentials():
    """Load Firebase credentials — no caching so cold starts always retry."""
    cred_json = os.getenv("FIREBASE_CREDENTIALS")
    if cred_json:
        try:
            cred_dict = json.loads(cred_json)
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
            return credentials.Certificate(cred_dict)
        except Exception as e:
            print(f"⚠️ FIREBASE_CREDENTIALS parse failed: {e}")

    for path in ["firebase-credentials.json", "service-account.json"]:
        if os.path.exists(path):
            print(f"✅ Loading Firebase from file: {path}")
            return credentials.Certificate(path)

    raise RuntimeError("Firebase credentials not found.")


def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    cred = _load_credentials()
    return firebase_admin.initialize_app(cred)
