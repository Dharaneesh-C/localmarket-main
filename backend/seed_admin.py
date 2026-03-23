"""
Run this script ONCE to create the admin account in Firestore.

Usage (from the backend folder):
  python seed_admin.py

It will create the user if not exists, or update the password if it does.
Safe to run multiple times — idempotent.
"""

import os
import sys
import uuid
from datetime import datetime

# Load env
from dotenv import load_dotenv
load_dotenv()

# Init Firebase
from firebase_db import init_firestore, get_db
init_firestore()

import bcrypt

ADMIN_EMAIL    = "dharineeshdharineesh54@gmail.com"
ADMIN_PASSWORD = "dharangayou@04"
ADMIN_NAME     = "Admin"
ADMIN_ROLE     = "buyer"   # role must be "buyer" or "merchant" for JWT to work;
                            # admin access is purely email-based in admin.py


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed():
    db = get_db()

    # Check if already exists
    existing = db.collection("users").where("email", "==", ADMIN_EMAIL).get()

    if existing:
        user_id = existing[0].id
        # Update password to make sure it matches
        db.collection("users").document(user_id).update({
            "password": hash_password(ADMIN_PASSWORD),
        })
        print(f"✅ Admin account already exists — password updated.")
        print(f"   ID    : {user_id}")
        print(f"   Email : {ADMIN_EMAIL}")
    else:
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "name": ADMIN_NAME,
            "email": ADMIN_EMAIL,
            "password": hash_password(ADMIN_PASSWORD),
            "role": ADMIN_ROLE,
            "phone": None,
            "location": None,
            "fcm_token": None,
            "favourites": [],
            "created_at": datetime.utcnow().isoformat(),
        }
        db.collection("users").document(user_id).set(user_doc)
        print(f"✅ Admin account created successfully!")
        print(f"   ID    : {user_id}")
        print(f"   Email : {ADMIN_EMAIL}")

    print(f"\n🔑 Login at: /  →  Email: {ADMIN_EMAIL}")
    print(f"   After login, navigate to /admin to access the dashboard.")


if __name__ == "__main__":
    seed()
