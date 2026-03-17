"""
Run this script to generate the correct FIREBASE_CREDENTIALS value for Vercel.
Usage: python generate_firebase_env.py
"""
import json

with open("firebase-credentials.json", "r") as f:
    creds = json.load(f)

# json.dumps produces a perfectly safe single-line JSON string
# with all \n in private_key properly escaped as \\n
output = json.dumps(creds, separators=(",", ":"))

print("\n✅ Copy the line below and paste it as FIREBASE_CREDENTIALS in Vercel:\n")
print(output)
print("\n✅ Done! Make sure to copy the ENTIRE line above.\n")
