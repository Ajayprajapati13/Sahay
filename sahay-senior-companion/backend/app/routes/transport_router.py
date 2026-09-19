from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ..services.data_store import data_store
from ..utils.security import booking_rate_limiter, sanitize_text, client_key, CleanModel

router = APIRouter(prefix="/transport", tags=["Journey 2: Transportation & Errands"])

class BookRideRequest(CleanModel):
    destination: str
    pickup: Optional[str] = "Home (Margosa Road)"
    vehicle_type: Optional[str] = "Sedan (AC Comfort)"
    fare_estimate: Optional[str] = "₹140"
    share_with_family: Optional[bool] = None # If None, defaults to current family permission

class ReorderRequest(CleanModel):
    category: Optional[str] = "pharmacy" # or "groceries"
    store_name: Optional[str] = "Apollo Pharmacy Malleshwaram"

@router.get("/places")
async def get_saved_places():
    """Returns 'My People & Places' frequent destinations."""
    return {
        "status": "success",
        "places": data_store.get_saved_places()
    }

@router.post("/estimate-fare")
async def estimate_fare(req: BookRideRequest):
    """Calculates plain-language fare breakdown with zero hidden charges."""
    dest = req.destination
    return {
        "destination": dest,
        "base_fare": "₹80",
        "distance_fare": "₹50 (2.4 km at ₹21/km)",
        "taxes": "₹10 (GST included)",
        "total_fare": "₹140",
        "plain_explanation": "Total fare is exactly ₹140. There are no peak charges or surprise extras.",
        "spoken_confirmation": f"The cab to {dest} will cost ₹140 with zero surge. Would you like me to book this now?"
    }

@router.post("/book-ride")
async def book_ride(req: BookRideRequest, request: Request):
    """Books a simulated ride with rate limiting, giant OTP, driver info, and optional family broadcast."""
    allowed, retry = booking_rate_limiter.is_allowed(client_key(request, "transport_book"))
    if not allowed:
        raise HTTPException(status_code=429, detail=f"Please wait {retry} seconds before booking another ride.")

    dest = req.destination
    perms = data_store.get_family_permissions()
    should_share = req.share_with_family if req.share_with_family is not None else perms.get("share_trips", True)

    driver = {
        "name": "Ramesh Kumar",
        "rating": "4.9 ★ (1,420 senior-rated rides)",
        "photo": "/icons/driver_ramesh.png",
        "phone": "+91 98800 44211",
        "vehicle": "White Maruti Swift Dzire",
        "plate": "KA-04-E-8821",
        "otp": "4821", # Clear 4-digit OTP matching senior's easy recall
        "eta": "4 minutes"
    }

    family_text = ""
    if should_share:
        family_text = f"Driver Ramesh Kumar's details and live vehicle tracking (KA-04-E-8821) have been sent to your daughter Ananya."

    trip = data_store.add_trip({
        "destination": dest,
        "pickup": req.pickup,
        "fare": req.fare_estimate,
        "driver_name": driver["name"],
        "vehicle_number": driver["plate"],
        "vehicle_model": driver["vehicle"],
        "otp": driver["otp"],
        "status": "driver_assigned",
        "family_notified": should_share,
        "family_notification_text": family_text
    })

    return {
        "status": "success",
        "trip_id": trip["id"],
        "driver": driver,
        "otp": driver["otp"],
        "fare": req.fare_estimate,
        "family_shared": should_share,
        "family_message": family_text,
        "spoken_response": f"Your cab is on the way! Driver Ramesh in a White Swift Dzire will arrive in 4 minutes. Your OTP is {driver['otp']}."
    }

@router.get("/landmarks/{place_id}")
async def get_landmark_transit(place_id: str):
    """Provides landmark-based walking or public bus directions without confusing maps."""
    landmarks = {
        "place-sbi": {
            "title": "Landmark directions to SBI Malleshwaram",
            "steps": [
                "1. Step out and walk towards Margosa Road.",
                "2. Pass the Margosa Post Office on your right (walk about 200 meters).",
                "3. Stop opposite the heritage Banyan tree and flower stalls.",
                "4. SBI is on the first floor. Use the elevator next to the ground-floor medical store."
            ],
            "bus_options": "Bus 252 or 258 from Post Office Stop. Drop off at 8th Cross (1 stop)."
        },
        "place-doctor": {
            "title": "Landmark directions to Dr. Sharma's Clinic",
            "steps": [
                "1. Head north towards 14th Cross Sampige Road.",
                "2. Turn right next to Canara Union library.",
                "3. Apollo Clinic is on the 2nd floor with ramp and elevator access."
            ],
            "bus_options": "Bus 250 or 253. Get down at 14th Cross Sampige."
        }
    }

    return landmarks.get(place_id, {
        "title": "Landmark Guide",
        "steps": ["Take a direct auto or cab for maximum comfort and safety."],
        "bus_options": "Direct transit recommended."
    })

@router.post("/reorder-monthly")
async def reorder_monthly(req: ReorderRequest):
    """Voice-driven 'order what I got last month' for medications & household essentials."""
    if req.category == "pharmacy":
        items = [
            {"item": "Telmisartan 40mg (Strip of 30)", "price": "₹165", "purpose": "Blood pressure"},
            {"item": "Atorvastatin 10mg (Strip of 30)", "price": "₹140", "purpose": "Cholesterol"},
            {"item": "Shelcal 500 (Strip of 15)", "price": "₹95", "purpose": "Calcium + Vitamin D"}
        ]
        total = "₹400"
        delivery_address = "Home: Margosa Road, Malleshwaram"
        spoken = "I found your regular monthly medicines from Apollo Pharmacy: Telmisartan and Atorvastatin. The total is ₹400 with free home delivery. Shall I place the order?"
    else:
        items = [
            {"item": "Tata Salt (1 kg)", "price": "₹28"},
            {"item": "Aashirvaad Whole Wheat Atta (5 kg)", "price": "₹245"},
            {"item": "Cow Milk 500ml (10 Pack Coupon)", "price": "₹260"}
        ]
        total = "₹533"
        delivery_address = "Home: Margosa Road, Malleshwaram"
        spoken = "I found your staple household grocery items. The total is ₹533 with doorstep delivery today by 4 PM. Shall I confirm?"

    return {
        "status": "success",
        "category": req.category,
        "store": req.store_name,
        "items": items,
        "total_amount": total,
        "delivery_time": "Today within 2 hours (Doorstep contactless delivery)",
        "delivery_address": delivery_address,
        "spoken_confirmation": spoken
    }
