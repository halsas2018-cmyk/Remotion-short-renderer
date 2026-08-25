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
MAX_BEAT_FRAMES = int(MAX_BEAT_DURATION_SECONDS * FPS)  # 90 frames at 30fps
MIN_BEAT_FRAMES = 15  # Minimum beat duration (0.5s)

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
SPLITTABLE_TYPES = {"key_statement", "icon_text"}


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
    """Convert word index to frame number using word timestamp."""
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


def build_word_index_map(word_timestamps: list[dict], script: str) -> list[int]:
    """
    Map each word in the script to its index in word_timestamps.
    Returns list of word_timestamps indices, one per script word.
    """
    script_words = script.strip().split()
    ts_words = [w["word"].strip().lower() for w in word_timestamps]
    
    # Simple greedy matching
    mapping = []
    ts_idx = 0
    for sw in script_words:
        sw_clean = sw.strip(".,!?;:\"'()[]{}").lower()
        # Find next matching word in timestamps
        while ts_idx < len(ts_words):
            if ts_words[ts_idx] == sw_clean or sw_clean in ts_words[ts_idx] or ts_words[ts_idx] in sw_clean:
                mapping.append(ts_idx)
                ts_idx += 1
                break
            ts_idx += 1
        else:
            # Fallback: use last available index
            mapping.append(min(ts_idx, len(ts_words) - 1))
    return mapping


def split_long_beat(beat: dict, word_timestamps: list[dict], script: str, word_map: list[int]) -> list[dict]:
    """
    Split a single beat that's too long into multiple beats of ~MAX_BEAT_FRAMES each.
    Returns list of beats.
    """
    beat_type = beat.get("type", "")
    start_frame = beat.get("startFrame", 0)
    end_frame = beat.get("endFrame", 0)
    duration = end_frame - start_frame
    
    if duration <= MAX_BEAT_FRAMES or beat_type not in SPLITTABLE_TYPES:
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
            if sw.strip(".,!?;:\"'()[]{}").lower() == beat_words[0].strip(".,!?;:\"'()[]{}").lower():
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
    
    # Calculate how many splits we need
    num_splits = (duration + MAX_BEAT_FRAMES - 1) // MAX_BEAT_FRAMES
    words_per_split = max(1, len(beat_word_indices) // num_splits)
    
    result = []
    current_start_frame = start_frame
    current_word_start = 0
    
    for split_idx in range(num_splits):
        # Determine word range for this split
        if split_idx == num_splits - 1:
            # Last split gets remaining words
            current_word_end = len(beat_word_indices)
        else:
            current_word_end = min(current_word_start + words_per_split, len(beat_word_indices) - (num_splits - split_idx - 1))
        
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
        if dur > MAX_BEAT_FRAMES and beat_type in SPLITTABLE_TYPES:
            errors.append(f"Beat {i}: duration {dur} frames exceeds max {MAX_BEAT_FRAMES} for splittable type")
    
    # Check for gaps/overlaps
    for i in range(len(beats) - 1):
        if beats[i]["endFrame"] != beats[i + 1]["startFrame"]:
            errors.append(f"Beats {i}-{i+1}: gap/overlap (endFrame={beats[i]['endFrame']}, next startFrame={beats[i+1]['startFrame']})")
    
    return errors


def auto_fix_frames(beats: list[dict], word_timestamps: list[dict], script: str) -> list[dict]:
    """Attempt to fix frame alignment issues by snapping to word timestamps."""
    if not beats or not word_timestamps:
        return beats
    
    word_map = build_word_index_map(word_timestamps, script)
    script_words = script.strip().split()
    
    fixed = []
    for i, beat in enumerate(beats):
        beat_copy = beat.copy()
        beat_text = beat.get("text", "").strip()
        beat_words = beat_text.split()
        
        if not beat_words:
            fixed.append(beat_copy)
            continue
        
        # Find word range in script
        try:
            start_idx = script_words.index(beat_words[0])
        except ValueError:
            # Try fuzzy match
            start_idx = -1
            for j, sw in enumerate(script_words):
                if sw.strip(".,!?;:\"'()[]{}").lower() == beat_words[0].strip(".,!?;:\"'()[]{}").lower():
                    start_idx = j
                    break
            if start_idx == -1:
                fixed.append(beat_copy)
                continue
        
        end_idx = min(start_idx + len(beat_words), len(word_map))
        if start_idx >= len(word_map) or end_idx > len(word_map) or start_idx >= end_idx:
            fixed.append(beat_copy)
            continue
        
        # Snap to actual word timestamps
        start_ts_idx = word_map[start_idx]
        end_ts_idx = word_map[end_idx - 1] if end_idx > start_idx else start_ts_idx
        
        new_start = word_idx_to_frame(word_timestamps, start_ts_idx)
        new_end = word_idx_to_end_frame(word_timestamps, end_ts_idx)
        
        # Ensure minimum duration
        if new_end - new_start < MIN_BEAT_FRAMES:
            new_end = new_start + MIN_BEAT_FRAMES
        
        beat_copy["startFrame"] = new_start
        beat_copy["endFrame"] = new_end
        beat_copy["durationInFrames"] = new_end - new_start
        
        fixed.append(beat_copy)
    
    # Ensure sequential alignment - each beat starts where previous ended
    # But preserve the last beat's end frame (total duration)
    total_end = fixed[-1]["endFrame"] if fixed else 0
    
    for i in range(len(fixed) - 1):
        fixed[i + 1]["startFrame"] = fixed[i]["endFrame"]
        fixed[i + 1]["durationInFrames"] = fixed[i + 1]["endFrame"] - fixed[i + 1]["startFrame"]
        # Ensure minimum duration after alignment
        if fixed[i + 1]["durationInFrames"] < MIN_BEAT_FRAMES:
            fixed[i + 1]["endFrame"] = fixed[i + 1]["startFrame"] + MIN_BEAT_FRAMES
            fixed[i + 1]["durationInFrames"] = MIN_BEAT_FRAMES
    
    # Fix the last beat to end at total_end
    if fixed:
        fixed[-1]["endFrame"] = total_end
        fixed[-1]["durationInFrames"] = total_end - fixed[-1]["startFrame"]
        if fixed[-1]["durationInFrames"] < MIN_BEAT_FRAMES and len(fixed) > 1:
            # Borrow from previous beat
            fixed[-2]["endFrame"] = total_end - MIN_BEAT_FRAMES
            fixed[-2]["durationInFrames"] = fixed[-2]["endFrame"] - fixed[-2]["startFrame"]
            fixed[-1]["startFrame"] = total_end - MIN_BEAT_FRAMES
            fixed[-1]["durationInFrames"] = MIN_BEAT_FRAMES
    
    return fixed


# ---------------------------------------------------------------------------
# Prompt Construction
# ---------------------------------------------------------------------------

def build_prompt(script: str, word_timestamps: list[dict], story: dict, headline: str = "") -> str:
    """Build the LLM prompt with all necessary context."""
    
    # Prepare sentence-level timing with word indices
    sentences = []
    current_sentence = []
    word_idx = 0
    
    for word in script.strip().split():
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
    
    # Limit sentences in prompt to avoid token bloat
    max_sentences_in_prompt = 20
    if len(sentences) > max_sentences_in_prompt:
        sentences = sentences[:max_sentences_in_prompt]
        sentences.append({"text": "... (truncated)", "startFrame": 0, "endFrame": 0, "durationFrames": 0})
    
    # Story facts for metadata - limit size
    research = story.get("research", {}) if isinstance(story.get("research"), dict) else {}
    key_numbers = research.get("key_numbers", "")[:500]
    key_quotes = research.get("key_quotes", [])[:3]
    locations = research.get("locations", [])[:5]
    entities = research.get("entities", [])[:10]
    
    prompt = f"""You are converting a narrated script into structured "beats" for a motion-graphics video. Each beat maps to a specific React component type with exact frame boundaries.

SOURCE MATERIAL:
Title: {story.get("title", "")}
Headline: {headline}
Script (narration text):
{script}

WORD-LEVEL TIMING (30fps):
Total words: {len(word_timestamps)}
Total duration: {frames_to_seconds(seconds_to_frames(word_timestamps[-1]["end"])):.1f}s / {seconds_to_frames(word_timestamps[-1]["end"])} frames

Sentence breakdown with frame boundaries (use these EXACT frames):
{json.dumps(sentences, indent=2)}

STORY FACTS (use for metadata, do not invent):
- Key numbers: {key_numbers}
- Key quotes: {json.dumps(key_quotes)}
- Locations mentioned: {json.dumps(locations)}
- Entities: {json.dumps(entities)}

BEAT TYPES & REQUIRED FIELDS:
{json.dumps(BEAT_TYPES, indent=2)}

CRITICAL RULES:
1. Output ONE beat per sentence or key idea from the script above.
2. Use the EXACT frame boundaries provided for each sentence (startFrame/endFrame).
3. **MAXIMUM BEAT DURATION: 90 frames (3 seconds).** If a sentence is longer, you MUST split it into multiple beats of ~90 frames each.
4. Choose the MOST SPECIFIC fitting type. Default to "key_statement" for narrative/opinion beats.
5. NEVER invent facts, numbers, dates, coordinates, or quotes not in the source.
6. For "map_location": only use if a REAL named location appears in the source. Use approximate centroid coordinates.
7. For "quote_card": only use if source contains an ACTUAL attributed quote.
8. For "timeline": only use if source provides REAL chronological events with dates.
9. For "progress_meter": only for percentage/completion data explicitly in source.
10. For "versus": only for clear two-sided comparisons in the source.
11. For "before_after": only for clear before/after comparisons in the source.
12. Vary types — don't overuse one type.
13. All frame values must be integers at 30fps.
14. durationInFrames = endFrame - startFrame.
15. Beats must be sequential: beat[i].endFrame == beat[i+1].startFrame.

OUTPUT FORMAT (JSON only, no markdown):
{{
  "beats": [
    {{
      "type": "key_statement",
      "text": "sentence text here",
      "emphasisWords": ["word1", "word2"],
      "startFrame": 0,
      "endFrame": 90,
      "durationInFrames": 90
    }},
    ...
  ]
}}"""
    return prompt


# ---------------------------------------------------------------------------
# Main Generation
# ---------------------------------------------------------------------------

def generate_beats(script: str, word_timestamps: list[dict], story: dict, headline: str = "",
                   model_key: str = None) -> dict:
    """Call LLM to generate beats, validate, and return structured data."""
    
    prompt = build_prompt(script, word_timestamps, story, headline)
    
    # Use llm_client to call the model
    messages = [
        {"role": "system", "content": "You are a precise video beat planner. Output only valid JSON. CRITICAL: No beat may exceed 90 frames (3 seconds). Split long sentences into multiple beats."},
        {"role": "user", "content": prompt}
    ]
    
    # Try with JSON mode if supported - use lower max_tokens to avoid truncation
    try:
        response = llm_client.call_llm(
            messages=messages,
            model_key=model_key,
            temperature=0.2,
            max_tokens=2048,  # Reduced from 4096 to avoid token limit errors
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
    
    beats = data.get("beats", [])
    if not beats:
        raise ValueError("No beats generated")
    
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
        print(f"  ⚠ Final validation issues, force-fixing: {errors}")
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


def force_fix_beats(beats: list[dict], word_timestamps: list[dict]) -> list[dict]:
    """Last resort: redistribute frames evenly across beats to ensure validity."""
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
    else:
        if not all([args.script, args.timestamps, args.story, args.output]):
            parser.error("Either --project-dir OR all of --script --timestamps --story --output required")
        script_path = Path(args.script)
        timestamps_path = Path(args.timestamps)
        story_path = Path(args.story)
        output_path = Path(args.output)

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
        result = generate_beats(script, word_timestamps, story, args.headline, args.model)
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
