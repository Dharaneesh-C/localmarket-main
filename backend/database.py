from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient = None
db = None


async def connect_db():
    global client, db
    try:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
        db = client[settings.DB_NAME]
        # Force a connection attempt (raises early if invalid)
        await client.admin.command("ping")
        print(f"✅ Connected to MongoDB: {settings.DB_NAME}")

        # Create indexes
        await db.users.create_index("email", unique=True)
        await db.products.create_index([("location", "2dsphere")])
        await db.users.create_index([("location", "2dsphere")])

    except Exception as e:
        print("❌ Failed to connect to MongoDB")
        print(f"MONGODB_URL={settings.MONGODB_URL}")
        print(f"Error: {e}")
        raise


async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")


def get_db():
    return db
