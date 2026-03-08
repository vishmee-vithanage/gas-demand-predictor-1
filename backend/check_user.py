# backend/check_user.py
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db     = client[os.getenv("DATABASE_NAME", "gas_predictor")]

    print("=" * 50)
    print("USER & PREDICTION MATCH CHECK")
    print("=" * 50)

    # Show ALL users
    print("\n👥 ALL USERS IN DATABASE:")
    users = await db.users.find({}, {"password": 0}).to_list(100)
    for u in users:
        print(f"   ID:    {u['_id']}")
        print(f"   Name:  {u.get('name')}")
        print(f"   Email: {u.get('email')}")
        print(f"   Role:  {u.get('role')}")
        print()

    # Show ALL predictions
    print("\n📊 ALL PREDICTIONS IN DATABASE:")
    preds = await db.gas_usage.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)

    for p in preds:
        user_id = p.get("user_id")
        days    = p.get("days_left")
        dep     = p.get("depletion_date")
        created = p.get("created_at", "")[:19]

        # Try to find matching user
        try:
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user_doc = None

        matched_email = user_doc.get("email") if user_doc else "❌ NO USER FOUND"
        matched_name  = user_doc.get("name")  if user_doc else "❌ NO USER FOUND"

        print(f"   Prediction user_id : {user_id}")
        print(f"   Matched user name  : {matched_name}")
        print(f"   Matched user email : {matched_email}")
        print(f"   Days left          : {days}")
        print(f"   Depletion date     : {dep}")
        print(f"   Created at         : {created}")
        print(f"   Email match OK?    : {'✅ YES' if user_doc else '❌ NO'}")
        print()

    client.close()

asyncio.run(check())