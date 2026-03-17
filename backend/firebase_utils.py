import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials

from config import settings


@lru_cache(maxsize=1)
def _load_credentials():
    # Priority 1: FIREBASE_CREDENTIALS env var (JSON string)
    firebase_creds_json = settings.FIREBASE_CREDENTIALS or os.getenv("FIREBASE_CREDENTIALS")
    if firebase_creds_json:
        try:
            # Fix mangled \n in private_key (common Vercel copy-paste issue)
            cred_dict = json.loads(firebase_creds_json)
            if "private_key" in cred_dict:
                cred_dict["private_key"] = cred_dict["private_key"].replace("\\n", "\n")
            return credentials.Certificate(cred_dict)
        except Exception as e:
            print(f"⚠️ Failed to parse FIREBASE_CREDENTIALS env var: {e}")

    # Priority 2: FIREBASE_CREDENTIALS_PATH (local file)
    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and os.path.exists(cred_path):
        return credentials.Certificate(cred_path)

    raise RuntimeError(
        "Firebase credentials not found. Set FIREBASE_CREDENTIALS env var in Vercel dashboard."
    )


def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred = _load_credentials()
    return firebase_admin.initialize_app(cred)
