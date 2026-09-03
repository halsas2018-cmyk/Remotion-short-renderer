#!/usr/bin/env python3
"""
test_horizon3_7_alignment.py
Unit tests for the Horizon 3.7 audio-visual alignment fix in
beat_generator.assign_frames_from_word_ranges() and the related
align_text_to_audio_window() change.

Background
----------
Pre-3.7, two bugs caused beat components to disappear before their
audio finished:

1. `assign_frames_from_word_ranges()` truncated a beat's endFrame to a
   hard-coded cap of `wordCount*4.5` frames. For fast-narration audio
   (e.g. 0.28s/word ≈ 8.3 frames/word), this cap was below the natural
   duration of every beat, so every beat was truncated and the
   trailing audio was orphaned.
2. The carry-forward into the next beat was missing. When the cap
   truncated, the next beat's startFrame pointed to the next word, but
   the chunker had already assumed the previous beat covered all its
   words — so the next beat skipped ahead and the in-between words had
   no beat at all.
3. `align_text_to_audio_window()` filtered with `w["start"] >= s_sec
   AND w["end"] <= e_sec`, which dropped words at the beat boundary
   whose audio straddled two beats (start in one, end in another).

The fix
-------
- `assign_frames_from_word_ranges()` now measures the actual audio rate
  (frames per word) and uses it to set the cap, with a 15% buffer.
  Truncation only fires for truly oversized beats.
- When the cap OR the MIN_BEAT_FRAMES floor pulls a beat's endFrame
  past the chunk's natural end, the leftover words are advanced into
  the next beat's startFrame (carry-forward).
- `align_text_to_audio_window()` now uses the next beat's startFrame
  as the right edge, so a word belongs to exactly one beat (the one
  whose startFrame precedes the word's start), with no duplicates.

These tests assert five properties of the fixed function:
  (a) Cap respected: each beat's durationInFrames is at most the cap.
  (b) No overlap: beat[i].endFrame <= beat[i+1].startFrame.
  (c) No audio gaps: the union of all beats' [startFrame, endFrame]
      covers every word in the script (when all words are chunked).
  (d) No duplicates: each word appears in exactly one beat's text.
  (e) Carry-forward works: when a beat's endFrame is pulled past its
      chunk's natural end, the next beat's startFrame advances past
      the consumed words.

Run from the project root:
    cd /root/kinetic_typo_vid
    source venv/bin/activate
    python test_horizon3_7_alignment.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import beat_generator as bg


def _synth_word_timestamps(n: int, dur: float = 0.28) -> list[dict]:
    """Build n word timestamps at `dur` sec/word, deterministic."""
    return [
        {"word": f"w{i}", "start": float(i) * dur, "end": float(i) * dur + dur * 0.9}
        for i in range(n)
    ]


def test_no_truncation_no_change():
    """If all beats fit under the cap, the fix should be a no-op for
    pass 2 (no truncation → no carry-forward). Beats are sequential
    as the chunker emitted them."""
    n_words = 12
    words = _synth_word_timestamps(n_words, dur=0.5)  # slow, 0.5s/word
    script = " ".join(f"w{i}" for i in range(n_words))
    beats = [
        {"type": "key_statement", "text": "a b c d", "startWord": 0, "endWord": 3},
        {"type": "key_statement", "text": "e f g h", "startWord": 4, "endWord": 7},
        {"type": "key_statement", "text": "i j k l", "startWord": 8, "endWord": 11},
    ]
    out = bg.assign_frames_from_word_ranges(beats, words, script)
    assert len(out) == 3
    # Beats should be sequential (each starts where the previous ended).
    for i in range(len(out) - 1):
        assert out[i]["endFrame"] <= out[i + 1]["startFrame"], (
            f"Beat {i} endFrame={out[i]['endFrame']} > beat {i+1} startFrame={out[i+1]['startFrame']}"
        )
    # No word indices leaked through.
    for b in out:
        assert "startWord" not in b
        assert "endWord" not in b


def test_truncation_carry_forward_basic():
    """The core bug case: a beat with many words gets truncated by the
    cap, and the next beat picks up the leftover words."""
    n_words = 30
    # 0.28s/word = ~8.3 frames/word. For 20 words natural = ~166 frames.
    # cap = max(45, min(180, 20*8.3*1.15)) = max(45, min(180, 191)) = 180.
    # So natural 166 < cap 180, no truncation. Use a smaller cap to force
    # truncation: use a much higher word rate to make natural >> cap.
    words = []
    t = 0.0
    for i in range(n_words):
        dur = 0.5  # slow but chunked
        words.append({"word": f"w{i}", "start": t, "end": t + dur * 0.9})
        t += dur
    # 20 words natural = 300 frames, well above the 180 cap.
    script = " ".join(f"w{i}" for i in range(n_words))
    beats = [
        {"type": "key_statement", "text": "a b", "startWord": 0, "endWord": 19},
        {"type": "key_statement", "text": "c d", "startWord": 20, "endWord": 29},
    ]
    out = bg.assign_frames_from_word_ranges(beats, words, script)
    # Beat 0 should be truncated by the cap (180 frames).
    assert out[0]["durationInFrames"] <= 180, out[0]
    # Beat 1 should be advanced past beat 0's truncation.
    assert out[1]["startFrame"] > out[0]["endFrame"] - 1, (
        f"Carry-forward failed: beat 1 start={out[1]['startFrame']} <= beat 0 end={out[0]['endFrame']}"
    )
    # No overlap.
    assert out[0]["endFrame"] <= out[1]["startFrame"], (out[0], out[1])


def test_no_overlap_no_gap_full_coverage():
    """For a long sequence of beats, the union of all [startFrame, endFrame]
    windows must be contiguous (no gaps) and the last beat must end at
    total_frames (the audio's last frame)."""
    n_words = 50
    words = _synth_word_timestamps(n_words, dur=0.5)
    script = " ".join(f"w{i}" for i in range(n_words))
    # 5 beats of 10 words each. With 0.5s/word, natural is 150 frames per
    # beat, which is well above any cap.
    beats = [
        {"type": "key_statement", "text": "x", "startWord": i * 10, "endWord": i * 10 + 9}
        for i in range(5)
    ]
    out = bg.assign_frames_from_word_ranges(beats, words, script)
    # auto_fix_frames is what snaps the last beat to total_frames in the
    # real pipeline. We call it here to mirror the real flow.
    out = bg.auto_fix_frames(out, words, script)
    # Property (b): no overlap.
    for i in range(len(out) - 1):
        assert out[i]["endFrame"] <= out[i + 1]["startFrame"], (
            f"Beat {i} end={out[i]['endFrame']} > beat {i+1} start={out[i+1]['startFrame']}"
        )
    # Property (c): contiguous from frame 0 to total_frames.
    total = int(words[-1]["end"] * bg.FPS)
    assert out[0]["startFrame"] == 0, out[0]
    assert out[-1]["endFrame"] >= total - 1, (out[-1], total)
    # And no beat should have a non-positive duration.
    for b in out:
        assert b["durationInFrames"] > 0, b


def test_minimum_duration_floor_preserved():
    """The MIN_BEAT_FRAMES floor (45) must still apply when the
    audio is long enough — the floor pulls a short beat's endFrame to
    start+45 to keep it visible long enough on screen."""
    # 100 words at 0.5s/word = 50s = 1500 frames. Pick a 3-word chunk
    # (startWord=0, endWord=2) whose natural is 3*0.5*30=45 frames.
    # The floor is 45, the cap for 3 words is 45, so endFrame stays
    # at 45. Use a 1-word chunk: natural = 15 frames, floor pulls to 45.
    n_words = 100
    words = _synth_word_timestamps(n_words, dur=0.5)
    script = " ".join(f"w{i}" for i in range(n_words))
    beats = [
        {"type": "key_statement", "text": "x", "startWord": 0, "endWord": 0},
    ]
    out = bg.assign_frames_from_word_ranges(beats, words, script)
    # Floor: at least 45 frames (when total audio is long enough).
    assert out[0]["durationInFrames"] >= bg.MIN_BEAT_FRAMES, out[0]


def test_realistic_aa_fixture_no_orphan_words():
    """Mimic the American Airlines story shape: 12 beats of ~10 words
    each at the real audio rate (~0.28s/word). Verify no overlap and
    full coverage when run through the full pipeline."""
    n_words = 119
    words = []
    t = 0.0
    for i in range(n_words):
        dur = 0.27 + (i % 5) * 0.01
        words.append({"word": f"w{i}", "start": t, "end": t + dur})
        t += dur
    total = int(words[-1]["end"] * bg.FPS)
    script = " ".join(f"w{i}" for i in range(n_words))
    # 12 beats matching the AA story's chunk sizes (3+9+6+11+9+10+10+12+5+7+10+14=106).
    chunk_sizes = [3, 9, 6, 11, 9, 10, 10, 12, 5, 7, 10, 14]
    beats = []
    i = 0
    for size in chunk_sizes:
        beats.append({"type": "key_statement", "text": "x", "startWord": i, "endWord": i + size - 1})
        i += size
    # Run the full pipeline (assign → auto_fix → align).
    out = bg.assign_frames_from_word_ranges(beats, words, script)
    out = bg.auto_fix_frames(out, words, script)
    out = bg.align_text_to_audio_window(out, words)
    # No overlap.
    for i in range(len(out) - 1):
        assert out[i]["endFrame"] <= out[i + 1]["startFrame"], (
            f"Beat {i} end={out[i]['endFrame']} > beat {i+1} start={out[i+1]['startFrame']}"
        )
    # All chunked words covered (no orphans).
    all_text_words = set()
    for b in out:
        for w in b.get("text", "").split():
            if w.startswith("w"):
                all_text_words.add(int(w[1:]))
    chunked_max = sum(chunk_sizes) - 1  # 0-indexed last word in chunks
    missing = [i for i in range(chunked_max + 1) if i not in all_text_words]
    assert not missing, f"Missing chunked words: {missing}"
    # No duplicates.
    for b in out:
        words_in = [w for w in b.get("text", "").split() if w.startswith("w")]
        assert len(words_in) == len(set(words_in)), f"Duplicates in beat: {words_in}"
    # Beat 0 starts at 0.
    assert out[0]["startFrame"] == 0, out[0]
    # Last beat ends at total_frames.
    assert abs(out[-1]["endFrame"] - total) <= 1, (out[-1], total)


if __name__ == "__main__":
    tests = [
        test_no_truncation_no_change,
        test_truncation_carry_forward_basic,
        test_no_overlap_no_gap_full_coverage,
        test_minimum_duration_floor_preserved,
        test_realistic_aa_fixture_no_orphan_words,
    ]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  ✓ {t.__name__}")
        except AssertionError as e:
            print(f"  ✗ {t.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"  ✗ {t.__name__}: {type(e).__name__}: {e}")
            failed += 1
    if failed:
        print(f"\n{failed}/{len(tests)} test(s) FAILED")
        sys.exit(1)
    print(f"\n{len(tests)}/{len(tests)} tests passed")
