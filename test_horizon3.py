#!/usr/bin/env python3
"""
test_horizon3.py
Unit tests for the Horizon 3.1–3.4 changes in beat_generator.py.

Run from the project root (the dir that contains beat_generator.py):
    cd /root/kinetic_typo_vid
    source venv/bin/activate
    python test_horizon3.py
"""
import sys
from pathlib import Path

# Make sure beat_generator is importable when run from the project root
sys.path.insert(0, str(Path(__file__).parent))

import beat_generator as bg


def test_3_3_target_frames_for_word_count():
    # Floor: 2 words → 45 frames (1.5s)
    assert bg.target_frames_for_word_count(2) == 45, bg.target_frames_for_word_count(2)
    # 10 words → 45 (still at the floor; 10 * 4.5 = 45)
    assert bg.target_frames_for_word_count(10) == 45
    # 20 words → 90 (3.0s)
    assert bg.target_frames_for_word_count(20) == 90, bg.target_frames_for_word_count(20)
    # 30 words → 135 (4.5s)
    assert bg.target_frames_for_word_count(30) == 135, bg.target_frames_for_word_count(30)
    # Ceiling: 50 words → 180 (6.0s)
    assert bg.target_frames_for_word_count(50) == 180
    # Above ceiling still caps at 180
    assert bg.target_frames_for_word_count(100) == 180
    # Below floor (0 words) → 45 (the floor)
    assert bg.target_frames_for_word_count(0) == 45
    print("3.3 OK: target_frames_for_word_count respects [45, 180] floor/ceiling")


def test_3_4_compute_pacing():
    assert bg.compute_pacing("One.") == "fast"
    assert bg.compute_pacing("Three word beat.") == "fast"
    assert bg.compute_pacing("Four word beat here.") == "normal"
    assert bg.compute_pacing("Eight words here please.") == "normal"
    assert bg.compute_pacing("Nine words is the slow start.") == "slow"
    assert (
        bg.compute_pacing("This is a much longer beat with eleven words total.")
        == "slow"
    )
    # Edge: empty / whitespace
    assert bg.compute_pacing("") == "fast"
    assert bg.compute_pacing("   ") == "fast"
    print("3.4 OK: compute_pacing thresholds 1-3 fast, 4-8 normal, 9+ slow")


def test_3_1_force_intro_to_headline_card():
    # key_statement → headline_card, icon field stripped
    beats = [
        {
            "type": "key_statement",
            "text": "Big news",
            "icon": "🔥",
            "startWord": 0,
            "endWord": 2,
        }
    ]
    result = bg.force_intro_to_headline_card(beats)
    assert result[0]["type"] == "headline_card"
    assert "icon" not in result[0], "invalid field should be stripped"
    assert result[0]["text"] == "Big news"
    assert result[0]["emphasisWords"] == []

    # Already headline_card → no-op
    beats2 = [
        {"type": "headline_card", "text": "hi", "startWord": 0, "endWord": 1}
    ]
    assert bg.force_intro_to_headline_card(beats2)[0]["type"] == "headline_card"

    # Empty list
    assert bg.force_intro_to_headline_card([]) == []

    # icon_text → headline_card, icon stripped
    beats3 = [
        {"type": "icon_text", "text": "hi", "icon": "📊", "startWord": 0, "endWord": 1}
    ]
    result3 = bg.force_intro_to_headline_card(beats3)
    assert result3[0]["type"] == "headline_card"
    assert "icon" not in result3[0]

    # before_after → headline_card, left/right stripped
    beats4 = [
        {
            "type": "before_after",
            "text": "hi",
            "left": "A",
            "right": "B",
            "startWord": 0,
            "endWord": 1,
        }
    ]
    result4 = bg.force_intro_to_headline_card(beats4)
    assert result4[0]["type"] == "headline_card"
    assert "left" not in result4[0]
    assert "right" not in result4[0]
    assert "beforeLabel" not in result4[0]
    assert "afterLabel" not in result4[0]
    print("3.1 OK: force_intro_to_headline_card rebuilds beat with headline_card fields only")


def test_3_1_arc_allowed_types():
    intro_types = bg.arc_allowed_types("intro")
    assert "headline_card" in intro_types, intro_types

    explain_types = bg.arc_allowed_types("explain")
    for t in ["icon_text", "progress_meter", "timeline", "process_flow"]:
        assert t in explain_types, f"{t} missing from explain"

    climax_types = bg.arc_allowed_types("climax")
    for t in ["quote_card", "map_3d"]:
        assert t in climax_types, f"{t} missing from climax"

    compare_types = bg.arc_allowed_types("compare")
    for t in ["versus", "before_after"]:
        assert t in compare_types

    outro_types = bg.arc_allowed_types("outro")
    assert "key_statement" in outro_types

    # Unknown label → falls back to explain
    fallback = bg.arc_allowed_types("nonexistent_label_xyz")
    for t in ["icon_text", "progress_meter"]:
        assert t in fallback, f"{t} missing from fallback"
    print("3.1 OK: arc_allowed_types returns the right whitelist for each label")


def test_3_1_plan_story_arc_fallback():
    # Use a deliberately-broken model_key to force the except branch
    arc = bg.plan_story_arc(
        "This is a short test story with several words. " * 20,
        {"title": "test"},
        model_key="nonexistent-model-xyz",
    )
    print(f"Fallback arc ({len(arc)} entries): {arc}")
    assert arc[0] == "intro", f"arc[0]={arc[0]}"
    assert arc[-1] == "outro", f"arc[-1]={arc[-1]}"
    valid = {"intro", "explain", "compare", "climax", "outro"}
    for label in arc:
        assert label in valid, f"invalid label in fallback arc: {label}"
    # n=3 special case
    arc3 = bg.plan_story_arc(
        "Short. " * 10, {"title": "test"}, model_key="nonexistent"
    )
    assert arc3 == ["intro", "explain", "outro"], arc3
    print("3.1 OK: plan_story_arc fallback returns [intro, explain..., outro] shape")


def test_3_3_should_split_beat():
    # Splittable type, below ceiling → False
    assert bg.should_split_beat({"type": "key_statement", "durationInFrames": 100}) is False
    assert bg.should_split_beat({"type": "key_statement", "durationInFrames": 180}) is False
    assert bg.should_split_beat({"type": "key_statement", "durationInFrames": 200}) is False
    # Splittable type, above ceiling → True
    assert bg.should_split_beat({"type": "key_statement", "durationInFrames": 201}) is True
    # Non-splittable type, above ceiling → False (we trim, never split these)
    assert bg.should_split_beat({"type": "chart_line", "durationInFrames": 500}) is False
    assert bg.should_split_beat({"type": "map_3d", "durationInFrames": 500}) is False
    assert bg.should_split_beat({"type": "quote_attribution", "durationInFrames": 500}) is False
    print(
        f"3.3 OK: split only fires for splittable types > "
        f"{bg.MAX_BEAT_FRAMES_HARD} frames (200)"
    )


def test_constants():
    assert bg.MIN_BEAT_FRAMES == 45, bg.MIN_BEAT_FRAMES
    assert bg.MAX_BEAT_FRAMES == 180, bg.MAX_BEAT_FRAMES
    assert bg.MAX_BEAT_FRAMES_SOFT == 180, bg.MAX_BEAT_FRAMES_SOFT
    assert bg.MAX_BEAT_FRAMES_HARD == 200, bg.MAX_BEAT_FRAMES_HARD

    assert len(bg.BEAT_TYPES) == 18, len(bg.BEAT_TYPES)
    for t in [
        "headline_card",
        "chart_line",
        "map_3d",
        "quote_attribution",
        "stat_pill",
        "compare_split",
        "location_pulse",
        "scrollytelling",
        "ticker_tape",
    ]:
        assert t in bg.BEAT_TYPES, f"{t} missing from BEAT_TYPES"

    for t in ["chart_line", "map_3d", "quote_attribution"]:
        assert t in bg.DIVERSITY_REQUIRED, f"{t} missing from DIVERSITY_REQUIRED"
    for t in ["progress_meter", "timeline", "process_flow"]:
        assert t in bg.DIVERSITY_DATA_VIS, f"{t} missing from DIVERSITY_DATA_VIS"
    print("Constants OK: 45/180/180/200; 18 beat types; diversity budget set")


def main():
    tests = [
        test_constants,
        test_3_3_target_frames_for_word_count,
        test_3_4_compute_pacing,
        test_3_1_force_intro_to_headline_card,
        test_3_1_arc_allowed_types,
        test_3_1_plan_story_arc_fallback,
        test_3_3_should_split_beat,
    ]
    passed = 0
    failed = 0
    for t in tests:
        try:
            t()
            passed += 1
        except Exception as e:
            print(f"FAIL {t.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    main()
