#!/usr/bin/env python3
"""
Word-level timestamp extraction using whisperx.
Outputs timestamps.json with [{word, start, end}, ...] for Phase 2 Remotion use.
"""

import json
import sys
import whisperx
import torch


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_timestamps.py <input_audio.mp3> [output.json]")
        sys.exit(1)

    audio_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "timestamps.json"

    print(f"[1/5] Loading Whisper model (base, int8, CPU)...")
    model = whisperx.load_model("base", device="cpu", compute_type="int8")

    print(f"[2/5] Loading audio: {audio_path}")
    audio = whisperx.load_audio(audio_path)

    print(f"[3/5] Transcribing with word timestamps (batch_size=4)...")
    result = model.transcribe(audio, batch_size=4)

    print(f"[4/5] Aligning for word-level precision...")
    model_a, metadata = whisperx.load_align_model(
        language_code=result["language"], device="cpu"
    )
    result = whisperx.align(
        result["segments"], model_a, metadata, audio, device="cpu"
    )

    print(f"[5/5] Flattening segments to word list...")
    words = []
    for seg in result["segments"]:
        for w in seg.get("words", []):
            word_text = w["word"].strip()
            if word_text:  # skip empty strings
                words.append({
                    "word": word_text,
                    "start": round(w["start"], 3),
                    "end": round(w["end"], 3)
                })

    # Save JSON
    with open(output_path, "w") as f:
        json.dump(words, f, indent=2)

    # Print for manual validation
    print(f"\n--- Extracted {len(words)} words ---")
    for w in words:
        print(f"[{w['start']:.3f} - {w['end']:.3f}] {w['word']}")

    print(f"\n✅ Saved to {output_path}")


if __name__ == "__main__":
    main()
