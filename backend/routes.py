# backend/routes.py
from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from typing import List
import os
from jose import jwt
from passlib.context import CryptContext
from bson import ObjectId
from collections import defaultdict

from backend.notifications import (
    send_email,
    build_household_email,
    build_station_email,
)
from backend.models import (
    UserRegister, UserLogin,
    HouseholdInput,
)
from backend.database import get_db
from backend.agents import (
    orchestrate_household_prediction,
)

router  = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET  = os.getenv("SECRET_KEY", "secret")
ALGO    = os.getenv("ALGORITHM", "HS256")

# ── Hardcoded admin credentials ───────────────────────
ADMIN_EMAIL    = "admin@gasstation.com"
ADMIN_PASSWORD = "admin1234"

# ── Helpers ──────────────────────────────────────────
def hash_password(p):   return pwd_ctx.hash(p)
def verify_password(plain, hashed): return pwd_ctx.verify(plain, hashed)

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=10080)
    return jwt.encode(payload, SECRET, algorithm=ALGO)

# ── Health ────────────────────────────────────────────
@router.get("/")
async def root():
    return {"message": "Gas Demand Predictor API is running ✅", "version": "2.0"}

@router.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# ── Auth ──────────────────────────────────────────────
@router.post("/auth/register")
async def register(user: UserRegister):
    db = get_db()
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(400, "Email already registered")

    new_user = {
        "name":       user.name,
        "email":      user.email,
        "password":   hash_password(user.password),
        "role":       "user",          # everyone is a household user
        "created_at": datetime.now().isoformat(),
    }
    result = await db.users.insert_one(new_user)
    token  = create_token({"sub": str(result.inserted_id), "role": "user"})
    return {
        "token": token,
        "user":  {
            "id":    str(result.inserted_id),
            "name":  user.name,
            "email": user.email,
            "role":  "user",
        }
    }

@router.post("/auth/login")
async def login(creds: dict):
    # ── Check hardcoded admin first ───────────────────
    if (creds["email"]    == ADMIN_EMAIL and
        creds["password"] == ADMIN_PASSWORD):
        token = create_token({"sub": "admin", "role": "admin"})
        return {
            "token": token,
            "user":  {
                "id":    "admin",
                "name":  "Station Admin",
                "email": ADMIN_EMAIL,
                "role":  "admin",
            }
        }

    # ── Normal user login ─────────────────────────────
    db   = get_db()
    user = await db.users.find_one({"email": creds["email"]})
    if not user or not verify_password(creds["password"], user["password"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_token({"sub": str(user["_id"]), "role": user["role"]})
    return {
        "token": token,
        "user":  {
            "id":    str(user["_id"]),
            "name":  user["name"],
            "email": user["email"],
            "role":  user["role"],
        }
    }

# ── Household ─────────────────────────────────────────
@router.post("/household/predict")
async def predict_household(data: HouseholdInput):
    db     = get_db()
    result = orchestrate_household_prediction(data.dict())

    record = {
        **data.dict(),
        **result,
        "created_at": datetime.now().isoformat(),
    }
    await db.gas_usage.insert_one(record)

    # Send email if gas is low
    try:
        user_doc = await db.users.find_one({"_id": ObjectId(data.user_id)})
        if user_doc and result.get("days_left", 99) <= 7:
            html = build_household_email(
                name           = user_doc["name"],
                days_left      = result["days_left"],
                depletion_date = result["depletion_date"],
                cylinder_size  = result["cylinder_size_kg"],
                alert_message  = result["alert_message"],
            )
            send_email(
                user_doc["email"],
                f"⛽ Gas Alert — {result['days_left']} days remaining!",
                html,
            )
    except Exception as e:
        print(f"Email skipped: {e}")

    return result

@router.get("/household/history/{user_id}")
async def household_history(user_id: str):
    db   = get_db()
    docs = await db.gas_usage.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    return {"history": docs}

# ── Station dashboard ─────────────────────────────────
@router.get("/station/dashboard")
async def station_dashboard():
    """
    Builds the station demand forecast purely from
    registered users' depletion dates. No ML synthetic data.
    """
    db    = get_db()
    today = datetime.now().date()

    # ── Get latest prediction per user ───────────────
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id":    "$user_id",
            "latest": {"$first": "$$ROOT"},
        }},
    ]
    records = await db.gas_usage.aggregate(pipeline).to_list(1000)

    # ── Build 7-day demand map ────────────────────────
    # demand_map[date_str] = list of user records depleting that day
    demand_map = defaultdict(list)

    user_rows  = []   # for the user table

    for rec in records:
        latest     = rec["latest"]
        user_id    = rec["_id"]
        depletion  = latest.get("depletion_date", "")

        if not depletion:
            continue

        try:
            dep_date  = datetime.strptime(depletion, "%Y-%m-%d").date()
            days_left = (dep_date - today).days
        except Exception:
            continue

        # Fetch user name & email
        try:
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            user_doc = None

        user_name  = user_doc["name"]  if user_doc else "Unknown"
        user_email = user_doc["email"] if user_doc else ""

        # Urgency level
        if days_left <= 1:
            urgency = "critical"
        elif days_left <= 3:
            urgency = "urgent"
        elif days_left <= 7:
            urgency = "warning"
        else:
            urgency = "ok"

        user_rows.append({
            "user_name":      user_name,
            "user_email":     user_email,
            "days_left":      days_left,
            "depletion_date": depletion,
            "cylinder_size":  latest.get("cylinder_size_kg", 12.5),
            "urgency":        urgency,
        })

        # Only count users depleting within next 30 days
        if 0 <= days_left <= 30:
            demand_map[depletion].append({
                "user_name": user_name,
                "cylinder_size": latest.get("cylinder_size_kg", 12.5),
            })

    # ── Build 7-day forecast list ─────────────────────
    forecast = []
    for i in range(7):
        day        = today + timedelta(days=i)
        day_str    = day.strftime("%Y-%m-%d")
        day_label  = day.strftime("%A") if i > 0 else "Today"
        users_dep  = demand_map.get(day_str, [])
        cylinders  = len(users_dep)   # 1 cylinder per user

        forecast.append({
            "date":            day_str,
            "day_label":       day_label,
            "cylinders_needed": cylinders,
            "users_depleting": [u["user_name"] for u in users_dep],
        })

    # ── Summary stats ─────────────────────────────────
    total_users      = len(user_rows)
    critical_count   = sum(1 for u in user_rows if u["urgency"] == "critical")
    urgent_count     = sum(1 for u in user_rows if u["urgency"] == "urgent")
    warning_count    = sum(1 for u in user_rows if u["urgency"] == "warning")
    tomorrow_str     = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow_demand  = len(demand_map.get(tomorrow_str, []))
    today_demand     = len(demand_map.get(today.strftime("%Y-%m-%d"), []))

    # ── Alert message ──────────────────────────────────
    if critical_count > 0:
        alert = f"🚨 {critical_count} customer(s) run out TODAY or TOMORROW — prepare stock now!"
    elif urgent_count > 0:
        alert = f"⚠️ {urgent_count} customer(s) will need gas within 3 days."
    elif total_users == 0:
        alert = "ℹ️ No registered users yet. Demand data will appear as users sign up."
    else:
        alert = f"✅ Demand is normal. {warning_count} customer(s) will need gas within 7 days."

    # Sort user rows: most urgent first
    user_rows.sort(key=lambda x: x["days_left"])

    return {
        "total_registered_users": total_users,
        "today_demand":           today_demand,
        "tomorrow_demand":        tomorrow_demand,
        "critical_count":         critical_count,
        "urgent_count":           urgent_count,
        "warning_count":          warning_count,
        "alert_message":          alert,
        "forecast":               forecast,
        "user_list":              user_rows,
    }

# ── Station email report ──────────────────────────────
@router.post("/station/send-report")
async def send_station_report():
    """Manually trigger station demand email report"""
    db   = get_db()
    data = await station_dashboard()

    forecast_for_email = [
        {
            "day_label":      f["day_label"],
            "date":           f["date"],
            "predicted_sales": f["cylinders_needed"],
        }
        for f in data["forecast"]
    ]

    html = build_station_email(
        station_id    = "Main Station",
        station_type  = "Primary",
        avg_daily     = sum(f["cylinders_needed"] for f in data["forecast"]) / 7,
        total_7_day   = sum(f["cylinders_needed"] for f in data["forecast"]),
        forecast      = forecast_for_email,
        alert_message = data["alert_message"],
    )
    sent = send_email(
        os.getenv("SMTP_EMAIL", ""),
        "📊 Station Daily Demand Report",
        html,
    )
    return {"sent": sent}

# ── Stats ─────────────────────────────────────────────
@router.get("/stats")
async def get_stats():
    db = get_db()
    total_users       = await db.users.count_documents({})
    total_predictions = await db.gas_usage.count_documents({})
    return {
        "total_users":       total_users,
        "total_predictions": total_predictions,
        "last_updated":      datetime.now().isoformat(),
    }