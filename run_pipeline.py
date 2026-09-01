#!/root/kinetic_typo_vid/venv/bin/python3
"""
run_pipeline.py
PHASE 1 — Fully automated pipeline: discover -> research -> script -> voice ->
word timestamps -> beats.

Requirements (set in .env file or export):
    GROQ_API_KEY="gsk-..."            # required — get at console.groq.com
    PEXELS_API_KEY="your-key"          # optional — get at pexels.com/api
    NVIDIA_API_KEY="your-key"          # optional — get at build.nvidia.com

Usage:
    python run_pipeline.py --count 3 --outdir output
    python run_pipeline.py --model groq-gpt-oss-20b --count 1
    python run_pipeline.py --auto --count 5

Flags:
    --count       Number of videos to produce (default: 3, max: 10)
    --outdir      Output directory (default: output)
    --no-video    Skip voice generation (scripts only)
    --quick       Minimal output — 1 script for quick review
    --model       LLM model key (default: groq-gpt-oss-120b). See `python llm_client.py --list`
    --rank-model  LLM key for the editorial rerank ONLY (default: same as --model).
                  e.g. --rank-model nvidia-nemotron-ultra keeps scripts on Groq
                  while ranking runs on NVIDIA (separate rate limits)
    --auto        Don't prompt for story selection; generate top-N automatically
    --no-dedupe   Don't filter out stories already generated today
    --no-llm-rank Skip the LLM editorial rerank; rank by heuristic score only
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Auto-load .env file (so you don't need to 'export' every time)
# ---------------------------------------------------------------------------
_env_path = Path(__file__).parent / ".env"
if _env_path.exists():
    for _line in _env_path.read_text().splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _key, _val = _line.split("=", 1)
            _key, _val = _key.strip(), _val.strip().strip('"').strip("'")
            if _key and not os.environ.get(_key):
                os.environ[_key] = _val

# Import llm_client early so model keys can be validated in CLI
import llm_client

import llm_ranker
from news_fetcher import rank_top_stories
from script_generator import process_story
from voice_generator import generate_narration
from extract_word_timestamps import extract_word_timestamps
from beat_generator import generate_beats


def slugify(text: str, max_len: int = 50) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", text.strip().lower()).strip("_")
    return slug[:max_len] or "untitle"


def _get_daily_outdir(base_outdir: Path) -> Path:
    """Get the daily output directory (e.g., output/09_08_short_vids)."""
    today = date.today()
    # Format: DD_MM_short_vids (e.g., 09_08_short_vids for August 9th)
    daily_dir_name = f"{today.day:02d}_{today.month:02d}_short_vids"
    daily_dir = base_outdir / daily_dir_name
    daily_dir.mkdir(parents=True, exist_ok=True)
    return daily_dir


# ---------------------------------------------------------------------------
# Daily dedupe log (output/09_08_short_vids/_generated_log.json)
# ---------------------------------------------------------------------------

def _get_dedupe_log_path(base_outdir: Path) -> Path:
    """Get the daily dedupe log path inside the daily output directory."""
    daily_dir = _get_daily_outdir(base_outdir)
    return daily_dir / "_generated_log.json"


def _load_dedupe_log(base_outdir: Path) -> list[dict]:
    """Load the daily dedupe log, return empty list on any error."""
    log_path = _get_dedupe_log_path(base_outdir)
    try:
        if log_path.exists():
            content = log_path.read_text(encoding="utf-8")
            if content.strip():
                return json.loads(content)
    except Exception:
        pass
    return []


def _save_dedupe_log(base_outdir: Path, entries: list[dict]):
    """Save the dedupe log, trimming to last ~30 days."""
    log_path = _get_dedupe_log_path(base_outdir)
    try:
        today = date.today().isoformat()
        # Keep only last 30 days
        cutoff = date.fromisoformat(today)
        from datetime import timedelta
        cutoff = cutoff - timedelta(days=30)
        filtered = [
            e for e in entries
            if e.get("date") and date.fromisoformat(e["date"]) >= cutoff
        ]
        log_path.parent.mkdir(parents=True, exist_ok=True)
        log_path.write_text(json.dumps(filtered, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"  [warn] Could not save dedupe log: {e}")


def _fingerprint(story: dict) -> str:
    """Generate a fingerprint for a story (same normalization as dedupe)."""
    title = story.get("title", "")
    return re.sub(r"\W+", "", title.lower())[:60]


def _filter_deduped_today(base_outdir: Path, stories: list[dict]) -> tuple[list[dict], int]:
    """Filter out stories already generated today. Returns (filtered, count_removed)."""
    log = _load_dedupe_log(base_outdir)
    today = date.today().isoformat()
    today_keys = {e["key"] for e in log if e.get("date") == today}
    filtered = []
    removed = 0
    for s in stories:
        fp = _fingerprint(s)
        if fp in today_keys:
            removed += 1
        else:
            filtered.append(s)
    return filtered, removed


def _log_generated_story(base_outdir: Path, story: dict, model_key: str, project_slug: str):
    """Append a successful generation to the daily dedupe log."""
    log = _load_dedupe_log(base_outdir)
    today = date.today().isoformat()
    log.append({
        "date": today,
        "key": _fingerprint(story),
        "title": story.get("title", "")[:120],
        "link": story.get("link", ""),
        "model": model_key,
        "project": project_slug,
    })
    _save_dedupe_log(base_outdir, log)


def _serialize_story(story: dict) -> dict:
    """Convert story dict to JSON-serializable format (datetime -> ISO string)."""
    serialized = {}
    for k, v in story.items():
        if isinstance(v, datetime):
            serialized[k] = v.isoformat()
        else:
            serialized[k] = v
    return serialized


def check_prerequisites(model_key: str = llm_client.DEFAULT_MODEL_KEY):
    """Check API key and critical dependencies before starting.

    Script generation uses the key for the chosen model.
    """
    try:
        row = llm_client.resolve_model(model_key)
    except ValueError as e:
        print(f"ERROR: {e}")
        return False

    key_env = row.get("key_env", "")
    if not os.environ.get(key_env):
        print("=" * 60)
        provider = row.get("provider", "").upper()
        signup = {"groq": "https://console.groq.com", "nvidia": "https://build.nvidia.com"}.get(
            row.get("provider", ""), ""
        )
        print(f"WARNING: {key_env} is not set.")
        print(f"Script + visual-plan generation require this {provider} key.")
        print()
        if signup:
            print(f"Get a free key at: {signup}")
        print(f"Put it in .env: {key_env}=your_key")
        print("=" * 60)
        return False

    # Check ffmpeg for voice generation
    import shutil
    if not shutil.which("ffmpeg"):
        print("WARNING: ffmpeg not found in PATH — voice generation will fail.")
        print("Install: apt-get install ffmpeg  |  brew install ffmpeg  |  choco install ffmpeg")
        return False

    return True


def save_project(
    project_dir: Path,
    story: dict,
    script: str,
    pre_chunked_beats: list[dict],
    model_key: str,
    rank_model_key: str,
    no_video: bool = False,
    format: str | None = None,
) -> dict:
    """
    Run the pipeline for a single story up to beat generation.

    Steps:
      1. Generate narration audio (unless --no-video)
      2. Extract word-level timestamps via WhisperX
      3. Generate beats (visual plan) using pre-chunked beats

    Returns a summary dict with paths to generated artifacts.
    """
    project_dir.mkdir(parents=True, exist_ok=True)

    # Save story + script metadata (serialize datetime objects)
    (project_dir / "story.json").write_text(json.dumps(_serialize_story(story), indent=2), encoding="utf-8")
    (project_dir / "script.txt").write_text(script, encoding="utf-8")
    (project_dir / "pre_chunked_beats.json").write_text(json.dumps(pre_chunked_beats, indent=2), encoding="utf-8")
    (project_dir / "model.txt").write_text(f"{model_key}\n{rank_model_key}", encoding="utf-8")
    (project_dir / "format.txt").write_text(format or "default", encoding="utf-8")

    narration_path = None
    word_timestamps = None
    beats = None

    # 1. Voice generation (skip if --no-video)
    if not no_video:
        narration_path = project_dir / "narration.mp3"
        # format comes from the script generator's output (URGENT_BREAK / DEBATE / EXPLAINER);
        # voice_generator falls back to defaults if None.
        print(f"  Generating narration (format={format or 'default'})...")
        generate_narration(script, output_path=str(narration_path), format=format)

        # 2. Word timestamps via WhisperX
        print(f"  Extracting word timestamps...")
        timestamps_path = project_dir / "word_timestamps.json"
        word_timestamps = extract_word_timestamps(
            audio_path=str(narration_path),
            output_path=str(timestamps_path),
        )
    else:
        print("  Skipping voice + timestamps (--no-video)")

    # 3. Beat generation (visual plan) — now uses pre_chunked_beats
    print(f"  Generating beats...")
    beats_path = project_dir / "beats.json"
    beats = generate_beats(
        script=script,
        word_timestamps=word_timestamps or [],
        story=story,
        headline=story.get("title", ""),
        pre_chunked_beats=pre_chunked_beats,
        model_key=args.model,
    )
    beats_path.write_text(json.dumps(beats, indent=2), encoding="utf-8")

    print(f"  ✓ Project saved to {project_dir}")
    print(f"    - story.json")
    print(f"    - script.txt")
    print(f"    - pre_chunked_beats.json")
    if narration_path:
        print(f"    - narration.mp3")
        print(f"    - word_timestamps.json")
    print(f"    - beats.json")

    return {
        "project_dir": str(project_dir),
        "story": story,
        "script": script,
        "narration": str(narration_path) if narration_path else None,
        "word_timestamps": str(project_dir / "word_timestamps.json") if not no_video else None,
        "beats": str(beats_path),
    }


def main():
    parser = argparse.ArgumentParser(description="Automated Shorts pipeline (discover → script → voice → timestamps → beats)")
    parser.add_argument("--count", type=int, default=3, help="Number of videos to produce (default: 3, max: 10)")
    parser.add_argument("--outdir", type=str, default="output", help="Output directory (default: output)")
    parser.add_argument("--no-video", action="store_true", help="Skip voice generation (scripts only)")
    parser.add_argument("--quick", action="store_true", help="Minimal output — 1 script for quick review")
    parser.add_argument("--model", type=str, default=llm_client.DEFAULT_MODEL_KEY, help="LLM model key for script generation")
    parser.add_argument("--rank-model", type=str, default=None, help="LLM model key for editorial rerank (default: same as --model)")
    parser.add_argument("--auto", action="store_true", help="Don't prompt for story selection; generate top-N automatically")
    parser.add_argument("--no-dedupe", action="store_true", help="Don't filter out stories already generated today")
    parser.add_argument("--no-llm-rank", action="store_true", help="Skip LLM editorial rerank; rank by heuristic score only")
    args = parser.parse_args()

    if args.count > 10:
        print("Max count is 10")
        args.count = 10

    rank_model_key = args.rank_model or args.model

    # Prerequisites
    if not check_prerequisites(args.model):
        sys.exit(1)
    if args.rank_model and not check_prerequisites(args.rank_model):
        sys.exit(1)

    base_outdir = Path(args.outdir)
    daily_outdir = _get_daily_outdir(base_outdir)

    # Fetch & rank stories
    print(f"Fetching & ranking stories...")
    stories = rank_top_stories(
        no_llm_rank=args.no_llm_rank,
        rank_model_key=rank_model_key,
    )

    if not stories:
        print("No stories found.")
        return

    # Dedupe
    if not args.no_dedupe:
        stories, removed = _filter_deduped_today(base_outdir, stories)
        if removed:
            print(f"  Filtered {removed} already-generated story(s) today")

    if not stories:
        print("All stories already generated today. Use --no-dedupe to override.")
        return

    # Select stories
    if args.auto:
        selected = stories[:args.count]
    else:
        print(f"\nTop {len(stories)} stories (showing all candidates):")
        for i, s in enumerate(stories, 1):
            score = s.get('score', 0)
            reason = s.get('rank_reason', s.get('reason', 'heuristic rank'))
            source = s.get('source', 'unknown')
            print(f"  {i:2d}. [{score:.2f}] ({source}) {s.get('title', 'Untitled')[:75]}")
            print(f"       → {reason[:120]}")
        print()
        choice = input(f"Select stories (1-{len(stories)}, comma-separated, or 'all'): ").strip()
        if choice.lower() == "all":
            selected = stories[:args.count]
        else:
            try:
                indices = [int(x.strip()) - 1 for x in choice.split(",")]
                selected = [stories[i] for i in indices if 0 <= i < len(stories)]
            except Exception:
                print("Invalid selection.")
                return

    if not selected:
        print("No stories selected.")
        return

    # Process each story
    for idx, story in enumerate(selected, 1):
        print(f"\n[{idx}/{len(selected)}] {story.get('title', 'Untitled')}")

        # Generate script + pre-chunked beats
        script_result = process_story(story, model_key=args.model)
        if not script_result or not script_result.get("script"):
            print("  Script generation failed, skipping.")
            continue

        script = script_result["script"]
        pre_chunked_beats = script_result.get("pre_chunked_beats", [])
        project_slug = slugify(story.get("title", "story"))
        project_dir = daily_outdir / project_slug

        # Save project (runs pipeline up to beats)
        try:
            save_project(
                project_dir=project_dir,
                story=story,
                script=script,
                pre_chunked_beats=pre_chunked_beats,
                model_key=args.model,
                rank_model_key=rank_model_key,
                no_video=args.no_video,
                format=script_result.get("format"),
            )
            _log_generated_story(base_outdir, story, args.model, project_slug)
        except Exception as e:
            print(f"  ERROR: {e}")
            import traceback
            traceback.print_exc()

    print(f"\nDone. Output in: {daily_outdir}")


if __name__ == "__main__":
    main()
