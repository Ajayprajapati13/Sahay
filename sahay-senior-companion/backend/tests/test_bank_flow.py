import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.data_store import data_store

@pytest.mark.asyncio
async def test_bank_flagship_flow_prepare():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Prepare bank visit
        prep_payload = {
            "purpose": "pension_check",
            "amount": "15000",
            "bank_name": "State Bank of India",
            "branch_name": "Malleshwaram 8th Cross",
            "account_number": "4821",
            "customer_name": "Ajay Kumar Sharma"
        }
        res = await client.post("/api/bank/prepare", json=prep_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert len(data["checklist"]) >= 3
        assert "Passbook" in data["checklist"][0]
        assert data["prefilled_form"]["fields"]["Account Number"] == "SBI •••• 4821"

@pytest.mark.asyncio
async def test_bank_flagship_flow_assist_kiosk():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 2: Kiosk / Companion Check-in at the branch
        kiosk_payload = {
            "account_masked": "SBI •••• 4821",
            "purpose": "Pension Enquiry & Withdrawal",
            "token_code": "C-42"
        }
        res = await client.post("/api/bank/kiosk-checkin", json=kiosk_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["checked_in"] is True
        assert data["token_number"] == "C-42"
        assert data["people_ahead"] == 4
        assert "Counter 3" in data["assigned_counter"]

@pytest.mark.asyncio
async def test_bank_flagship_flow_followup_resolved():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 3A: Successfully resolved cash withdrawal
        complete_payload = {
            "action_type": "cash_withdrawal",
            "amount": "₹10,000",
            "resolved": True,
            "bank_name": "State Bank of India",
            "branch": "Malleshwaram 8th Cross",
            "account_masked": "SBI •••• 4821"
        }
        res = await client.post("/api/bank/complete", json=complete_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["resolved"] is True
        assert "₹10,000" in data["spoken_summary"]

@pytest.mark.asyncio
async def test_bank_flagship_flow_followup_unresolved():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 3B: Unresolved pension delay -> generates formal grievance letter & reminder
        unresolved_payload = {
            "action_type": "pension_inquiry",
            "amount": "₹28,000",
            "resolved": False,
            "unresolved_reason": "Pension credit delayed beyond due date. Branch officer requested verification.",
            "bank_name": "State Bank of India",
            "branch": "Malleshwaram 8th Cross",
            "account_masked": "SBI •••• 4821"
        }
        res = await client.post("/api/bank/complete", json=unresolved_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["resolved"] is False
        assert "drafted_letter" in data
        assert "To," in data["drafted_letter"]
        assert "Branch Manager" in data["drafted_letter"]
        assert "SBI •••• 4821" in data["drafted_letter"]
        assert data["reminder"]["status"] == "pending"
