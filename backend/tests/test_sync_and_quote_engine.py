import pytest
from datetime import datetime, timedelta
from backend.app.database import SessionLocal
from backend.app.storage.repository import LifedRepository
from backend.app.storage.sync import (
    export_sync_state,
    schedule_auto_sync_and_push,
    get_sync_status,
    SYNC_FILE_PATH
)
from backend.app.notifications.quotes_bank import (
    CURATED_QUOTES,
    get_deterministic_daily_quote,
    build_ai_quote_prompt
)


def test_curated_quotes_bank_size():
    """Ensure our curated quotes bank contains at least 100 unique quotes."""
    assert len(CURATED_QUOTES) >= 100
    # Ensure no exact duplicates in library
    assert len(set(CURATED_QUOTES)) == len(CURATED_QUOTES)


def test_quote_engine_consecutive_days_non_repeating():
    """Verify that different dates yield distinct quotes."""
    today = datetime.now()
    quotes_seen = set()

    for i in range(14):  # Test across 2 weeks
        test_date = today + timedelta(days=i)
        q = get_deterministic_daily_quote(date=test_date, history=list(quotes_seen))
        assert q not in quotes_seen, f"Duplicate quote encountered on day {i}: {q}"
        quotes_seen.add(q)


def test_quote_engine_history_exclusion():
    """Verify that quotes passed in history are strictly avoided."""
    first_choice = get_deterministic_daily_quote()
    second_choice = get_deterministic_daily_quote(history=[first_choice])
    assert first_choice != second_choice


def test_ai_quote_prompt_negative_constraints():
    """Verify that build_ai_quote_prompt injects negative constraints for quote history."""
    history = [
        '"We suffer more often in imagination than in reality." — Seneca',
        '"First say to yourself what you would be; and then do what you have to do." — Epictetus'
    ]
    prompt = build_ai_quote_prompt(
        example_quote="The impediment to action advances action.",
        base_theme="Stoic resilience",
        recent_quotes=history
    )
    assert "CRITICAL ANTI-REPETITION CONSTRAINT:" in prompt
    assert "We suffer more often in imagination" in prompt
    assert "Epictetus" in prompt


def test_sync_export_contains_full_state_and_history():
    """Verify that export_sync_state writes tasks, projects, goals, and quote history."""
    db = SessionLocal()
    repo = LifedRepository(db)

    state = export_sync_state(repo)
    db.close()

    assert "last_synced" in state
    assert "goals" in state
    assert "projects" in state
    assert "tasks" in state
    assert "quote_history" in state
    assert "quote_config" in state
    assert SYNC_FILE_PATH.exists()


def test_sync_status():
    """Verify get_sync_status returns expected structure."""
    status = get_sync_status()
    assert "status" in status
    assert "last_synced" in status
