# Kinetic Typo Vid — Project Documentation

## Overview
Automated pipeline for creating YouTube Shorts from news stories.  
**Phase 1 (Python) — COMPLETE**: Discover → Research → Script → Voice → Word Timestamps → Beats (visual plan).  
**Phase 2 (Remotion) — TODO**: Render beats + narration into final MP4.

---

## Completed Work (Phase 1)

### Pipeline Stages
1. **News Discovery & Ranking** (`news_fetcher.py`, `llm_ranker.py`)
   - Fetches from multiple sources (Hacker News, Reddit, RSS, etc.)
   - Heuristic scoring + optional LLM editorial rerank
   - Output: ranked story list with metadata

2. **Deduplication** (`run_pipeline.py`)
   - Daily log at `output/DD_MM_short_vids/_generated_log.json`
   - Fingerprint = normalized title (first 60 chars, alphanumeric only)
   - Skips stories already generated today

3. **Script Generation** (`script_generator.py`)
   - `process_story(story, model_key)` → ~110–150 word Shorts script
   - Uses structured prompt with story context
   - Retry logic with feedback

4. **Voice Generation** (`voice_generator.py`)
   - Microsoft Edge TTS (free, local, no API key)
   - Voice: `en-US-AndrewNeural`, rate `+20%`, pitch `+0Hz`
   - Output: `narration.mp3` with duration validation

5. **Word-Level Timestamps** (`extract_word_timestamps.py`)
   - WhisperX alignment (forced alignment via `whisperx.align`)
   - Input: `narration.mp3` + script text
   - Output: `word_timestamps.json` — array of `{word, start, end}` in seconds

6. **Beat Generation** (`beat_generator.py`)
   - LLM-driven visual plan synced to word timestamps
   - Input: script, word_timestamps, story, headline
   - Output: `beats.json` — array of beats with:
     - `type`: component key (KeyStatement, MapLocation, ProcessFlow, etc.)
     - `startFrame`, `durationInFrames`
     - `content`: component-specific props
     - `animation`: entrance/exit cues

### Key Files (Python)
| File | Purpose |
|------|---------|
| `run_pipeline.py` | Main entry point; orchestrates full Phase 1 |
| `news_fetcher.py` | Story discovery & heuristic ranking |
| `llm_ranker.py` | LLM editorial rerank |
| `script_generator.py` | Script writing + retry |
| `voice_generator.py` | Edge TTS narration |
| `extract_word_timestamps.py` | WhisperX word alignment |
| `beat_generator.py` | Visual plan (beats) generation |
| `llm_client.py` | Unified LLM interface (Groq, NVIDIA, etc.) |

### Output Structure
