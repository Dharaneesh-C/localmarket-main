import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials

from config import settings


@lru_cache(maxsize=1)
def _load_credentials():
    # Priority 1: FIREBASE_CREDENTIALS env var (JSON string from Vercel)
    firebase_creds_json = settings.FIREBASE_CREDENTIALS or os.getenv("FIREBASE_CREDENTIALS")
    if firebase_creds_json:
        try:
            cred_dict = json.loads(firebase_creds_json)
            # Fix mangled \n in private_key — Vercel env vars escape newlines
            if "private_key" in cred_dict:
                pk = cred_dict["private_key"]
                # Handle both \\n (double escaped) and literal \n text
                pk = pk.replace("\\n", "\n")
                # Ensure BEGIN/END markers are on their own lines
                if "-----BEGIN PRIVATE KEY-----" in pk and "\n" not in pk.split("-----BEGIN PRIVATE KEY-----")[0]:
                    pk = pk.replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
                if "-----END PRIVATE KEY-----" in pk:
                    pk = pk.replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----")
                cred_dict["private_key"] = pk
            return credentials.Certificate(cred_dict)
        except Exception as e:
            print(f"⚠️ FIREBASE_CREDENTIALS env var parse failed: {e}")

    # Priority 2: firebase-credentials.json file (local dev)
    for path in [
        settings.FIREBASE_CREDENTIALS_PATH,
        "firebase-credentials.json",
        "/var/task/firebase-credentials.json",
    ]:
        if path and os.path.exists(path):
            print(f"✅ Loading Firebase credentials from file: {path}")
            return credentials.Certificate(path)

    raise RuntimeError(
        "Firebase credentials not found.\n"
        "For Vercel: set FIREBASE_CREDENTIALS env var as minified JSON.\n"
        "For local: ensure firebase-credentials.json exists in backend/"
    )


def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    cred = _load_credentials()
    return firebase_admin.initialize_app(cred)
