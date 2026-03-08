# backend/debug_email.py
# Check what's in the database for your user

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def debug():
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    db     = client[os.getenv("DATABASE_NAME", "gas_predictor")]

    print("=" * 50)
    print("DATABASE DEBUG CHECK")
    print("=" * 50)

    # Check all users
    print("\n👥 REGISTERED USERS:")
    users = await db.users.find({}, {"password": 0}).to_list(100)
    if not users:
        print("   ❌ No users found in database!")
    for u in users:
        print(f"   - {u.get('name')} | {u.get('email')} | role: {u.get('role')}")

    print("\n📊 GAS PREDICTIONS:")
    preds = await db.gas_usage.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    if not preds:
        print("   ❌ No predictions found in database!")
        print("   → This means the predict button did not save to DB")
    for p in preds:
        print(f"   - user_id: {p.get('user_id')}")
        print(f"     depletion_date: {p.get('depletion_date')}")
        print(f"     days_left: {p.get('days_left')}")
        print(f"     created_at: {p.get('created_at')}")
        print()

    print("\n📧 ALERT LOGS:")
    logs = await db.alert_logs.find({}, {"_id": 0}).to_list(20)
    if not logs:
        print("   No alerts sent yet")
    for l in logs:
        print(f"   - {l.get('email')} | {l.get('subject')} | sent: {l.get('sent_at')}")

    client.close()

asyncio.run(debug())