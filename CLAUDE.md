# Kinetic Typo Vid — Project Documentation

## Overview
Automated pipeline for creating YouTube Shorts from news stories.  
**Phase 1 (Python) — COMPLETE**: Discover → Research → Script → Voice → Word Timestamps → Beats (visual plan).  
**Phase 2 (Remotion) — IN PROGRESS**: Render beats + narration into final MP4.

---

## Completed Work (Phase 1)

### Pipeline Stages
1. **News Discovery & Ranking** (`news_fetcher.py`, `llm_ranker.py`)
   - Fetches from multiple sources (Hacker News, Reddit, RSS, YouTube channels, Google News)
   - Heuristic scoring (recency + niche relevance + engagement) + optional LLM editorial rerank
   - Output: ranked story list with metadata (score, source, category, rank_reason)
   - **Fixed**: Selection UI now shows ALL candidates with source + rank_reason (not capped at 6)

2. **Deduplication** (`run_pipeline.py`)
   - Daily log at `output/DD_MM_short_vids/_generated_log.json`
   - Fingerprint = normalized title (first 60 chars, alphanumeric only)
   - Skips stories already generated today

3. **Script Generation** (`script_generator.py`)
   - `process_story(story, model_key)` → ~110–150 word Shorts script
   - Uses structured prompt with story context
   - Retry logic with feedback for banned filler / word count / headline quality
   - **NEW**: Also outputs `pre_chunked_beats` — ~10-word chunks with `startWord`/`endWord` indices

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
   - **Two modes**:
     - **MODE A** (preferred): Receives `pre_chunked_beats` from script generator → LLM only assigns type + metadata
     - **MODE B** (legacy): LLM does full chunking + timing (fallback if no pre-chunked beats)
   - Robust parsing handles both MODE A (type + metadata only) and MODE B (full beat objects) formats
   - Auto-splits long beats (>3.7s) for splittable types (key_statement, icon_text, versus)
   - Frame alignment via Whisper timestamps + sequential continuity fix
   - Output: `beats.json` — array of beats with:
     - `type`: component key (KeyStatement, MapLocation, ProcessFlow, etc.)
     - `startFrame`, `endFrame`, `durationInFrames`
     - Type-specific metadata fields (emphasisWords, icon, left/right, events, steps, etc.)

### Key Files (Python)
| File | Purpose |
|------|---------|
| `run_pipeline.py` | Main entry point; orchestrates full Phase 1 |
| `news_fetcher.py` | Story discovery & heuristic ranking |
| `llm_ranker.py` | LLM editorial rerank |
| `script_generator.py` | Script writing + retry + pre-chunked beats |
| `voice_generator.py` | Edge TTS narration |
| `extract_word_timestamps.py` | WhisperX word alignment |
| `beat_generator.py` | Visual plan (beats) generation |
| `llm_client.py` | Unified LLM interface (Groq, NVIDIA, etc.) |
| `article_fetcher.py` | Article content extraction (readability + comments) |
| `config.py` | Centralized config (banned filler, model defaults, etc.) |

### Output Structure
```
output/
└── DD_MM_short_vids/
    ├── story_id/
    │   ├── story.json
    │   ├── script.json
    │   ├── narration.mp3
    │   ├── word_timestamps.json
    │   └── beats.json
    └── _generated_log.json
```

---

## Phase 2: Remotion Rendering (IN PROGRESS)

### Component Library Status

| Component | Status | Beat Type | Notes |
|-----------|--------|-----------|-------|
| `BeforeAfter` | ✅ **COMPLETE** | `before_after` | Entrance animations, shimmer effects, divider, slider border |
| `VersusCard` | ✅ **COMPLETE** | `versus_card` | Dual cards with items, VS divider, shimmer, slider border |
| `ChartCounter` | ⏳ TODO | `chart_counter` | |
| `ChartComparison` | ⏳ TODO | `chart_comparison` | |
| `ChartLine` | ⏳ TODO | `chart_line` | |
| `IconText` | ⏳ TODO | `icon_text` | |
| `KeyStatement` | ⏳ TODO | `key_statement` | |
| `KineticCaptions` | ⏳ TODO | `kinetic_captions` | |
| `MapLocation` | ⏳ TODO | `map_location` | |
| `PlainText` | ⏳ TODO | `plain_text` | |
| `ProcessFlow` | ⏳ TODO | `process_flow` | |
| `ProgressMeter` | ⏳ TODO | `progress_meter` | |
| `QuoteCard` | ⏳ TODO | `quote_card` | |
| `Timeline` | ⏳ TODO | `timeline` | |
| `PersistentBackground` | ⏳ TODO | — | Global background |
| `MotionGraphicsVideo` | ⏳ TODO | — | Main composition orchestrator |

### BeforeAfter Component Details (`src/BeforeAfter.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–15%: BEFORE card slides in from left
  - 18–28%: AFTER card slides in from right (3% stagger)
  - 28–38%: Divider scales in horizontally
  - 38–58%: Black slider border draws around entire card group (SVG stroke-dashoffset)
  - 58%+: Hold (idle pulse on divider, shimmer loops on cards)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on both cards
  - Divider with arrow indicator + shimmer
  - Black slider border animates drawing around card group
  - Responsive sizing (scales with width/height)
  - Headline font auto-sizes to fit card (min 48px, max 84px+)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test composition**: `BeforeAfterTest` (90 frames, 30fps, 1080×1920)

### VersusCard Component Details (`src/VersusCard.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–15%: Left card slides in from left with scale + subtle rotation
  - 3–18%: Right card slides in from right with scale + subtle rotation (3% stagger)
  - 15–25%: Center "VS" divider scales in with pulse ring
  - 25–70%: Black slider border draws around entire card group (SVG stroke-dashoffset, 45% duration)
  - 70%+: Hold (idle pulse on divider, shimmer loops on cards)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on both cards (18% height, 25%/sec)
  - Accent top bar on each card (gradient)
  - Center "VS" divider with expanding ring + shimmer
  - Black slider border with drop shadow animates drawing around card group
  - Optional `items` array renders as bullet list with accent dots
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (label ≥36px, value ≥56px, items ≥18px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test composition**: `VersusCardTest` (120 frames, 30fps, 1080×1920)
- **Props**: `left`/`right` objects with `label`, `value`, `items[]`

### Next Steps
1. Implement remaining beat components per the table above
2. Build `MotionGraphicsVideo` to sequence beats from `beats.json`
3. Add `SceneTransition` wrapper for entrance/exit
4. Integrate narration audio + `KineticCaptions`
5. Test full render pipeline

---

## Project Structure
```
my-video/
├── src/
│   ├── components/          # Beat components (BeforeAfter, KeyStatement, etc.)
│   ├── BeforeAfter.tsx      # ✅ Complete
│   ├── VersusCard.tsx       # ✅ Complete
│   ├── ChartCounter.tsx
│   ├── ChartComparison.tsx
│   ├── ChartLine.tsx
│   ├── IconText.tsx
│   ├── KeyStatement.tsx
│   ├── KineticCaptions.tsx
│   ├── MapLocation.tsx
│   ├── PlainText.tsx
│   ├── ProcessFlow.tsx
│   ├── ProgressMeter.tsx
│   ├── QuoteCard.tsx
│   ├── Timeline.tsx
│   ├── PersistentBackground.tsx
│   ├── MotionGraphicsVideo.tsx
│   ├── index.tsx            # Composition registry
│   └── Root.tsx
├── public/
├── package.json
└── remotion.config.ts
```
