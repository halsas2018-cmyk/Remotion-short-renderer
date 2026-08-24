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
        print(f"Put it in .env: