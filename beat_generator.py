#!/root/kinetic_typo_vid/venv/bin/python3
"""
beat_generator.py
Step 5 of the Shorts pipeline: generate typed, frame-accurate beats from script + word timestamps.

Usage:
    python beat_generator.py --script script.txt --timestamps word_timestamps.json --story story.json --output beats.json
    python beat_generator.py --project-dir output/09_08_short_vids/08_09_01_groq-gpt-oss-120b_story_slug
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Add parent directory to path for llm_client
sys.path.insert(0, str(Path(__file__).parent))
import llm_client


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

FPS = 30
# Horizon 3.3: cap raised to 180 (6s) for long quotes, floor raised to 45 (1.5s).
# Hard ceiling still 200 (~6.7s) for the emergency force-fix path.
MAX_BEAT_FRAMES = 180                  # target cap (~6.0s)
MAX_BEAT_FRAMES_SOFT = 180             # beats > 6s get trimmed, not split
MAX_BEAT_FRAMES_HARD = 200             # absolute ceiling (~6.7s)
MIN_BEAT_FRAMES = 45  # Minimum beat duration (1.5s)

# Valid beat types that map to Remotion components.
# Horizon 3.2: expanded to expose the 2.1.x components to the LLM so the
# diversity-budget prompt rules can actually be satisfied.
# 3.5: added per-type FIELD_HINTS — short descriptions of what each
# metadata field holds, exposed to the LLM via the prompt so it knows
# what to put there.
BEAT_TYPES = {
    "key_statement": ["emphasisWords"],
    "headline_card": ["emphasisWords"],
    "icon_text": ["icon"],
    "chart_line": ["points"],
    "map_location": ["locationName", "latitude", "longitude"],
    "map_3d": ["locationName", "latitude", "longitude", "buildings"],
    "quote_card": ["quote", "attribution"],
    "quote_attribution": ["quote", "attribution"],
    "progress_meter": ["value", "maxValue", "label"],
    "timeline": ["events"],
    "process_flow": ["steps"],
    "versus": ["left", "right"],
    "before_after": ["beforeLabel", "afterLabel"],
    "stat_pill": ["value", "label"],
    "compare_split": ["left", "right"],
    "location_pulse": ["locationName", "latitude", "longitude"],
    "scrollytelling": ["title", "body"],
    "ticker_tape": ["stories", "label"],
}

# Per-type descriptions of metadata fields, exposed verbatim in the prompt.
# These tell the LLM exactly what each field should contain.
BEAT_TYPE_FIELD_HINTS = {
    "versus": {
        "left": "Short label, LEFT side (3-8 words)",
        "right": "Short label, RIGHT side (3-8 words)",
    },
    "compare_split": {
        "left": "Short label, LEFT side (3-8 words)",
        "right": "Short label, RIGHT side (3-8 words)",
    },
    "before_after": {
        "beforeLabel": "Label for BEFORE state (3-8 words)",
        "afterLabel": "Label for AFTER state (3-8 words)",
    },
    "quote_card": {
        "quote": "Actual quoted text, 5-25 words",
        "attribution": "Who said it (name or role)",
    },
    "quote_attribution": {
        "quote": "Actual quoted text, 5-25 words",
        "attribution": "Who said it (name or role)",
    },
    "progress_meter": {
        "value": "Numeric current value",
        "maxValue": "Numeric max value (default 100)",
        "label": "Short label like 'Adoption'",
    },
    "stat_pill": {
        "value": "Numeric or short string (e.g. '10%', '$2B')",
        "label": "Short label like 'stock drop'",
    },
    "icon_text": {
        "icon": "Single emoji matching the text",
    },
    "chart_line": {
        "points": "Array of {label, value}, 3-7 points, numeric",
    },
    "timeline": {
        "events": "Array of {date, label}, 3-6 events",
    },
    "process_flow": {
        "steps": "Array of step strings, 3-5 short steps",
    },
    "map_location": {
        "locationName": "Real named location from script",
        "latitude": "Numeric latitude (e.g. 51.5074)",
        "longitude": "Numeric longitude (e.g. -0.1278)",
    },
    "map_3d": {
        "locationName": "Real named location from script",
        "latitude": "Numeric latitude",
        "longitude": "Numeric longitude",
        "buildings": "Array of 0-3 building names",
    },
    "location_pulse": {
        "locationName": "Real named location from script",
        "latitude": "Numeric latitude",
        "longitude": "Numeric longitude",
    },
    "scrollytelling": {
        "title": "Short title (3-8 words)",
        "body": "1-2 sentence body",
    },
    "ticker_tape": {
        "stories": "Array of 3-6 short headlines",
        "label": "Short label like 'Markets'",
    },
    "key_statement": {
        "emphasisWords": "Array of 1-3 words/phrases",
    },
    "headline_card": {
        "emphasisWords": "Array of 1-3 words/phrases",
    },
}

# One example per complex type, exposed in the prompt. Keeps the LLM
# honest about field shapes without inflating prompt size.
BEAT_TYPE_EXAMPLES = {
    "versus":          {"type": "versus", "text": "example contrast", "left": "Phone AI", "right": "Robot AI"},
    "compare_split":   {"type": "compare_split", "text": "delivery time", "left": "Before: 3 weeks", "right": "After: 1 day"},
    "before_after":    {"type": "before_after", "beforeLabel": "Pre-IPO", "afterLabel": "Post-IPO"},
    "quote_card":      {"type": "quote_card", "quote": "The math doesn't work", "attribution": "Investors"},
    "quote_attribution": {"type": "quote_attribution", "quote": "We can't keep ignoring this", "attribution": "Labor groups"},
    "progress_meter":  {"type": "progress_meter", "value": 73, "maxValue": 100, "label": "Customer concern"},
    "stat_pill":       {"type": "stat_pill", "value": "10%", "label": "Share drop"},
    "timeline":        {"type": "timeline", "events": [{"date": "2021", "label": "IPO filed"}, {"date": "2024", "label": "Approved"}, {"date": "Today", "label": "Shares drop 10%"}]},
    "process_flow":    {"type": "process_flow", "steps": ["Design", "Manufacture", "Ship", "Sell"]},
    "chart_line":      {"type": "chart_line", "points": [{"label": "Q1", "value": 10}, {"label": "Q2", "value": 25}, {"label": "Q3", "value": 18}]},
    "map_location":    {"type": "map_location", "locationName": "London", "latitude": 51.5074, "longitude": -0.1278},
    "location_pulse":  {"type": "location_pulse", "locationName": "Shenzhen HQ", "latitude": 22.5431, "longitude": 114.0579},
    "scrollytelling":  {"type": "scrollytelling", "title": "Why It Matters", "body": "Fast fashion's supply chain is global, but accountability is local."},
    "ticker_tape":     {"type": "ticker_tape", "stories": ["Shein IPO down 10%", "Critics warn of oversupply", "Venture capital exits"], "label": "Markets"},
    "icon_text":       {"type": "icon_text", "icon": "📉"},
}

# Types that can be auto-split if too long.
# 3.3: trimming handles most oversize beats now, so we only split the truly
# oversized ones (> MAX_BEAT_FRAMES_HARD) where no other option works.
SPLITTABLE_TYPES = {"key_statement", "icon_text", "versus", "headline_card"}

# Diversity budget required by the 3.2 prompt. The LLM is told it MUST include
# at least one of these somewhere in the story.
DIVERSITY_REQUIRED = ["chart_line", "map_3d", "quote_attribution"]
DIVERSITY_DATA_VIS = ["progress_meter", "timeline", "process_flow"]

# Prompt size limits to stay under Groq free tier TPM (8000)
MAX_SCRIPT_WORDS_IN_PROMPT = 170
MAX_SENTENCES_IN_PROMPT = 6
MAX_STORY_FACTS_CHARS = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def seconds_to_frames(seconds: float) -> int:
    return int(round(seconds * FPS))


def frames_to_seconds(frames: int) -> float:
    return frames / FPS


def word_idx_to_frame(word_timestamps: list[dict], word_idx: int) -> int:
    """Convert word index to frame number using word timestamp start."""
    if not word_timestamps:
        return 0
    if word_idx >= len(word_timestamps):
        word_idx = len(word_timestamps) - 1
    if word_idx < 0:
        word_idx = 0
    return seconds_to_frames(word_timestamps[word_idx]["start"])


def word_idx_to_end_frame(word_timestamps: list[dict], word_idx: int) -> int:
    """Convert word index to frame number using word timestamp end."""
    if not word_timestamps:
        return 0
    if word_idx >= len(word_timestamps):
        word_idx = len(word_timestamps) - 1
    if word_idx < 0:
        word_idx = 0
    return seconds_to_frames(word_timestamps[word_idx]["end"])


def normalize_word(word: str) -> str:
    """Normalize word for comparison: lowercase, strip punctuation."""
    return word.strip(".,!?;:\"'()[]{}").lower()


def target_frames_for_word_count(word_count: int) -> int:
    """Horizon 3.3: auto-tuning formula. Returns target frame count for a beat
    of N words. Floor 45 (1.5s), ceiling 180 (6.0s), linear in between."""
    return max(MIN_BEAT_FRAMES, min(MAX_BEAT_FRAMES, int(round(word_count * 4.5))))


def compute_pacing(text: str) -> str:
    """Horizon 3.4: derive a per-beat pacing hint from word count.
    - fast: 1–3 words  (rapid stat callouts)
    - normal: 4–8 words (default)
    - slow: 9+ words   (long quotes, explanations)
    """
    word_count = len(text.split()) if text else 0
    if word_count <= 3:
        return "fast"
    if word_count <= 8:
        return "normal"
    return "slow"


def build_word_index_map(word_timestamps: list[dict], script: str) -> list[int]:
    """
    Map each word in the script to its index in word_timestamps using
    a robust sequence alignment (dynamic programming / LCS-based).
    Returns list of word_timestamps indices, one per script word.
    """
    script_words = script.strip().split()
    ts_words = [normalize_word(w["word"]) for w in word_timestamps]
    script_norm = [normalize_word(w) for w in script_words]
    
    # Use dynamic programming to find the longest common subsequence alignment
    # This is essentially the Needleman-Wunsch algorithm for sequence alignment
    n, m = len(script_norm), len(ts_words)
    
    # DP table for LCS length
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            if script_norm[i - 1] == ts_words[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    
    # Backtrack to find alignment
    mapping = [-1] * n
    i, j = n, m
    while i > 0 and j > 0:
        if script_norm[i - 1] == ts_words[j - 1]:
            mapping[i - 1] = j - 1
            i -= 1
            j -= 1
        elif dp[i - 1][j] >= dp[i][j - 1]:
            i -= 1
        else:
            j -= 1
    
    # Fill in any unmatched script words by interpolating between matched neighbors
    last_matched_ts = -1
    last_matched_script = -1
    
    for i in range(n):
        if mapping[i] != -1:
            # This word is matched
            last_matched_ts = mapping[i]
            last_matched_script = i
        else:
            # Unmatched - find next matched word to interpolate
            next_matched_ts = -1
            next_matched_script = -1
            for k in range(i + 1, n):
                if mapping[k] != -1:
                    next_matched_ts = mapping[k]
                    next_matched_script = k
                    break
            
            if last_matched_ts >= 0 and next_matched_ts >= 0:
                # Interpolate proportionally
                script_span = next_matched_script - last_matched_script
                ts_span = next_matched_ts - last_matched_ts
                if script_span > 0:
                    ratio = (i - last_matched_script) / script_span
                    mapping[i] = last_matched_ts + int(round(ratio * ts_span))
                else:
                    mapping[i] = last_matched_ts
            elif last_matched_ts >= 0:
                mapping[i] = last_matched_ts
            elif next_matched_ts >= 0:
                mapping[i] = next_matched_ts
            else:
                mapping[i] = 0
    
    # Clamp to valid range
    mapping = [max(0, min(m, m - 1)) for m in mapping]
    
    return mapping


def assign_frames_from_word_ranges(
    beats: list[dict],
    word_timestamps: list[dict],
    script: str
) -> list[dict]:
    """
    Convert word indices (startWord/endWord) to frame numbers using Whisper timestamps.
    This is the single source of truth for frame timing.

    Horizon 3.3: after computing the natural Whisper-aligned duration, trim
    each beat to its word-count-based cap (max(45, min(180, wordCount*4.5))).
    Beats that still exceed the cap after trimming are kept at the cap — the
    split path (split_long_beats) handles only true oversize (>200 frames).
    """
    if not word_timestamps:
        return beats
    
    word_map = build_word_index_map(word_timestamps, script)
    script_words = script.strip().split()
    total_frames = word_idx_to_end_frame(word_timestamps, len(word_timestamps) - 1)
    
    result = []
    for beat in beats:
        beat_copy = beat.copy()
        
        start_word = beat.get("startWord", 0)
        end_word = beat.get("endWord", len(script_words) - 1)
        
        # Clamp to valid script word range
        start_word = max(0, min(start_word, len(script_words) - 1))
        end_word = max(start_word, min(end_word, len(script_words) - 1))
        
        # Map to timestamp indices
        start_ts_idx = word_map[start_word] if start_word < len(word_map) else len(word_map) - 1
        end_ts_idx = word_map[end_word] if end_word < len(word_map) else len(word_map) - 1
        
        # Calculate frames from Whisper timestamps
        start_frame = word_idx_to_frame(word_timestamps, start_ts_idx)
        end_frame = word_idx_to_end_frame(word_timestamps, end_ts_idx)
        
        # 3.3: trim to word-count-based cap (don't split — splitting destroys
        # the LLM's narrative chunking). split_long_beats() handles true
        # oversize beats separately.
        word_count = end_word - start_word + 1
        cap = target_frames_for_word_count(word_count)
        if end_frame - start_frame > cap:
            end_frame = start_frame + cap
        
        # Ensure minimum duration
        if end_frame - start_frame < MIN_BEAT_FRAMES:
            end_frame = start_frame + MIN_BEAT_FRAMES
        
        # Clamp to total duration
        end_frame = min(end_frame, total_frames)
        
        beat_copy["startFrame"] = start_frame
        beat_copy["endFrame"] = end_frame
        beat_copy["durationInFrames"] = end_frame - start_frame

        # Remove word indices from output (they were only for LLM→Python handoff)
        beat_copy.pop("startWord", None)
        beat_copy.pop("endWord", None)

        result.append(beat_copy)
    
    return result


def should_split_beat(beat: dict) -> bool:
    """Determine if a beat should be split based on duration and type.
    Horizon 3.3: only split when the beat exceeds MAX_BEAT_FRAMES_HARD, since
    assign_frames_from_word_ranges() already trims beats down to MAX_BEAT_FRAMES."""
    dur = beat.get("durationInFrames", 0)
    beat_type = beat.get("type", "")
    
    if beat_type not in SPLITTABLE_TYPES:
        return False
    if dur <= MAX_BEAT_FRAMES_HARD:
        return False  # trim path handles this
    return True       # must split — exceeds hard limit


def split_long_beat(beat: dict, word_timestamps: list[dict], script: str, word_map: list[int]) -> list[dict]:
    """
    Split a single beat that's too long into multiple beats of ~MAX_BEAT_FRAMES each.
    Uses actual word timestamps to calculate frame boundaries for each split.
    """
    beat_type = beat.get("type", "")
    start_frame = beat.get("startFrame", 0)
    end_frame = beat.get("endFrame", 0)
    duration = end_frame - start_frame
    
    if not should_split_beat(beat):
        return [beat]
    
    beat_text = beat.get("text", "").strip()
    if not beat_text:
        return [beat]
    
    beat_words = beat_text.split()
    script_words = script.strip().split()
    
    # Find start word index in script
    try:
        start_word_idx = script_words.index(beat_words[0])
    except ValueError:
        # Try fuzzy match
        start_word_idx = -1
        for i, sw in enumerate(script_words):
            if normalize_word(sw) == normalize_word(beat_words[0]):
                start_word_idx = i
                break
        if start_word_idx == -1:
            return [beat]
    
    end_word_idx = min(start_word_idx + len(beat_words), len(word_map))
    if start_word_idx >= end_word_idx or start_word_idx >= len(word_map):
        return [beat]
    
    beat_word_indices = word_map[start_word_idx:end_word_idx]
    if len(beat_word_indices) < 2:
        return [beat]
    
    # Split by accumulating frame duration from word timestamps
    result = []
    current_word_start = 0
    current_start_frame = start_frame
    
    # Calculate how many splits we need (target MAX_BEAT_FRAMES each)
    num_splits = max(2, (duration + MAX_BEAT_FRAMES - 1) // MAX_BEAT_FRAMES)
    
    for split_idx in range(num_splits):
        if current_word_start >= len(beat_word_indices):
            break
            
        # For the last split, take all remaining words
        if split_idx == num_splits - 1:
            current_word_end = len(beat_word_indices)
        else:
            # Find the word index where accumulated frame duration reaches ~MAX_BEAT_FRAMES
            current_word_end = current_word_start + 1
            while current_word_end < len(beat_word_indices):
                test_end_ts_idx = beat_word_indices[current_word_end - 1]
                test_end_frame = word_idx_to_end_frame(word_timestamps, test_end_ts_idx)
                if test_end_frame - current_start_frame >= MAX_BEAT_FRAMES:
                    break
                current_word_end += 1
            
            # Ensure we leave enough words for remaining splits
            min_remaining = num_splits - split_idx - 1
            if current_word_end > len(beat_word_indices) - min_remaining:
                current_word_end = len(beat_word_indices) - min_remaining
        
        if current_word_start >= current_word_end:
            break
            
        split_word_indices = beat_word_indices[current_word_start:current_word_end]
        split_text = " ".join(beat_words[current_word_start:current_word_end])
        
        # Calculate frame boundaries from word timestamps
        split_start_ts_idx = split_word_indices[0]
        split_end_ts_idx = split_word_indices[-1]
        
        split_start_frame = word_idx_to_frame(word_timestamps, split_start_ts_idx)
        split_end_frame = word_idx_to_end_frame(word_timestamps, split_end_ts_idx)
        
        # Ensure minimum duration
        if split_end_frame - split_start_frame < MIN_BEAT_FRAMES:
            split_end_frame = split_start_frame + MIN_BEAT_FRAMES
        
        # Don't exceed original beat boundaries
        split_start_frame = max(split_start_frame, current_start_frame)
        split_end_frame = min(split_end_frame, end_frame)
        
        if split_end_frame <= split_start_frame:
            split_end_frame = split_start_frame + MIN_BEAT_FRAMES
            split_end_frame = min(split_end_frame, end_frame)
        
        new_beat = beat.copy()
        new_beat["text"] = split_text
        new_beat["startFrame"] = split_start_frame
        new_beat["endFrame"] = split_end_frame
        new_beat["durationInFrames"] = split_end_frame - split_start_frame
        
        result.append(new_beat)
        current_start_frame = split_end_frame
        current_word_start = current_word_end
    
    # Ensure the last beat ends exactly at the original end_frame
    if result:
        result[-1]["endFrame"] = end_frame
        result[-1]["durationInFrames"] = end_frame - result[-1]["startFrame"]
    
    # Filter out any beats with non-positive duration
    result = [b for b in result if b["durationInFrames"] > 0]
    
    return result if result else [beat]


def split_long_beats(beats: list[dict], word_timestamps: list[dict], script: str) -> list[dict]:
    """
    Split beats longer than MAX_BEAT_FRAMES_HARD if they're splittable types.
    Re-assigns frame boundaries using word timestamps.
    """
    word_map = build_word_index_map(word_timestamps, script)
    result = []
    
    for beat in beats:
        split_beats = split_long_beat(beat, word_timestamps, script, word_map)
        result.extend(split_beats)
    
    return result


def validate_beats(beats: list[dict], word_timestamps: list[dict], script: str) -> list[str]:
    """Validate beat structure and frame boundaries. Returns list of errors."""
    errors = []
    total_frames = word_idx_to_end_frame(word_timestamps, len(word_timestamps) - 1) if word_timestamps else 0
    
    for i, beat in enumerate(beats):
        # Required fields
        for field in ["type", "text", "startFrame", "endFrame", "durationInFrames"]:
            if field not in beat:
                errors.append(f"Beat {i}: missing required field '{field}'")
        
        beat_type = beat.get("type", "")
        if beat_type not in BEAT_TYPES:
            errors.append(f"Beat {i}: invalid type '{beat_type}'")
            continue
        
        # Type-specific required fields
        for req_field in BEAT_TYPES[beat_type]:
            if req_field not in beat:
                errors.append(f"Beat {i} ({beat_type}): missing required field '{req_field}'")
            # 3.5: also flag empty string values for required string fields
            elif req_field in ("left", "right", "beforeLabel", "afterLabel",
                               "quote", "attribution", "label", "title", "body",
                               "locationName"):
                field_value = beat[req_field]
                if isinstance(field_value, str) and field_value.strip() == "":
                    errors.append(f"Beat {i} ({beat_type}): empty (or whitespace-only) required field '{req_field}'")
        
        # Frame validation
        start = beat.get("startFrame", 0)
        end = beat.get("endFrame", 0)
        dur = beat.get("durationInFrames", 0)
        
        if start < 0:
            errors.append(f"Beat {i}: startFrame < 0")
        if end > total_frames:
            errors.append(f"Beat {i}: endFrame {end} exceeds total duration {total_frames}")
        if dur != end - start:
            errors.append(f"Beat {i}: durationInFrames {dur} != endFrame - startFrame ({end - start})")
        if dur <= 0:
            errors.append(f"Beat {i}: non-positive duration ({dur})")
        if dur < MIN_BEAT_FRAMES:
            errors.append(f"Beat {i}: duration {dur} frames below min {MIN_BEAT_FRAMES}")
        # Only warn if exceeds SOFT limit for splittable types
        if dur > MAX_BEAT_FRAMES_SOFT and beat_type in SPLITTABLE_TYPES:
            errors.append(f"Beat {i}: duration {dur} frames exceeds soft max {MAX_BEAT_FRAMES_SOFT} for splittable type")
    
    # Check for gaps/overlaps
    for i in range(len(beats) - 1):
        if beats[i]["endFrame"] != beats[i + 1]["startFrame"]:
            errors.append(f"Beats {i}-{i+1}: gap/overlap (endFrame={beats[i]['endFrame']}, next startFrame={beats[i+1]['startFrame']})")
    
    return errors


def auto_fix_frames(beats: list[dict], word_timestamps: list[dict], script: str) -> list[dict]:
    """
    Fix frame alignment by ensuring sequential continuity.
    Does NOT re-match text - just snaps each beat's start to previous beat's end.
    Preserves the last beat's end frame (total duration).
    """
    if not beats:
        return beats

    fixed = []
    for i, beat in enumerate(beats):
        beat_copy = beat.copy()

        if i == 0:
            # First beat keeps its calculated start frame
            fixed.append(beat_copy)
        else:
            # Each subsequent beat starts where previous ended
            prev_end = fixed[i - 1]["endFrame"]
            beat_copy["startFrame"] = prev_end
            # Keep the calculated end frame, but ensure minimum duration
            if beat_copy["endFrame"] - prev_end < MIN_BEAT_FRAMES:
                beat_copy["endFrame"] = prev_end + MIN_BEAT_FRAMES
            beat_copy["durationInFrames"] = beat_copy["endFrame"] - beat_copy["startFrame"]
            fixed.append(beat_copy)

    # Ensure last beat ends at total duration
    total_frames = word_idx_to_end_frame(word_timestamps, len(word_timestamps) - 1) if word_timestamps else 0
    if fixed:
        fixed[-1]["endFrame"] = total_frames
        fixed[-1]["durationInFrames"] = total_frames - fixed[-1]["startFrame"]
        # If last beat became too short, borrow from previous
        if fixed[-1]["durationInFrames"] < MIN_BEAT_FRAMES and len(fixed) > 1:
            fixed[-2]["endFrame"] = total_frames - MIN_BEAT_FRAMES
            fixed[-2]["durationInFrames"] = fixed[-2]["endFrame"] - fixed[-2]["startFrame"]
            fixed[-1]["startFrame"] = total_frames - MIN_BEAT_FRAMES
            fixed[-1]["durationInFrames"] = MIN_BEAT_FRAMES

    return fixed


def align_text_to_audio_window(beats: list[dict], word_timestamps: list[dict]) -> list[dict]:
    """Horizon 3.6: re-derive each beat's `text` from the AUDIO words that
    actually fall in [startFrame, endFrame] (not from the original script
    chunk assigned by the chunker in script_generator.py).

    The chunker in script_generator.py splits the SCRIPT into ~10-word
    slices and emits a `text` field per slice. The frame timing in
    `assign_frames_from_word_ranges` is derived from the AUDIO word
    indices (via LCS alignment in build_word_index_map), so the
    audio window for a given chunk drifts from the script slice:
      - TTS may render "one trillion dollars" (4 script words) as
        "$1 trillion" (2 audio words with a 1.4s gap), so the audio
        window for the first chunk of a David-Booth-style script
        contains only the first 4-5 script words.
      - Numbers get rewritten ("nine percent" -> "9%", "ten thousand
        dollars" -> "$10,000"), so the on-screen text needs to match
        what was actually said.
    Without this, every beat's `text` is one beat ahead of the audio
    (e.g. beat 0 text says "David Booth manages over one trillion
    dollars, but he says" but the audio during beat 0 only says
    "David Booth manages over").

    The original script chunk is preserved under `scriptText` so the
    LLM's emphasis-word metadata (which keys off the script words)
    still resolves — see `extract_emphasis_words` callers.

    This MUST be called after the final `auto_fix_frames` so the
    audio text matches the snapped frame windows, not the natural
    ones.
    """
    if not word_timestamps:
        return beats

    for beat in beats:
        start_frame = beat.get("startFrame", 0)
        end_frame = beat.get("endFrame", start_frame)
        s_sec = start_frame / FPS
        e_sec = end_frame / FPS
        audio_words_in_window = [
            w["word"] for w in word_timestamps
            if w["start"] >= s_sec - 0.001 and w["end"] <= e_sec + 0.001
        ]
        if audio_words_in_window:
            if "text" in beat and "scriptText" not in beat:
                beat["scriptText"] = beat["text"]
            beat["text"] = " ".join(audio_words_in_window)
    return beats


def force_fix_beats(beats: list[dict], word_timestamps: list[dict]) -> list[dict]:
    """EMERGENCY FALLBACK ONLY: redistribute frames evenly across beats to ensure validity.
    This destroys semantic timing — use only when all else fails."""
    if not beats or not word_timestamps:
        return beats
    
    total_frames = word_idx_to_end_frame(word_timestamps, len(word_timestamps) - 1)
    num_beats = len(beats)
    
    if num_beats == 0:
        return beats
    
    # Calculate ideal duration per beat, capped at MAX_BEAT_FRAMES
    ideal_duration = total_frames // num_beats
    ideal_duration = max(MIN_BEAT_FRAMES, min(ideal_duration, MAX_BEAT_FRAMES))
    
    fixed = []
    current_start = 0
    
    for i, beat in enumerate(beats):
        beat_copy = beat.copy()
        
        remaining_beats = num_beats - i
        remaining_frames = total_frames - current_start
        
        # Calculate max frames this beat can take so remaining beats get at least MIN_BEAT_FRAMES
        max_this_beat = remaining_frames - (remaining_beats - 1) * MIN_BEAT_FRAMES
        # Cap at MAX_BEAT_FRAMES
        max_this_beat = min(max_this_beat, MAX_BEAT_FRAMES)
        # Ensure at least MIN_BEAT_FRAMES
        max_this_beat = max(max_this_beat, MIN_BEAT_FRAMES)
        
        if i == num_beats - 1:
            # Last beat gets all remaining frames
            beat_copy["startFrame"] = current_start
            beat_copy["endFrame"] = total_frames
        else:
            beat_copy["startFrame"] = current_start
            beat_copy["endFrame"] = current_start + max_this_beat
        
        beat_copy["durationInFrames"] = beat_copy["endFrame"] - beat_copy["startFrame"]
        
        # Final safety clamp
        if beat_copy["durationInFrames"] < MIN_BEAT_FRAMES:
            beat_copy["endFrame"] = beat_copy["startFrame"] + MIN_BEAT_FRAMES
            beat_copy["durationInFrames"] = MIN_BEAT_FRAMES
        elif beat_copy["durationInFrames"] > MAX_BEAT_FRAMES:
            beat_copy["endFrame"] = beat_copy["startFrame"] + MAX_BEAT_FRAMES
            beat_copy["durationInFrames"] = MAX_BEAT_FRAMES
        
        fixed.append(beat_copy)
        current_start = beat_copy["endFrame"]
    
    # Final adjustment to ensure last beat ends at total_frames
    if fixed:
        fixed[-1]["endFrame"] = total_frames
        fixed[-1]["durationInFrames"] = total_frames - fixed[-1]["startFrame"]
        # If last beat is now too long, pull back from previous
        if fixed[-1]["durationInFrames"] > MAX_BEAT_FRAMES and len(fixed) > 1:
            excess = fixed[-1]["durationInFrames"] - MAX_BEAT_FRAMES
            fixed[-2]["endFrame"] -= excess
            fixed[-2]["durationInFrames"] = fixed[-2]["endFrame"] - fixed[-2]["startFrame"]
            fixed[-1]["startFrame"] = fixed[-2]["endFrame"]
            fixed[-1]["durationInFrames"] = MAX_BEAT_FRAMES
        # If last beat is too short, borrow from previous
        elif fixed[-1]["durationInFrames"] < MIN_BEAT_FRAMES and len(fixed) > 1:
            needed = MIN_BEAT_FRAMES - fixed[-1]["durationInFrames"]
            if fixed[-2]["durationInFrames"] > MIN_BEAT_FRAMES + needed:
                fixed[-2]["endFrame"] -= needed
                fixed[-2]["durationInFrames"] = fixed[-2]["endFrame"] - fixed[-2]["startFrame"]
                fixed[-1]["startFrame"] = fixed[-2]["endFrame"]
                fixed[-1]["durationInFrames"] = MIN_BEAT_FRAMES
    
    return fixed


# ---------------------------------------------------------------------------
# Story-arc planning (Horizon 3.1)
# ---------------------------------------------------------------------------

ARC_TYPES = {
    "intro":   ["headline_card", "key_statement", "quote_attribution"],
    "explain": ["icon_text", "progress_meter", "timeline", "process_flow", "chart_line", "stat_pill"],
    "compare": ["versus", "before_after", "compare_split", "chart_comparison_3d"],
    "climax":  ["quote_card", "map_3d", "location_pulse", "scrollytelling"],
    "outro":   ["key_statement", "quote_attribution", "stat_pill", "ticker_tape"],
}


def plan_story_arc(script: str, story: dict, model_key: str = None) -> list[str]:
    """Horizon 3.1 — second LLM pass. Returns an ordered list of arc labels,
    one per beat in the pre-chunked list. Falls back to a default shape if
    the LLM call fails.

    The LLM is told the BEAT_TYPES dict and ARC_TYPES so it knows what types
    map to each arc stage. Output is a JSON array of strings, e.g.
    ["intro", "explain", "compare", "climax", "outro"].

    Cost: ~$0.001/story on gpt-4o-mini (see ROADMAP §3 cost math).
    """
    try:
        beats_estimate = max(3, len(script.split()) // 10)
        prompt = f"""Plan a visual narrative arc for a short-form news video.

Story title: {story.get('title', '')}
Script (truncated): {script[:1500]}

You will produce {beats_estimate} arc labels, one per upcoming beat, in order.
Each label must be one of: intro, explain, compare, climax, outro.

GUIDE:
- intro: first 1 beat. Hook the viewer.
- explain: middle beats. Build context.
- compare: when there's a two-sided or temporal comparison.
- climax: the most dramatic beat. Reserve 1 for the end of the middle.
- outro: final 1 beat. Wrap up or call to action.

Typical shape: ["intro", "explain", "explain", "climax", "outro"].
For stories with comparisons, insert "compare" in the middle.

OUTPUT (JSON array of strings only, exactly {beats_estimate} entries):
["intro", "explain", "compare", "climax", "outro", ...]"""

        messages = [
            {"role": "system", "content": "You are a video narrative planner. Output only a valid JSON array of arc labels."},
            {"role": "user", "content": prompt},
        ]
        response = llm_client.call_llm(
            messages=messages,
            model_key=model_key,
            temperature=0.3,
            max_tokens=200,
        )

        if isinstance(response, str):
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            arc = json.loads(response.strip())
        else:
            arc = response

        if not isinstance(arc, list):
            raise ValueError("LLM did not return a list")

        # Validate + repair
        valid = {"intro", "explain", "compare", "climax", "outro"}
        out = []
        for label in arc:
            if label in valid:
                out.append(label)
            else:
                out.append("explain")
        if not out:
            out = ["intro"] + ["explain"] * (beats_estimate - 2) + ["outro"]
        return out

    except Exception as e:
        # Fallback arc: simple 5-beat shape scaled to expected length.
        print(f"  ⚠ plan_story_arc fallback (LLM failed: {e})")
        n = max(3, len(script.split()) // 10)
        if n == 3:
            return ["intro", "explain", "outro"]
        return ["intro"] + ["explain"] * (n - 2) + ["outro"]


def arc_allowed_types(arc_label: str) -> list[str]:
    """Return the list of allowed beat types for a given arc label."""
    return ARC_TYPES.get(arc_label, list(ARC_TYPES["explain"]))


def force_intro_to_headline_card(beats: list[dict]) -> list[dict]:
    """Horizon 3.1: enforce that beat 0 is a headline_card. Rebuilds the beat
    from scratch to avoid carrying fields that headline_card doesn't accept
    (icon, left, right, points, etc.)."""
    if not beats:
        return beats
    b = beats[0]
    if b.get("type") == "headline_card":
        return beats
    rebuilt = {
        "type": "headline_card",
        "text": b.get("text", ""),
        "startWord": b.get("startWord", 0),
        "endWord": b.get("endWord", 0),
        "emphasisWords": b.get("emphasisWords", []),
    }
    beats[0] = rebuilt
    return beats


# ---------------------------------------------------------------------------
# Prompt Construction
# ---------------------------------------------------------------------------

def build_prompt(script: str, word_timestamps: list[dict], story: dict, headline: str = "",
                 pre_chunked_beats: list[dict] = None,
                 story_arc: list[str] = None,
                 force_field_completion: bool = False,
                 empty_field_indices: list[int] = None) -> str:
    """Build the LLM prompt with all necessary context, keeping it under token limits."""
    
    # Truncate script to keep prompt small (only used when NO pre-chunked beats)
    script_words = script.strip().split()
    if len(script_words) > MAX_SCRIPT_WORDS_IN_PROMPT:
        script_words = script_words[:MAX_SCRIPT_WORDS_IN_PROMPT]
        truncated_script = " ".join(script_words) + "..."
        # Also truncate word_timestamps to match the truncated script
        word_timestamps = word_timestamps[:MAX_SCRIPT_WORDS_IN_PROMPT]
    else:
        truncated_script = script
    
    # Prepare sentence-level timing with word indices (limit to MAX_SENTENCES_IN_PROMPT)
    sentences = []
    current_sentence = []
    word_idx = 0
    
    for word in script_words:  # Now uses truncated script_words
        current_sentence.append(word)
        word_idx += 1
        if word.endswith((".", "!", "?")):
            sent_text = " ".join(current_sentence)
            # Find timestamp range for this sentence
            if word_idx <= len(word_timestamps):
                sent_ts = word_timestamps[word_idx - len(current_sentence):word_idx]
                if sent_ts:
                    start_sec = sent_ts[0]["start"]
                    end_sec = sent_ts[-1]["end"]
                    start_frame = seconds_to_frames(start_sec)
                    end_frame = seconds_to_frames(end_sec)
                    sentences.append({
                        "text": sent_text,
                        "startFrame": start_frame,
                        "endFrame": end_frame,
                        "durationFrames": end_frame - start_frame,
                    })
            current_sentence = []
    
    # Limit sentences in prompt
    if len(sentences) > MAX_SENTENCES_IN_PROMPT:
        sentences = sentences[:MAX_SENTENCES_IN_PROMPT]
        sentences.append({"text": "... (truncated)", "startFrame": 0, "endFrame": 0, "durationFrames": 0})
    
    # Story facts for metadata - limit size
    research = story.get("research", {}) if isinstance(story.get("research"), dict) else {}
    key_numbers = research.get("key_numbers", "")[:MAX_STORY_FACTS_CHARS]
    key_quotes = research.get("key_quotes", [])[:1]
    locations = research.get("locations", [])[:2]
    entities = research.get("entities", [])[:3]
    
    # Compact beat types for prompt
    beat_types_compact = {k: v for k, v in BEAT_TYPES.items()}

    # Per-type field hints (3.5) — tells the LLM what each metadata field
    # should contain. Without this, the LLM emits empty strings for fields
    # like versus.left / quote_card.quote because it doesn't know the
    # shape of the data those fields need.
    beat_types_with_hints = {}
    for btype, fields in BEAT_TYPES.items():
        hints = BEAT_TYPE_FIELD_HINTS.get(btype, {})
        beat_types_with_hints[btype] = {
            "fields": fields,
            "what_each_field_means": {f: hints[f] for f in fields if f in hints},
        }

    # One short example per type for the LLM to mirror
    beat_type_examples_compact = {
        btype: BEAT_TYPE_EXAMPLES[btype]
        for btype in BEAT_TYPES
        if btype in BEAT_TYPE_EXAMPLES
    }

    # 3.5.2: filter beat type catalog to only arc-eligible types (when a
    # story_arc is provided). key_statement and headline_card are always
    # included since they're fallback types used elsewhere in the pipeline.
    if story_arc:
        types_to_include = set()
        for label in story_arc:
            types_to_include.update(arc_allowed_types(label))
    else:
        types_to_include = set(BEAT_TYPES.keys())
    types_to_include.update({"key_statement", "headline_card"})

    beat_types_with_hints = {
        btype: beat_types_with_hints[btype]
        for btype in beat_types_with_hints
        if btype in types_to_include
    }
    beat_type_examples_compact = {
        btype: beat_type_examples_compact[btype]
        for btype in beat_type_examples_compact
        if btype in types_to_include
    }

    # Horizon 3.2 diversity budget
    diversity_section = f"""
DIVERSITY BUDGET (mandatory — your story MUST include at least one of each):
- Visual variety: include at least one of: {", ".join(DIVERSITY_REQUIRED)}
- Data-vis: include at least one of: {", ".join(DIVERSITY_DATA_VIS)}
- No more than 3 consecutive beats of the same type
"""

    # Horizon 3.1 story-arc constraint
    arc_section = ""
    if story_arc:
        arc_lines = []
        for i, label in enumerate(story_arc):
            allowed = arc_allowed_types(label)
            arc_lines.append(f"  beat {i+1}: arc='{label}' → allowed types: {allowed}")
        arc_section = f"""
STORY ARC (mandatory — pick a type from the allowed list for each beat):
{chr(10).join(arc_lines)}

Note: beat 1 is the intro — prefer 'headline_card' (the new 2.1.1 component) for
maximum hook impact. The orchestrator will force it to headline_card anyway, so
emit it as headline_card here.
"""

    if pre_chunked_beats:
        # ============================================================
        # MODE A: Pre-chunked beats provided — LLM ONLY assigns types + metadata
        # ============================================================
        # Build a compact list of chunks for the LLM
        chunks_for_llm = []
        for i, chunk in enumerate(pre_chunked_beats):
            chunks_for_llm.append({
                "index": i,
                "text": chunk["text"],
                "startWord": chunk["startWord"],
                "endWord": chunk["endWord"],
            })
        
        pre_chunked_section = f"""
PRE-CHUNKED BEATS (from script generator — YOU MUST USE THESE EXACT CHUNKS):
{json.dumps(chunks_for_llm, indent=2)}

CRITICAL RULES:
- You are given {len(pre_chunked_beats)} EXACT text chunks with their word indices.
- DO NOT re-chunk, merge, split, or rewrite the text.
- DO NOT output startWord/endWord — they are already fixed above.
- For EACH chunk, pick the BEST beat type and fill ONLY the required metadata fields.
- Output JSON with the SAME NUMBER of entries, in the SAME ORDER.
- Each output entry must have: "type" + the metadata fields for that type (see BEAT TYPES below).
- VARY the types — don't make everything "key_statement". Use versus, icon_text, map_location, quote_card, progress_meter, timeline, process_flow, before_after where appropriate.
- NEVER invent facts, numbers, coordinates, or quotes. Only use what's in the chunk text or story facts below.
"""
        prompt = f"""Assign a visual component type + metadata to each pre-chunked script segment.

SOURCE:
Title: {story.get("title", "")}

FACTS (metadata only, don't invent):
Numbers: {key_numbers}
Quotes: {json.dumps(key_quotes)}
Locations: {json.dumps(locations)}
Entities: {json.dumps(entities)}

BEAT TYPES (required metadata fields + what each field means):
{json.dumps(beat_types_with_hints, indent=2)}

EXAMPLES (mirror the shapes exactly — never invent facts not in the script or story):
{json.dumps(beat_type_examples_compact, indent=2)}
{arc_section}{diversity_section}{pre_chunked_section}

OUTPUT (JSON only — array of objects, one per chunk, in order):
[
  {{"type": "key_statement", "emphasisWords": ["word1", "word2"]}},
  {{"type": "versus", "left": "...", "right": "..."}},
  ...
]
"""
        # 3.5.2: print prompt size to confirm the truncation/filtering helped
        print(f"  → build_prompt (MODE A): {len(prompt)} chars")
        # 3.5.1: append a stronger nudge when retrying after empty-field detection
        if force_field_completion and empty_field_indices:
            prompt += f"""

CRITICAL RETRY NOTE — your previous attempt left these beats with empty required string fields:
{json.dumps([{"chunk_index": i, "chunk_text": pre_chunked_beats[i].get("text", "")[:80] + "..."} for i in empty_field_indices], indent=2)}

HARD RULES (no exceptions):
1. NEVER emit "" for any required string field. Empty strings = failure.
2. For `versus.left` / `versus.right`: extract or invent a clear two-sided contrast
   from the chunk text. If the text only mentions ONE side, the OTHER side is the
   obvious counterpoint (e.g. "phone AI" vs "robot AI", "supporters" vs "critics",
   "old way" vs "new way", "before" vs "after"). Both fields MUST be 3-8 words.
3. For `quote_card.quote` / `quote_attribution.quote`: if the chunk doesn't contain
   a direct quote, paraphrase the chunk's main point in quote form (5-15 words) and
   attribute to a logical speaker (e.g. "Analysts", "Critics", "The author", or a
   named entity from FACTS).
4. For `*_label` / `*_body` / `locationName`: use a short 1-5 word label from
   the chunk text. If nothing fits, use a generic but true label like
   "New development", "Industry shift", "Key stat", "Public reaction".
"""
        return prompt

    else:
        # ============================================================
        # MODE B: No pre-chunked beats — LLM does full chunking (legacy)
        # ============================================================
        prompt = f"""Convert narrated script into structured "beats" for motion-graphics video. Each beat maps to a React component.

IMPORTANT: Do NOT output frame numbers. Do NOT calculate timing. Only output beat type, text, semantic metadata, and WORD INDICES (startWord/endWord).

SOURCE:
Title: {story.get("title", "")}
Script: {truncated_script}

TIMING (30fps):
Total: {len(word_timestamps)} words, {seconds_to_frames(word_timestamps[-1]["end"])} frames
Sentences (for reference only):
{json.dumps(sentences)}

FACTS (metadata only, don't invent):
Numbers: {key_numbers}
Quotes: {json.dumps(key_quotes)}
Locations: {json.dumps(locations)}
Entities: {json.dumps(entities)}

BEAT TYPES:
{json.dumps(beat_types_compact)}
{arc_section}{diversity_section}

RULES:
1. One beat per sentence/key idea. Target ~10 words per beat.
2. Pick most specific type. Default: "key_statement".
3. Never invent facts/numbers/coordinates/quotes.
4. map_location: only real named locations. Use centroid coords.
5. quote_card: only actual attributed quotes.
6. timeline: only real chronological events with dates.
7. progress_meter: only explicit percentage data.
8. versus: only clear two-sided comparisons.
9. before_after: only clear before/after comparisons.
10. Vary types.
11. Output startWord/endWord as indices into the script word array (0-based).

OUTPUT (JSON only):
{{"beats": [{{"type": "key_statement", "text": "...", "emphasisWords": ["..."], "startWord": 0, "endWord": 8}}]}}"""
        return prompt


# ---------------------------------------------------------------------------
# Main Generation
# ---------------------------------------------------------------------------

def generate_beats(script: str, word_timestamps: list[dict], story: dict, headline: str = "",
                   model_key: str = None, pre_chunked_beats: list[dict] = None,
                   story_arc: list[str] = None) -> dict:
    """Call LLM to generate beats, validate, and return structured data."""
    
    # Horizon 3.1: if we have pre-chunked beats but no arc yet, plan one now.
    if pre_chunked_beats and not story_arc:
        story_arc = plan_story_arc(script, story, model_key)
    
    prompt = build_prompt(script, word_timestamps, story, headline, pre_chunked_beats, story_arc)
    
    # Use llm_client to call the model
    messages = [
        {"role": "system", "content": "You are a precise video beat planner. Output only valid JSON. When pre-chunked beats are provided, output ONLY type + metadata for each chunk — no text, no word indices. When no pre-chunked beats, output full beat objects with text and word indices."},
        {"role": "user", "content": prompt}
    ]
    
    # Use lower max_tokens to avoid hitting Groq TPM limit
    try:
        response = llm_client.call_llm(
            messages=messages,
            model_key=model_key,
            temperature=0.2,
            max_tokens=15000,
        )
    except Exception as e:
        print(f"  ⚠ LLM call failed: {e}")
        raise
    
    # Parse response
    try:
        if isinstance(response, str):
            # Extract JSON from potential markdown code blocks
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
            data = json.loads(response.strip())
        else:
            data = response
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nResponse: {response[:500]}")
    
    if pre_chunked_beats:
        # MODE A: LLM returned array of {type, metadata...} — merge with pre-chunked beats
        # BUT: LLM might ignore instructions and return full beat objects. Handle both.
        llm_assignments = data if isinstance(data, list) else data.get("beats", [])
        if not llm_assignments:
            raise ValueError("No beat assignments generated")
        
        if len(llm_assignments) != len(pre_chunked_beats):
            print(f"  ⚠ LLM returned {len(llm_assignments)} assignments but expected {len(pre_chunked_beats)}. Truncating/padding.")
            # Pad or truncate to match
            if len(llm_assignments) < len(pre_chunked_beats):
                # Pad with default key_statement
                while len(llm_assignments) < len(pre_chunked_beats):
                    llm_assignments.append({"type": "key_statement", "emphasisWords": []})
            else:
                llm_assignments = llm_assignments[:len(pre_chunked_beats)]
        
        # Merge: pre-chunked beat text + word indices + LLM type + metadata
        beats = []
        for i, (chunk, assignment) in enumerate(zip(pre_chunked_beats, llm_assignments)):
            # Handle both formats: MODE A (type + metadata only) or MODE B (full beat object)
            beat_type = assignment.get("type", "key_statement")
            if beat_type not in BEAT_TYPES:
                beat_type = "key_statement"
            
            # Horizon 3.1: if a story_arc was provided, clamp the LLM's pick to
            # the allowed list for that beat's arc label. This is a hard rule
            # — the orchestrator and the prompt both depend on arc compliance.
            if story_arc and i < len(story_arc):
                allowed = arc_allowed_types(story_arc[i])
                if beat_type not in allowed:
                    beat_type = allowed[0]
            
            beat = {
                "type": beat_type,
                "text": chunk["text"],
                "startWord": chunk["startWord"],
                "endWord": chunk["endWord"],
            }
            # Add type-specific metadata from LLM assignment
            empty_required_fields = []  # 3.5: track empty required strings for retry
            for field in BEAT_TYPES[beat_type]:
                raw_value = assignment.get(field)
                is_blank = (
                    raw_value is None
                    or raw_value in ([], 0, 0.0)
                    or (isinstance(raw_value, str) and raw_value.strip() == "")
                )
                if field in assignment and not is_blank:
                    beat[field] = raw_value
                else:
                    # Provide sensible defaults for required fields
                    if field == "emphasisWords":
                        beat[field] = []
                    elif field == "icon":
                        beat[field] = "📊"
                    elif field in ("left", "right", "beforeLabel", "afterLabel",
                                   "quote", "attribution", "label", "title", "body",
                                   "locationName"):
                        # 3.5: empty string fallback hides missing data.
                        # Track so caller can retry instead of producing blank beats.
                        beat[field] = ""
                        empty_required_fields.append(field)
                    elif field in ("latitude", "longitude"):
                        beat[field] = 0.0
                    elif field == "value":
                        beat[field] = 0
                    elif field == "maxValue":
                        beat[field] = 100
                    elif field == "events":
                        beat[field] = []
                    elif field == "steps":
                        beat[field] = []
                    elif field == "stories":
                        beat[field] = []
                    elif field == "points":
                        beat[field] = []
                    elif field == "buildings":
                        beat[field] = []
                    elif field == "prefix":
                        beat[field] = ""
                    elif field == "suffix":
                        beat[field] = ""
            beat["_empty_required_fields"] = empty_required_fields  # 3.5: used for retry decision

            beats.append(beat)
    
    else:
        # MODE B: Legacy — LLM returned full beat objects
        beats = data.get("beats", [])
        if not beats:
            raise ValueError("No beats generated")
    
    # Horizon 3.1: force beat 0 to headline_card
    beats = force_intro_to_headline_card(beats)
    
    # Horizon 3.4: compute per-beat pacing from text length and emit on each beat
    for beat in beats:
        if beat.get("text"):
            beat["pacing"] = compute_pacing(beat["text"])
        else:
            beat["pacing"] = "normal"
    
    # DEBUG: Print raw LLM output before any processing
    print("\n=== RAW LLM BEATS ===")
    print(json.dumps(beats, indent=2, ensure_ascii=False))
    print("=== END RAW LLM BEATS ===\n")
    
    # 3.5.1: detect LLM that produced empty required string fields. ANY
    # empty required field (left/right/quote/attribution/label) breaks
    # the render, so we always retry once with a stronger prompt.
    empty_beat_indices = [
        i for i, b in enumerate(beats)
        if b.get("_empty_required_fields")
    ]
    if empty_beat_indices:
        print(f"  ⚠ {len(empty_beat_indices)}/{len(beats)} beats have empty required fields — retrying LLM with stronger prompt")
        retry_prompt = build_prompt(
            script, word_timestamps, story, headline,
            pre_chunked_beats=pre_chunked_beats,
            story_arc=story_arc,
            force_field_completion=True,
            empty_field_indices=empty_beat_indices,
        )
        retry_messages = [
            {"role": "system", "content": "You are a precise video beat planner. CRITICAL: every required string field (left, right, quote, attribution, label, etc.) MUST be filled with real text from the script or story facts. NEVER emit empty strings. Output only valid JSON."},
            {"role": "user", "content": retry_prompt}
        ]
        try:
            retry_response = llm_client.call_llm(
                messages=retry_messages,
                model_key=model_key,
                temperature=0.1,  # 3.5.1: lower temp for retry — more deterministic on field completion
                max_tokens=8000,  # raised to avoid truncating long answers
            )
            # Re-parse and re-merge
            if isinstance(retry_response, str):
                if "```json" in retry_response:
                    retry_response = retry_response.split("```json")[1].split("```")[0]
                elif "```" in retry_response:
                    retry_response = retry_response.split("```")[1].split("```")[0]
                retry_data = json.loads(retry_response.strip())
            else:
                retry_data = retry_response
            retry_assignments = retry_data if isinstance(retry_data, list) else retry_data.get("beats", [])
            if len(retry_assignments) == len(beats):
                # Overwrite metadata on the beats that had empty fields.
                # 3.5.3: if the LLM returned a valid type for this beat, accept
                # the new type — otherwise we end up with a versus beat whose
                # _empty_required_fields is [] (because key_statement has no
                # required string fields) but left/right are still "".
                for idx in empty_beat_indices:
                    assignment = retry_assignments[idx]
                    if not isinstance(assignment, dict):
                        continue
                    beat_type = assignment.get("type", beats[idx].get("type", "key_statement"))
                    if beat_type not in BEAT_TYPES:
                        beat_type = beats[idx].get("type", "key_statement")
                    beats[idx]["type"] = beat_type  # accept the new type
                    still_empty = []
                    for field in BEAT_TYPES[beat_type]:
                        raw_value = assignment.get(field)
                        is_blank = (
                            raw_value is None
                            or raw_value in ([], 0, 0.0)
                            or (isinstance(raw_value, str) and raw_value.strip() == "")
                        )
                        if field in assignment and not is_blank:
                            beats[idx][field] = raw_value
                        elif field in ("left", "right", "beforeLabel", "afterLabel",
                                       "quote", "attribution", "label", "title", "body",
                                       "locationName"):
                            still_empty.append(field)
                    beats[idx]["_empty_required_fields"] = still_empty
                empty_beat_indices = [
                    i for i, b in enumerate(beats)
                    if b.get("_empty_required_fields")
                ]
                if empty_beat_indices:
                    print(f"  ⚠ After retry: {len(empty_beat_indices)} beats still have empty fields — falling back to key_statement")
        except Exception as e:
            print(f"  ⚠ Retry LLM call failed: {e} — falling back")

    # Final fallback: any beat that STILL has empty required string fields
    # gets demoted to key_statement (which only needs emphasisWords).
    demoted = 0
    final_beats = []
    for i, beat in enumerate(beats):
        if beat.get("_empty_required_fields"):
            demoted += 1
            beat = {
                "type": "key_statement",
                "text": beat["text"],
                "startWord": beat["startWord"],
                "endWord": beat["endWord"],
                "emphasisWords": beat.get("emphasisWords", []),
            }
        final_beats.append(beat)
    if demoted:
        print(f"  ⚠ Demoted {demoted} beat(s) with empty required fields to key_statement")
    beats = final_beats

    # Filter out malformed beats (missing text or invalid type)
    valid_beats = []
    for beat in beats:
        if not beat.get("text") or not beat.get("type"):
            continue
        if beat["type"] not in BEAT_TYPES:
            continue
        # Ensure startWord/endWord exist (for MODE B) or will be added from pre-chunked (MODE A)
        if "startWord" not in beat or "endWord" not in beat:
            continue
        valid_beats.append(beat)

    if not valid_beats:
        raise ValueError("No valid beats after filtering")

    beats = valid_beats
    
    # Convert word indices to frames using Whisper timestamps (3.3 trimming happens here)
    beats = assign_frames_from_word_ranges(beats, word_timestamps, script)

    # 3.5: strip the internal retry-tracking key before downstream validation
    for b in beats:
        b.pop("_empty_required_fields", None)
    # 3.5.4: strip dead metadata fields that don't belong to the beat's
    # final type. The retry path can change a beat's type (e.g. versus
    # → stat_pill) but leaves the original empty left/right/quote strings
    # in the dict. They pass validation (not required by the new type)
    # but they bloat the saved JSON. Keep only fields listed in
    # BEAT_TYPES[type] plus the always-present rendering fields.
    RENDER_FIELDS = {"type", "text", "startFrame", "endFrame",
                     "durationInFrames", "pacing"}
    for b in beats:
        btype = b.get("type", "")
        allowed = set(BEAT_TYPES.get(btype, [])) | RENDER_FIELDS
        for k in list(b.keys()):
            if k not in allowed:
                del b[k]
    
    # Validate initial beats. NOTE: gap/overlap issues here are EXPECTED
    # because word_timestamps has natural pauses between words. They are
    # auto-fixed below by auto_fix_frames(). Only print non-gap issues
    # to avoid noise — gaps will be re-checked after auto-fix.
    errors = validate_beats(beats, word_timestamps, script)
    if errors:
        gap_errors = [e for e in errors if "gap/overlap" in e]
        other_errors = [e for e in errors if "gap/overlap" not in e]
        if other_errors:
            print(f"  ⚠ Initial validation warnings: {len(other_errors)} non-gap issue(s)")
            for e in other_errors[:20]:
                print(f"     - {e}")
        else:
            print(f"  ⚠ Initial validation: {len(gap_errors)} gap(s) (auto-fixing)")
        # Try to auto-fix frame alignment
        beats = auto_fix_frames(beats, word_timestamps, script)
        errors = validate_beats(beats, word_timestamps, script)
        if errors:
            remaining_gaps = [e for e in errors if "gap/overlap" in e]
            remaining_other = [e for e in errors if "gap/overlap" not in e]
            if remaining_gaps:
                print(f"  ⚠ After auto-fix: {len(remaining_gaps)} gap(s) remain (will be force-fixed at end)")
            if remaining_other:
                print(f"  ⚠ After auto-fix: {len(remaining_other)} non-gap issue(s) remain")
                for e in remaining_other[:20]:
                    print(f"     - {e}")
    
    # Split beats that exceed the hard ceiling (only after 3.3 trim).
    # Most oversize beats are now handled by assign_frames_from_word_ranges.
    beats = split_long_beats(beats, word_timestamps, script)
    
    # Final validation and sequential alignment
    beats = auto_fix_frames(beats, word_timestamps, script)
    
    errors = validate_beats(beats, word_timestamps, script)
    if errors:
        # As last resort, force-fix by redistributing frames evenly
        print(f"  ⚠ Final validation issues, force-fixing (EMERGENCY): {errors}")
        beats = force_fix_beats(beats, word_timestamps)
        errors = validate_beats(beats, word_timestamps, script)
        if errors:
            raise ValueError(f"Beat validation failed after all fixes: {errors}")

    # Horizon 3.6: re-derive each beat's `text` from the AUDIO words in
    # its final frame window. MUST run after the final auto_fix_frames /
    # force_fix_beats, since those snap each beat's startFrame to the
    # previous beat's endFrame — the audio-text derivation has to match
    # the snapped window, not the natural one. See
    # `align_text_to_audio_window` for the full rationale.
    beats = align_text_to_audio_window(beats, word_timestamps)

    total_frames = beats[-1]["endFrame"] if beats else 0

    return {
        "fps": FPS,
        "totalDurationInFrames": total_frames,
        "beats": beats
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate typed beats from script + word timestamps")
    parser.add_argument("--script", type=str, help="Path to script.txt")
    parser.add_argument("--timestamps", type=str, help="Path to word_timestamps.json")
    parser.add_argument("--story", type=str, help="Path to story.json (or research_notes.json)")
    parser.add_argument("--headline", type=str, default="", help="Headline/hook text")
    parser.add_argument("--output", type=str, help="Output beats.json path")
    parser.add_argument("--project-dir", type=str, help="Project directory (auto-finds script/timestamps/story)")
    parser.add_argument("--model", type=str, default=None, help="LLM model key (default: from llm_client)")
    parser.add_argument("--skip-arc", action="store_true", help="Skip the Horizon 3.1 story-arc planning pass")
    args = parser.parse_args()

    # Resolve paths
    if args.project_dir:
        project_dir = Path(args.project_dir)
        script_path = project_dir / "script.txt"
        timestamps_path = project_dir / "word_timestamps.json"
        # Try story.json first (what run_pipeline.py creates), fallback to research_notes.json
        story_path = project_dir / "story.json"
        if not story_path.exists():
            story_path = project_dir / "research_notes.json"
        output_path = project_dir / "beats.json"
        headline_path = project_dir / "headline.txt"
        if headline_path.exists():
            args.headline = load_text(headline_path)
        
        # Load pre_chunked_beats if available
        pre_chunked_beats_path = project_dir / "pre_chunked_beats.json"
        pre_chunked_beats = None
        if pre_chunked_beats_path.exists():
            pre_chunked_beats = load_json(pre_chunked_beats_path)
            print(f"  Loaded {len(pre_chunked_beats)} pre-chunked beats")
        
        # Load pre-computed story arc (3.1) if available
        story_arc_path = project_dir / "story_arc.json"
        story_arc = None
        if not args.skip_arc and story_arc_path.exists():
            story_arc = load_json(story_arc_path)
            print(f"  Loaded story arc with {len(story_arc)} labels")
    else:
        if not all([args.script, args.timestamps, args.story, args.output]):
            parser.error("Either --project-dir OR all of --script --timestamps --story --output required")
        script_path = Path(args.script)
        timestamps_path = Path(args.timestamps)
        story_path = Path(args.story)
        output_path = Path(args.output)
        pre_chunked_beats = None
        story_arc = None

    # Load inputs
    print(f"Loading script: {script_path}")
    script = load_text(script_path)
    
    print(f"Loading word timestamps: {timestamps_path}")
    word_timestamps = load_json(timestamps_path)
    
    print(f"Loading story: {story_path}")
    story = load_json(story_path)
    
    print(f"Headline: {args.headline or '(none)'}")
    print(f"Script: {len(script.split())} words, {len(word_timestamps)} timestamps")

    # Generate beats
    print("Generating beats via LLM...")
    try:
        result = generate_beats(script, word_timestamps, story, args.headline, args.model, pre_chunked_beats, story_arc)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)

    # Write output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    
    print(f"✅ Generated {len(result['beats'])} beats → {output_path}")
    print(f"   Total duration: {result['totalDurationInFrames']} frames ({frames_to_seconds(result['totalDurationInFrames']):.1f}s)")
    
    # Print beat summary
    for i, beat in enumerate(result["beats"]):
        dur_s = frames_to_seconds(beat["durationInFrames"])
        pacing = beat.get("pacing", "normal")
        print(f"   {i+1:2d}. [{beat['type']:18s}] {beat['durationInFrames']:3d}f ({dur_s:.1f}s, {pacing:6s}) — {beat['text'][:60]}...")


if __name__ == "__main__":
    main()
