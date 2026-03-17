from dotenv import load_dotenv
from firebase_admin import firestore

from firebase_utils import get_firebase_app

load_dotenv()

db = None


def init_firestore():
    global db
    app = get_firebase_app()
    db = firestore.client(app=app)
    print("Connected to Firebase Firestore")
    return db


def get_db():
    return db
