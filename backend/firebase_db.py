import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
from dotenv import load_dotenv

load_dotenv()

db = None

def init_firestore():
    global db
    if not firebase_admin._apps:
        # Try environment variable first (for Vercel deployment)
        firebase_creds_json = os.getenv("FIREBASE_CREDENTIALS")
        if firebase_creds_json:
            cred_dict = json.loads(firebase_creds_json)
            cred = credentials.Certificate(cred_dict)
        else:
            # Fall back to file (for local development)
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
            cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Connected to Firebase Firestore")
    return db

def get_db():
    return db
