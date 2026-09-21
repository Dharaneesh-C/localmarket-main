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

ADMIN_EMAIL    = "nearsell.team@gmail.com"
ADMIN_PASSWORD = "nearsell@004"
ADMIN_NAME     = "Admin"
ADMIN_ROLE     = "buyer"   # role must be "buyer" or "merchant" for JWT to work;
                            # admin access is purely email-based in admin.py

# Old admin account(s) to remove — deleting these means they lose admin
# access AND can no longer log in as this user at all (the whole account
# is deleted, not just admin rights).
OLD_ADMIN_EMAILS = [
    "dharineeshdharineesh54@gmail.com",
]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def seed():
    db = get_db()

    # Remove the old admin account(s) first, so only the new one can ever
    # log in / reach /admin going forward.
    for old_email in OLD_ADMIN_EMAILS:
        old_users = db.collection("users").where("email", "==", old_email).get()
        for u in old_users:
            u.reference.delete()
            print(f"🗑️  Deleted old admin account: {old_email} (id: {u.id})")

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
