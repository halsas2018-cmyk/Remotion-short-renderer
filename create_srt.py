#!/usr/bin/env python3
"""
Convert timestamps.json to SRT subtitle file for visual validation.
Usage: python create_srt.py timestamps.json [output.srt]
"""

import json
import sys


def format_time(seconds: float) -> str:
    """Convert seconds to SRT time format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def main():
    if len(sys.argv) < 2:
        print("Usage: python create_srt.py <timestamps.json> [output.srt]")
        sys.exit(1)

    json_path = sys.argv[1]
    srt_path = sys.argv[2] if len(sys.argv) > 2 else "timestamps.srt"

    with open(json_path, "r") as f:
        words = json.load(f)

    with open(srt_path, "w") as f:
        for i, w in enumerate(words, 1):
            start = format_time(w["start"])
            end = format_time(w["end"])
            f.write(f"{i}\n{start} --> {end}\n{w['word']}\n\n")

    print(f"✅ Created {srt_path} with {len(words)} subtitle entries")


if __name__ == "__main__":
    main()
