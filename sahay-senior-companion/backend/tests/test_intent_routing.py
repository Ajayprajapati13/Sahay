import pytest
from app.services.gemini_service import gemini_service

@pytest.mark.asyncio
async def test_bank_pension_intent():
    res = await gemini_service.route_intent("Why wasn't my pension credited to my SBI account?", "en")
    assert res["category"] == "bank_visit"
    assert res["confidence"] >= 0.8
    assert "pension" in res["spoken_response"].lower() or "bank" in res["spoken_response"].lower()

@pytest.mark.asyncio
async def test_cash_withdrawal_intent():
    res = await gemini_service.route_intent("I need to withdraw cash from the branch", "en")
    assert res["category"] == "bank_visit"
    assert res["confidence"] >= 0.8

@pytest.mark.asyncio
async def test_transport_intent():
    res = await gemini_service.route_intent("Please book a cab to Dr. Sharma's clinic", "en")
    assert res["category"] == "transport"
    assert "clinic" in res["spoken_response"].lower() or "cab" in res["spoken_response"].lower() or "doctor" in res["spoken_response"].lower()

@pytest.mark.asyncio
async def test_errands_reorder_intent():
    res = await gemini_service.route_intent("Order what I got last month from chemist", "en")
    assert res["category"] == "errands"
    assert res["action"] == "reorder_monthly"

@pytest.mark.asyncio
async def test_scam_intent():
    res = await gemini_service.route_intent("I received an urgent message saying my electricity will be cut tonight", "en")
    assert res["category"] == "scam_check"
    assert res["confidence"] >= 0.9

@pytest.mark.asyncio
async def test_bilingual_hindi_intent():
    res = await gemini_service.route_intent("मुझे बैंक से पेंशन निकालनी है", "hi")
    assert res["category"] == "bank_visit"
    assert "पेंशन" in res["spoken_response"] or "बैंक" in res["spoken_response"]
