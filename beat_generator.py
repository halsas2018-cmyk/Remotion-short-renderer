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
MAX_BEAT_DURATION_SECONDS = 3.0
MAX_BEAT_FRAMES = int(MAX_BEAT_DURATION_SECONDS * FPS)        # 90 — target
MAX_BEAT_FRAMES_SOFT = MAX_BEAT_FRAMES + 20                   # 110 — allow up to ~3.7s
MAX_BEAT_FRAMES_HARD = MAX_BEAT_FRAMES + 40                   # 130 — absolute ceiling
MIN_BEAT_FRAMES = 30  # Minimum beat duration (0.5s)

# Valid beat types that map to Remotion components
BEAT_TYPES = {
    "key_statement": ["emphasisWords"],
    "icon_text": ["icon"],
    "versus": ["left", "right"],
    "map_location": ["locationName", "latitude", "longitude"],
    "quote_card": ["quote", "attribution"],
    "progress_meter": ["value", "maxValue", "label"],
    "timeline": ["events"],
    "process_flow": ["steps"],
    "before_after": ["beforeLabel", "afterLabel"],
}

# Types that can be auto-split if too long
SPLITTABLE_TYPES = {"key_statement", "icon_text", "versus"}

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
    """Determine if a beat should be split based on duration and type."""
    dur = beat.get("durationInFrames", 0)
    beat_type = beat.get("type", "")
    
    if beat_type not in SPLITTABLE_TYPES:
        return False
    if dur <= MAX_BEAT_FRAMES_SOFT:
        return False          # within buffer — keep as one beat
    if dur <= MAX_BEAT_FRAMES_HARD:
        return True           # split if easy (natural clause boundary)
    return True               # must split — exceeds hard limit


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
    Split beats longer than MAX_BEAT_DURATION_SECONDS if they're splittable types.
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


def force_fix_beats(beats: list[dict], word_timestamps: list[dict]) -> list[dict]:
    """EMERGENCY FALLBACK ONLY: redistribute frames evenly across beats to ensure validity.
    This destroys semantic timing — use only when all else fails."""
    if not beats or not word_timestamps:
        return beats
    
    total_frames = word_idx_to_end_frame(word_timestamps, len(word_timestamps) - 1)
    num_beats = len(beats)
    
    if num_beats == 0:
        return beats
    
    # Calculate ideal duration per beat
    ideal_duration = total_frames // num_beats
    ideal_duration = max(MIN_BEAT_FRAMES, min(ideal_duration, MAX_BEAT_FRAMES))
    
    fixed = []
    current_start = 0
    
    for i, beat in enumerate(beats):
        beat_copy = beat.copy()
        
        if i == num_beats - 1:
            # Last beat gets remaining frames
            beat_copy["startFrame"] = current_start
            beat_copy["endFrame"] = total_frames
        else:
            beat_copy["startFrame"] = current_start
            beat_copy["endFrame"] = current_start + ideal_duration
        
        beat_copy["durationInFrames"] = beat_copy["endFrame"] - beat_copy["startFrame"]
        
        # Ensure minimum duration
        if beat_copy["durationInFrames"] < MIN_BEAT_FRAMES:
            beat_copy["endFrame"] = beat_copy["startFrame"] + MIN_BEAT_FRAMES
            beat_copy["durationInFrames"] = MIN_BEAT_FRAMES
        
        fixed.append(beat_copy)
        current_start = beat_copy["endFrame"]
    
    # Final adjustment to ensure last beat ends at total_frames
    if fixed:
        fixed[-1]["endFrame"] = total_frames
        fixed[-1]["durationInFrames"] = total_frames - fixed[-1]["startFrame"]
    
    return fixed


# ---------------------------------------------------------------------------
# Prompt Construction
# ---------------------------------------------------------------------------

def build_prompt(script: str, word_timestamps: list[dict], story: dict, headline: str = "",
                 pre_chunked_beats: list[dict] = None) -> str:
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
Full script (for context): {truncated_script}

FACTS (metadata only, don't invent):
Numbers: {key_numbers}
Quotes: {json.dumps(key_quotes)}
Locations: {json.dumps(locations)}
Entities: {json.dumps(entities)}

BEAT TYPES + REQUIRED METADATA FIELDS:
{json.dumps(beat_types_compact)}
{pre_chunked_section}

OUTPUT (JSON only — array of objects, one per chunk, in order):
[
  {{"type": "key_statement", "emphasisWords": ["word1", "word2"]}},
  {{"type": "versus", "left": "...", "right": "..."}},
  ...
]
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
                   model_key: str = None, pre_chunked_beats: list[dict] = None) -> dict:
    """Call LLM to generate beats, validate, and return structured data."""
    
    prompt = build_prompt(script, word_timestamps, story, headline, pre_chunked_beats)
    
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
            max_tokens=6000,
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
            
            beat = {
                "type": beat_type,
                "text": chunk["text"],
                "startWord": chunk["startWord"],
                "endWord": chunk["endWord"],
            }
            # Add type-specific metadata from LLM assignment
            for field in BEAT_TYPES[beat_type]:
                if field in assignment:
                    beat[field] = assignment[field]
                else:
                    # Provide sensible defaults for required fields
                    if field == "emphasisWords":
                        beat[field] = []
                    elif field == "icon":
                        beat[field] = "📊"
                    elif field in ("left", "right"):
                        beat[field] = ""
                    elif field == "locationName":
                        beat[field] = "Unknown"
                    elif field in ("latitude", "longitude"):
                        beat[field] = 0.0
                    elif field == "quote":
                        beat[field] = ""
                    elif field == "attribution":
                        beat[field] = ""
                    elif field == "value":
                        beat[field] = 0
                    elif field == "maxValue":
                        beat[field] = 100
                    elif field == "label":
                        beat[field] = ""
                    elif field == "events":
                        beat[field] = []
                    elif field == "steps":
                        beat[field] = []
                    elif field in ("beforeLabel", "afterLabel"):
                        beat[field] = ""
            
            beats.append(beat)
    
    else:
        # MODE B: Legacy — LLM returned full beat objects
        beats = data.get("beats", [])
        if not beats:
            raise ValueError("No beats generated")
    
    # DEBUG: Print raw LLM output before any processing
    print("\n=== RAW LLM BEATS ===")
    print(json.dumps(beats, indent=2, ensure_ascii=False))
    print("=== END RAW LLM BEATS ===\n")
    
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
    
    # Convert word indices to frames using Whisper timestamps
    beats = assign_frames_from_word_ranges(beats, word_timestamps, script)
    
    # Validate initial beats
    errors = validate_beats(beats, word_timestamps, script)
    if errors:
        print(f"  ⚠ Initial validation warnings: {len(errors)} issues")
        # Try to auto-fix frame alignment
        beats = auto_fix_frames(beats, word_timestamps, script)
        errors = validate_beats(beats, word_timestamps, script)
        if errors:
            print(f"  ⚠ After auto-fix: {len(errors)} issues remain")
    
    # Split long beats (this is the main fix for over-duration beats)
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
    else:
        if not all([args.script, args.timestamps, args.story, args.output]):
            parser.error("Either --project-dir OR all of --script --timestamps --story --output required")
        script_path = Path(args.script)
        timestamps_path = Path(args.timestamps)
        story_path = Path(args.story)
        output_path = Path(args.output)
        pre_chunked_beats = None

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
        result = generate_beats(script, word_timestamps, story, args.headline, args.model, pre_chunked_beats)
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
        print(f"   {i+1:2d}. [{beat['type']:15s}] {beat['durationInFrames']:3d} frames ({dur_s:.1f}s) — {beat['text'][:60]}...")


if __name__ == "__main__":
    main()
