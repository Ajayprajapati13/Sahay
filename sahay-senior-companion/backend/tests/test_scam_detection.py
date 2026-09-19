import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


async def _check(text):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/scam/check", json={"text": text})
    assert res.status_code == 200
    return res.json()["result"]


@pytest.mark.asyncio
async def test_detect_electricity_threat_scam():
    result = await _check("Dear Consumer, your electricity power will be disconnected tonight at 9:30 PM from power office. Call officer immediately at 9876543210.")
    assert result["is_scam"] is True
    assert result["threat_level"] in ("HIGH", "CRITICAL")
    # every reason is real evidence found in this message, not canned text
    assert len(result["reasons"]) >= 2
    assert "disconnection threat" in result["scam_type"]
    assert any("personal mobile number" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_detect_fake_pension_apk_scam():
    result = await _check("Urgent: Your pension credit is withheld. Click http://fake-pension.in/app and install PensionUpdate.apk immediately.")
    assert result["is_scam"] is True
    assert result["threat_level"] == "CRITICAL"
    assert "🚨" in result["plain_headline"]
    assert any("app file" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_message_without_scam_signs_is_never_called_verified_safe():
    result = await _check("State Bank of India: Your account has been credited with ₹10,000 on 19-Sep. Available balance is ₹34,520.")
    assert result["is_scam"] is False
    assert result["threat_level"] == "UNVERIFIED"
    assert "Verified Safe" not in result["plain_headline"]
    assert "not a guarantee" in " ".join(result["reasons"])


@pytest.mark.asyncio
@pytest.mark.parametrize("genuine", [
    # broad words that used to trigger false alarms
    "My wonderful grandson won the school match! Please call back immediately when you are free, it is urgent that we plan the trip.",
    "Your electricity bill of ₹1,240 is due on 25 Sep. Pay via the official BESCOM app or at the counter.",
    "Scheduled maintenance: power will be off on 22 Sep from 10:00 am to 1:00 pm in Malleshwaram.",
    # a single weak signal is not enough on its own
    "Your e-statement is ready: http://statements.example.com/view",
    "Call our helpline 9876543210 if you have questions about your policy.",
])
async def test_genuine_messages_are_not_flagged(genuine):
    result = await _check(genuine)
    assert result["is_scam"] is False, result


@pytest.mark.asyncio
@pytest.mark.parametrize("scam,expected", [
    ("Please share your OTP to keep your account active.", "credential request"),
    ("Install AnyDesk so our officer can fix your pension.", "remote access"),
])
async def test_single_critical_signal_is_enough(scam, expected):
    result = await _check(scam)
    assert result["is_scam"] is True
    assert expected in result["scam_type"]
