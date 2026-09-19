import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_detect_electricity_threat_scam():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        scam_msg = "Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from power office. Call officer immediately at 9876543210."
        res = await client.post("/api/scam/check", json={"text": scam_msg})
        assert res.status_code == 200
        result = res.json()["result"]
        assert result["is_scam"] is True
        assert result["threat_level"] == "CRITICAL"
        assert len(result["reasons"]) >= 2
        assert "Artificial Panic" in result["reasons"][0] or "electricity" in result["scam_type"].lower()

@pytest.mark.asyncio
async def test_detect_fake_pension_apk_scam():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        pension_msg = "Urgent: Your pension credit is withheld. Click http://fake-pension.in/app and install PensionUpdate.apk immediately."
        res = await client.post("/api/scam/check", json={"text": pension_msg})
        assert res.status_code == 200
        result = res.json()["result"]
        assert result["is_scam"] is True
        assert "🚨" in result["plain_headline"]

@pytest.mark.asyncio
async def test_verify_genuine_safe_notice():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        safe_msg = "State Bank of India: Your account has been credited with ₹10,000 on 19-Sep. Available balance is ₹34,520."
        res = await client.post("/api/scam/check", json={"text": safe_msg})
        assert res.status_code == 200
        result = res.json()["result"]
        assert result["is_scam"] is False
        assert result["threat_level"] == "SAFE"
        assert "Verified Safe" in result["plain_headline"]
