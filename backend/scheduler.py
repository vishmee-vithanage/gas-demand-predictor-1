# backend/scheduler.py
# Runs daily checks and sends email alerts automatically

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta
from backend.notifications import send_email, build_household_email
from backend.database import get_db

scheduler = AsyncIOScheduler()


async def check_all_households():
    """
    Runs every day at 8 AM.
    Checks every user's latest prediction and sends
    email alert at exactly 5, 3, and 1 days remaining.
    """
    db = get_db()
    if db is None:
        print("⚠️  Scheduler: database not ready")
        return

    print(f"\n⏰ Daily check at {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    today = datetime.now().date()

    # Get the most recent prediction for every user
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id":    "$user_id",
            "latest": {"$first": "$$ROOT"},
        }},
    ]

    try:
        records = await db.gas_usage.aggregate(pipeline).to_list(1000)
    except Exception as e:
        print(f"❌ Scheduler DB error: {e}")
        return

    print(f"   Checking {len(records)} households...")

    alerts_sent = 0

    for rec in records:
        latest    = rec["latest"]
        user_id   = rec["_id"]
        depletion = latest.get("depletion_date", "")

        if not depletion:
            continue

        # Calculate days left
        try:
            dep_date  = datetime.strptime(depletion, "%Y-%m-%d").date()
            days_left = (dep_date - today).days
        except Exception:
            continue

        # Only alert at exactly 5, 3, or 1 days left
        if days_left not in [5, 3, 1]:
            continue

        # Get user details from database
        try:
            from bson import ObjectId
            user_doc = await db.users.find_one({"_id": ObjectId(user_id)})
        except Exception:
            # If ObjectId conversion fails try raw string
            try:
                user_doc = await db.users.find_one({"_id": user_id})
            except Exception:
                user_doc = None

        if not user_doc:
            print(f"   ⚠️  No user found for ID: {user_id}")
            continue

        user_name  = user_doc.get("name", "User")
        user_email = user_doc.get("email", "")

        if not user_email:
            continue

        # Build message based on urgency
        if days_left == 5:
            subject   = "⛽ Gas Reminder — 5 days remaining"
            alert_msg = (
                f"Your gas cylinder is expected to run out in 5 days "
                f"on {dep_date.strftime('%B %d, %Y')}. "
                f"Plan your refill soon to avoid running out."
            )
        elif days_left == 3:
            subject   = "⚠️ Gas Alert — Only 3 days remaining!"
            alert_msg = (
                f"Your gas cylinder will run out in just 3 days "
                f"on {dep_date.strftime('%B %d, %Y')}. "
                f"Please order your refill now."
            )
        else:  # days_left == 1
            subject   = "🚨 URGENT — Gas runs out TOMORROW!"
            alert_msg = (
                f"Your gas cylinder runs out TOMORROW "
                f"({dep_date.strftime('%B %d, %Y')}). "
                f"Contact your LPG supplier immediately."
            )

        # Build and send email
        html = build_household_email(
            name           = user_name,
            days_left      = days_left,
            depletion_date = depletion,
            cylinder_size  = latest.get("cylinder_size_kg", 12.5),
            alert_message  = alert_msg,
        )

        sent = send_email(user_email, subject, html)

        if sent:
            alerts_sent += 1
            print(f"   ✅ Alert sent to {user_name} ({user_email}) — {days_left} days left")

            # Log this alert so we don't double-send
            try:
                await db.alert_logs.insert_one({
                    "user_id":    user_id,
                    "email":      user_email,
                    "days_left":  days_left,
                    "sent_at":    datetime.now().isoformat(),
                    "subject":    subject,
                    "date_check": today.isoformat(),
                })
            except Exception as e:
                print(f"   ⚠️  Could not log alert: {e}")
        else:
            print(f"   ❌ Failed to send to {user_name} ({user_email})")

    print(f"   📧 {alerts_sent} alert(s) sent.")
    print(f"   ✅ Daily check complete\n")


async def send_daily_station_report():
    """
    Sends a daily demand summary email to the station
    every morning at 7:00 AM so they can prepare stock.
    """
    import os
    from backend.notifications import build_station_email
    from collections import defaultdict

    db    = get_db()
    if db is None:
        return

    today = datetime.now().date()
    print(f"\n📊 Generating daily station report...")

    # Get latest prediction per user
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id":    "$user_id",
            "latest": {"$first": "$$ROOT"},
        }},
    ]

    try:
        records = await db.gas_usage.aggregate(pipeline).to_list(1000)
    except Exception as e:
        print(f"❌ Station report DB error: {e}")
        return

    # Build 7-day demand forecast from real user data
    demand_map = defaultdict(list)
    for rec in records:
        latest    = rec["latest"]
        depletion = latest.get("depletion_date", "")
        if not depletion:
            continue
        try:
            dep_date  = datetime.strptime(depletion, "%Y-%m-%d").date()
            days_left = (dep_date - today).days
            if 0 <= days_left <= 7:
                demand_map[depletion].append(latest)
        except Exception:
            continue

    forecast = []
    total_7_day = 0
    for i in range(7):
        day       = today + timedelta(days=i)
        day_str   = day.strftime("%Y-%m-%d")
        day_label = day.strftime("%A") if i > 0 else "Today"
        count     = len(demand_map.get(day_str, []))
        total_7_day += count
        forecast.append({
            "day_label":      day_label,
            "date":           day_str,
            "predicted_sales": count,
        })

    avg_daily = round(total_7_day / 7, 1)

    if total_7_day == 0:
        alert_msg = "No customers are expected to need gas in the next 7 days."
    else:
        tomorrow = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        tomorrow_count = len(demand_map.get(tomorrow, []))
        alert_msg = (
            f"Expected demand: {total_7_day} cylinders over 7 days "
            f"({avg_daily}/day average). "
            f"Tomorrow: {tomorrow_count} cylinder(s) needed."
        )

    html = build_station_email(
        station_id    = "Main Station",
        station_type  = "Primary",
        avg_daily     = avg_daily,
        total_7_day   = total_7_day,
        forecast      = forecast,
        alert_message = alert_msg,
    )

    station_email = os.getenv("SMTP_EMAIL", "")
    sent = send_email(station_email, "📊 Daily Station Demand Report", html)

    if sent:
        print(f"   ✅ Station report sent to {station_email}")
    else:
        print(f"   ❌ Station report failed")


def start_scheduler():
    """
    Starts the background scheduler with two jobs:

    1. check_all_households — runs daily at 8:00 AM
       Sends alerts to users at 5, 3, 1 days remaining

    2. send_daily_station_report — runs daily at 7:00 AM
       Sends demand summary email to station every morning

    Also runs both once at startup (after 1 minute) for testing.
    """

    # Job 1 — User alerts at 8:00 AM daily
    scheduler.add_job(
        check_all_households,
        trigger      = "cron",
        hour         = 8,
        minute       = 0,
        id           = "daily_household_check",
        replace_existing = True,
    )

    # Job 2 — Station report at 7:00 AM daily
    scheduler.add_job(
        send_daily_station_report,
        trigger      = "cron",
        hour         = 7,
        minute       = 0,
        id           = "daily_station_report",
        replace_existing = True,
    )

    # Run household check 1 minute after startup (for testing)
    startup_time = datetime.now() + timedelta(minutes=1)
    scheduler.add_job(
        check_all_households,
        trigger      = "date",
        run_date     = startup_time,
        id           = "startup_household_check",
        replace_existing = True,
    )

    # Run station report 2 minutes after startup (for testing)
    report_time = datetime.now() + timedelta(minutes=2)
    scheduler.add_job(
        send_daily_station_report,
        trigger      = "date",
        run_date     = report_time,
        id           = "startup_station_report",
        replace_existing = True,
    )

    scheduler.start()

    print("✅ Scheduler started successfully")
    print(f"   👥 User alerts    — daily at 08:00 AM")
    print(f"   📊 Station report — daily at 07:00 AM")
    print(f"   🧪 Test run (users)   at: {startup_time.strftime('%H:%M:%S')}")
    print(f"   🧪 Test run (station) at: {report_time.strftime('%H:%M:%S')}")