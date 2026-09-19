import json
import logging
import os
import time
import uuid
from typing import Any, Dict, List

from ..config import settings
from ..utils.security import mask_account_number

logger = logging.getLogger("sahay.store")

STATE_FILE = os.path.join(settings.data_dir, "sahay_state.json")
MAX_ITEMS = 100  # per collection: keeps memory and the state file bounded even if the API is hammered

class DataStore:
    def __init__(self):
        self._persist = True
        self._load_or_initialize()

    def _default_state(self) -> Dict[str, Any]:
        return {
            "profile": {
                "name": "Ajay Kumar Sharma",
                "age": 72,
                "preferred_language": "en",
                "emergency_contact": {
                    "name": "Ananya Sharma (Daughter)",
                    "relation": "Daughter",
                    "phone": "+91 98450 12345",
                    "email": "ananya.sharma@example.com"
                }
            },
            "family_permissions": {
                "share_trips": True,
                "share_health": True,
                "share_bank": False, # Strict privacy default!
                "last_updated": "2026-09-19T09:00:00"
            },
            "saved_places": [
                {
                    "id": "place-sbi",
                    "label": "State Bank of India (SBI)",
                    "category": "bank",
                    "address": "Malleshwaram 8th Cross, Margosa Road, Bengaluru",
                    "landmark": "Near Margosa Post Office, Opposite Old Banyan Tree",
                    "frequent": True
                },
                {
                    "id": "place-doctor",
                    "label": "Dr. Sharma's Cardiology Clinic",
                    "category": "health",
                    "address": "Apollo Clinic, 14th Cross, Malleshwaram",
                    "landmark": "Near Canara Union, 2nd Floor with elevator",
                    "frequent": True
                },
                {
                    "id": "place-temple",
                    "label": "Ganesh Temple",
                    "category": "spiritual",
                    "address": "Temple Street, Malleshwaram",
                    "landmark": "Opposite the heritage flower market",
                    "frequent": True
                },
                {
                    "id": "place-daughter",
                    "label": "Ananya's House (Daughter)",
                    "category": "family",
                    "address": "42, Palm Grove, Indiranagar, Bengaluru",
                    "landmark": "Behind Defence Colony Club",
                    "frequent": True
                },
                {
                    "id": "place-chemist",
                    "label": "Apollo Pharmacy",
                    "category": "pharmacy",
                    "address": "11th Cross, Sampige Road, Malleshwaram",
                    "landmark": "Next to Nilgiris Supermarket",
                    "frequent": True
                }
            ],
            "bank_activities": [
                {
                    "id": "act-bank-1",
                    "timestamp": "2026-09-19T10:45:00",
                    "action_type": "cash_withdrawal",
                    "bank_name": "State Bank of India",
                    "branch": "Malleshwaram 8th Cross",
                    "account_masked": "SBI •••• 4821",
                    "amount": "₹10,000",
                    "plain_text": "On September 19, 2026 at 10:45 AM, you withdrew ₹10,000 at SBI Malleshwaram for monthly household expenses. Your remaining balance is ₹34,520.",
                    "status": "completed",
                    "receipt_token": "SBI-MLM-4821-W10"
                }
            ],
            "reminders": [
                {
                    "id": "rem-bp-pill",
                    "category": "health",
                    "title": "Morning Blood Pressure Tablet",
                    "detail": "Take 1 Telmisartan 40mg after breakfast with a glass of water.",
                    "due_time": "09:00 AM Daily",
                    "status": "pending",
                    "audio_alert": True
                },
                {
                    "id": "rem-bank-visit",
                    "category": "bank",
                    "title": "SBI Malleshwaram Pension Visit",
                    "detail": "Visit branch for pension verification. Carry original passbook and Aadhaar copy.",
                    "due_time": "Today at 11:00 AM",
                    "status": "pending",
                    "audio_alert": True
                }
            ],
            "trips": [
                {
                    "id": "trip-cab-101",
                    "timestamp": "2026-09-19T10:15:00",
                    "destination": "State Bank of India, Malleshwaram",
                    "driver_name": "Ramesh Kumar",
                    "driver_rating": "4.9 ★",
                    "driver_phone": "+91 98800 44211",
                    "vehicle_number": "KA-04-E-8821 (White Swift Dzire)",
                    "otp": "4821",
                    "fare": "₹140",
                    "status": "arrived",
                    "family_notified": True,
                    "family_notification_text": "Ananya Sharma received driver details and arrival confirmation at 10:15 AM."
                }
            ],
            "health_visits": [
                {
                    "id": "health-visit-1",
                    "doctor": "Dr. V. Sharma, M.D. (Cardiology)",
                    "clinic": "Apollo Clinic, Malleshwaram",
                    "date": "2026-09-18",
                    "plain_summary": "Blood pressure checked: 130/85 (Healthy and controlled). Continue morning Telmisartan without break.",
                    "next_visit": "October 16, 2026"
                }
            ],
            "scam_inspections": []
        }

    def _load_or_initialize(self):
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, "r", encoding="utf-8") as f:
                    self.state = json.load(f)
                    return
            except (OSError, ValueError):
                logger.warning("State file unreadable; starting from a fresh state")
        self.state = self._default_state()
        self._save()

    def _save(self):
        """Writes the state atomically. On a read-only filesystem (serverless) it stops trying and stays in memory."""
        if not self._persist:
            return
        try:
            tmp_path = STATE_FILE + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                json.dump(self.state, f, ensure_ascii=False, separators=(",", ":"))
            os.replace(tmp_path, STATE_FILE)
        except OSError as e:
            self._persist = False
            logger.warning(f"State cannot be saved ({e}); continuing in memory only")

    def _prepend(self, key: str, item: Dict[str, Any]) -> None:
        items = self.state.setdefault(key, [])
        items.insert(0, item)
        del items[MAX_ITEMS:]
        self._save()

    @staticmethod
    def _new_id(prefix: str) -> str:
        return f"{prefix}-{uuid.uuid4().hex[:10]}"  # unique even for items created in the same second

    # Profile & Permissions
    def get_profile(self) -> Dict[str, Any]:
        return self.state.get("profile", {})

    def get_family_permissions(self) -> Dict[str, Any]:
        return self.state.get("family_permissions", {})

    def update_family_permissions(self, share_trips: bool, share_health: bool, share_bank: bool) -> Dict[str, Any]:
        self.state["family_permissions"] = {
            "share_trips": share_trips,
            "share_health": share_health,
            "share_bank": share_bank,
            "last_updated": time.strftime("%Y-%m-%dT%H:%M:%S")
        }
        self._save()
        return self.state["family_permissions"]

    # Saved Places
    def get_saved_places(self) -> List[Dict[str, Any]]:
        return self.state.get("saved_places", [])

    # Bank Activities
    def add_bank_activity(self, activity: Dict[str, Any]) -> Dict[str, Any]:
        if "account_masked" in activity:
            activity["account_masked"] = mask_account_number(activity["account_masked"])
        activity["id"] = self._new_id("act-bank")
        activity["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._prepend("bank_activities", activity)
        return activity

    def get_bank_activities(self) -> List[Dict[str, Any]]:
        return self.state.get("bank_activities", [])

    # Reminders
    def add_reminder(self, reminder: Dict[str, Any]) -> Dict[str, Any]:
        reminder["id"] = self._new_id("rem")
        if "status" not in reminder:
            reminder["status"] = "pending"
        self._prepend("reminders", reminder)
        return reminder

    def get_reminders(self) -> List[Dict[str, Any]]:
        return self.state.get("reminders", [])

    def mark_reminder_done(self, reminder_id: str) -> bool:
        for rem in self.state.get("reminders", []):
            if rem["id"] == reminder_id:
                rem["status"] = "completed"
                self._save()
                return True
        return False

    # Trips
    def add_trip(self, trip: Dict[str, Any]) -> Dict[str, Any]:
        trip["id"] = self._new_id("trip")
        trip["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._prepend("trips", trip)
        return trip

    def get_trips(self) -> List[Dict[str, Any]]:
        return self.state.get("trips", [])

    # Health Visits
    def add_health_visit(self, visit: Dict[str, Any]) -> Dict[str, Any]:
        visit["id"] = self._new_id("health")
        self._prepend("health_visits", visit)
        return visit

    def get_health_visits(self) -> List[Dict[str, Any]]:
        return self.state.get("health_visits", [])

    # Scam Inspections
    def add_scam_inspection(self, inspection: Dict[str, Any]) -> Dict[str, Any]:
        inspection["id"] = self._new_id("scam")
        inspection["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        self._prepend("scam_inspections", inspection)
        return inspection

    def get_scam_inspections(self) -> List[Dict[str, Any]]:
        return self.state.get("scam_inspections", [])

    # Unified "Things I'm Tracking For You" Dashboard
    def get_tracking_summary(self) -> Dict[str, Any]:
        reminders = self.get_reminders()
        bank = self.get_bank_activities()
        trips = self.get_trips()
        health = self.get_health_visits()
        scams = self.get_scam_inspections()

        pending_reminders = [r for r in reminders if r.get("status") == "pending"]

        return {
            "senior_name": self.state["profile"]["name"],
            "pending_count": len(pending_reminders),
            "pending_reminders": pending_reminders,
            "recent_bank_activity": bank[0] if bank else None,
            "recent_trip": trips[0] if trips else None,
            "recent_health_visit": health[0] if health else None,
            "total_scams_blocked": len([s for s in scams if s.get("is_scam")])
        }

    # Family View Feed (Subject to Permissions!)
    def get_family_view(self) -> Dict[str, Any]:
        perms = self.get_family_permissions()
        feed = []

        if perms.get("share_trips"):
            for t in self.get_trips()[:3]:
                feed.append({
                    "category": "transport",
                    "title": f"Cab Ride: {t.get('destination', 'Trip')}",
                    "detail": f"Driver {t.get('driver_name', '')} ({t.get('vehicle_number', '')}). Status: {t.get('status', 'Completed')}",
                    "timestamp": t.get("timestamp")
                })

        if perms.get("share_health"):
            for h in self.get_health_visits()[:3]:
                feed.append({
                    "category": "health",
                    "title": f"Medical Visit: {h.get('doctor', 'Doctor')}",
                    "detail": h.get("plain_summary", "Doctor appointment completed."),
                    "timestamp": h.get("date")
                })

        if perms.get("share_bank"):
            for b in self.get_bank_activities()[:3]:
                feed.append({
                    "category": "bank",
                    "title": f"Bank Activity: {b.get('bank_name', 'Bank')}",
                    "detail": b.get("plain_text", "Transaction completed."),
                    "timestamp": b.get("timestamp")
                })

        feed.sort(key=lambda x: str(x.get("timestamp", "")), reverse=True)

        return {
            "senior_name": self.state["profile"]["name"],
            "permissions": perms,
            "feed": feed,
            "note": "You are seeing only the categories your parent has opted-in to share. Bank transactions remain strictly private unless explicitly granted."
        }

data_store = DataStore()
