import os
from dotenv import load_dotenv
from firebase_admin import firestore
from firebase_utils import get_firebase_app

load_dotenv()

db = None


def init_firestore():
    global db
    try:
        app = get_firebase_app()
        db = firestore.client(app=app)
        print("✅ Connected to Firebase Firestore")
    except Exception as e:
        print(f"⚠️ Firestore init failed: {e}")
    return db


def get_db():
    global db
    # Lazy init — if lifespan didn't run (Vercel cold start), init now
    if db is None:
        init_firestore()
    return db
