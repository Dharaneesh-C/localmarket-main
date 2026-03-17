import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials

from config import settings


@lru_cache(maxsize=1)
def _load_credentials():
    firebase_creds_json = settings.FIREBASE_CREDENTIALS or os.getenv("FIREBASE_CREDENTIALS")
    if firebase_creds_json:
        return credentials.Certificate(json.loads(firebase_creds_json))

    cred_path = settings.FIREBASE_CREDENTIALS_PATH
    if cred_path and os.path.exists(cred_path):
        return credentials.Certificate(cred_path)

    raise RuntimeError(
        "Firebase credentials are not configured. Set FIREBASE_CREDENTIALS or "
        "FIREBASE_CREDENTIALS_PATH."
    )


def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    cred = _load_credentials()
    return firebase_admin.initialize_app(cred)
