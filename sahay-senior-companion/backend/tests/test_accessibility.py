from app.services.data_store import data_store
from app.utils.security import RateLimiter, mask_account_number, mask_identifier, sanitize_text


def test_mask_account_number():
    assert mask_account_number("123456789012", prefix="SBI") == "SBI •••• 9012"
    assert mask_account_number("4821", prefix="SBI") == "SBI •••• 4821"
    assert mask_account_number("") == "•••• 0000"

def test_mask_identifier():
    assert mask_identifier("987654321098") == "•••• •••• 1098"

def test_sanitize_text():
    dirty = "<script>alert('hack')</script> Hello Senior Citizen!   <b>Safe</b>"
    cleaned = sanitize_text(dirty)
    assert "<script>" not in cleaned
    assert "<b>" not in cleaned
    assert "Hello Senior Citizen!" in cleaned
    assert "Safe" in cleaned

def test_rate_limiter():
    limiter = RateLimiter(max_requests=2, window_seconds=10)
    allowed1, _ = limiter.is_allowed("user-1")
    allowed2, _ = limiter.is_allowed("user-1")
    blocked3, wait_time = limiter.is_allowed("user-1")
    assert allowed1 is True
    assert allowed2 is True
    assert blocked3 is False
    assert wait_time > 0

def test_family_portal_privacy_guard():
    # When share_bank is False, family view MUST NOT contain any bank events
    data_store.update_family_permissions(share_trips=True, share_health=True, share_bank=False)
    family_view = data_store.get_family_view()
    for item in family_view["feed"]:
        assert item["category"] != "bank", "Privacy violation: Bank transaction leaked to family view!"

    # When share_bank is opted in, bank events are visible
    data_store.update_family_permissions(share_trips=True, share_health=True, share_bank=True)
    family_view_shared = data_store.get_family_view()
    has_bank = any(item["category"] == "bank" for item in family_view_shared["feed"])
    assert has_bank is True

    # Revert back to strict private default
    data_store.update_family_permissions(share_trips=True, share_health=True, share_bank=False)
