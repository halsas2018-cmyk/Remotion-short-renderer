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
| `Timeline` | ✅ **COMPLETE** | `timeline` | Flexible N events, line draw, markers, descriptions, slider border |
| `QuoteCard` | ✅ **COMPLETE** | `quote_card` | Typewriter quote, animated underline, attribution, slider border |
| `ProgressMeter` | ✅ **COMPLETE** | `progress_meter` | Circular progress, dynamic sizing, value formatting, slider border |
| `ProcessFlow` | ✅ **COMPLETE** | `process_flow` | Dynamic N steps, arrows, tight slider wrap, centered content |
| `KeyStatement` | ✅ **COMPLETE** | `key_statement` | Word-by-word reveal, emphasis highlighting, glow, slider border |
| `MapLocation` | ✅ **COMPLETE** | `map_location` | Abstract world map, animated pin drop, coordinate label, slider border |
| `PlainText` | ✅ **COMPLETE** | `plain_text` | Line-by-line reveal (4-5 words/line), star bullets, glow, slider border |
| `ChartCounter` | ⏳ TODO | `chart_counter` | |
| `ChartComparison` | ⏳ TODO | `chart_comparison` | |
| `ChartLine` | ⏳ TODO | `chart_line` | |
| `IconText` | ⏳ TODO | `icon_text` | |
| `KineticCaptions` | ⏳ TODO | `kinetic_captions` | |
| `PersistentBackground` | ⏳ TODO | — | Global background |
| `MotionGraphicsVideo` | ⏳ TODO | — | Main composition orchestrator |

### Unified Card Beautification System
All card-based components now share a consistent visual language:

**Card Structure:**
- White background with prominent curved borders (32-40px radius)
- 1px solid border (`#e8e8e8`)
- Elevated shadow: `0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)`
- Accent top bar (4px gradient: `#e86c00` → `#f97316`)
- Subtle diagonal line pattern overlay (3% opacity)
- Radial glow behind card during idle (animated pulse)

**Animations (50% timeline rule):**
- Entrance animations complete by ~50% of duration
- Staggered reveals with `easeOutExpo` easing
- No exit animations — designed for `SceneTransition` wrapper
- Hold phase with idle effects: card bounce (6px), glow pulse, shimmer loop

**Slider Border:**
- Black (`#1a1a1a`) rounded rectangle wrapping card + 24px padding
- SVG `stroke-dashoffset` animation (45% duration, `easeOut`)
- Drop shadow: `0 0 20px rgba(26,26,26,0.15)`
- Border radius matches card radius + padding

**Shimmer Effect:**
- Light orange (`#e86c0033`) top-to-bottom gradient sweep
- 18% card height, 25%/sec speed
- Only visible after content animation completes
- Border radius matches card

**Responsive Sizing:**
- All dimensions scale with video width (1080px baseline)
- Safe area: 80px minimum from edges
- Font sizes follow video-layout.md minimums (headline ≥84px, supporting ≥44px)

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

### Timeline Component Details (`src/Timeline.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–15%: Horizontal line draws from left to right
  - 15–25%: Markers appear sequentially with stagger (4% each)
  - 25–70%: Black slider border draws around entire timeline group (SVG stroke-dashoffset, 45% duration)
  - 70%+: Hold (idle pulse on markers, shimmer loops on line/markers/cards)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on line, markers, and description cards
  - Gradient horizontal line (neutral → accent → neutral)
  - Elevated marker circles with year text (responsive radius, min 36px)
  - Vertical connector lines from center line to markers
  - Elevated description cards below markers (constrained to screen bounds)
  - Year labels above markers in accent-colored cards
  - Black slider border with drop shadow animates drawing around timeline group
  - Flexible N events (2–5+ tested) with even distribution
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (marker ≥24px, year ≥32px, label ≥28px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `TimelineTest` (2 events, 120f), `Timeline3EventsTest` (3 events, 150f), `Timeline4EventsTest` (4 events, 180f), `Timeline5EventsTest` (5 events, 210f)
- **Props**: `events[]` with `marker` (string) and `label` (string)

### QuoteCard Component Details (`src/QuoteCard.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–50%: Quote text types out word-by-word (typewriter effect)
  - 50–60%: Attribution fades in with slide-up
  - 0–10%: Quotation marks bounce in
  - 60–70%: Black slider border draws around card (SVG stroke-dashoffset, 45% duration)
  - 70%+: Hold (idle pulse on marks, shimmer loops on card)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on card (18% height, 25%/sec)
  - Accent top bar (gradient)
  - Animated underline grows with typewriter progress
  - Large decorative quotation marks with bounce + glow
  - Attribution with decorative separator line
  - Subtle diagonal line background pattern
  - Dynamic card height based on quote length
  - Black slider border with drop shadow animates drawing around card
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (quote ≥48px, attribution ≥24px, marks ≥100px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `QuoteCardTest` (120 frames), `QuoteCardLongTest` (180 frames)
- **Props**: `quote` (string), `attribution` (string)

### ProgressMeter Component Details (`src/ProgressMeter.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–15%: Circular progress ring draws + center number counts up
  - 3–13%: Label + subtitle fade in with slide-up
  - 15–60%: Black slider border draws around meter (SVG stroke-dashoffset, 45% duration)
  - 60%+: Hold (idle pulse on ring, shimmer loops, subtitle bounce)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on card (18% height, 25%/sec)
  - Circular progress ring with glowing fill + rounded caps
  - Dynamic card diameter based on label length (320–520px)
  - Smart number formatting (K, M, B, T suffixes)
  - Subtitle with subtle bounce animation during idle
  - Subtle radial gradient background pattern
  - Black slider border with drop shadow animates drawing around circular card
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (value ≥64px, label ≥28px, subtitle ≥18px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `ProgressMeterTest` (120 frames), `ProgressMeterLongLabelTest` (120 frames)
- **Props**: `value` (number), `maxValue` (number), `label` (string)

### ProcessFlow Component Details (`src/ProcessFlow.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–12%: First step box scales in
  - 4–16%: Second step box scales in (4% stagger)
  - 8–20%: Third step box scales in (4% stagger)
  - ...continues for N steps
  - Arrows draw after each step (10% duration each)
  - 30–75%: Black slider border draws around entire flow (SVG stroke-dashoffset, 45% duration)
  - 75%+: Hold (idle pulse on boxes, shimmer loops)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on boxes (25% height, 25%/sec)
  - Accent top bar on each box (gradient)
  - Animated arrows with arrowheads between steps
  - Arrow shimmer effect
  - Tight slider border wraps only rendered boxes (not full width)
  - Content centered horizontally
  - Dynamic box width based on step count
  - Prominent curved borders (32px+ radius)
  - Black slider border with drop shadow animates drawing around flow
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (step text ≥28px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `ProcessFlowTest` (3 steps, 120f), `ProcessFlow4StepsTest` (4 steps, 150f), `ProcessFlow5StepsTest` (5 steps, 180f)
- **Props**: `steps[]` (string array)

### KeyStatement Component Details (`src/KeyStatement.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–5%: Text start delay
  - 5–50%: Words reveal sequentially (8% duration each, 3% stagger)
  - 50–60%: Black slider border draws around card (SVG stroke-dashoffset, 45% duration)
  - 60%+: Hold (idle pulse, glow, emphasized word bounce)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on card (18% height, 25%/sec)
  - Accent top bar (gradient)
  - Subtle diagonal line background pattern
  - Radial glow behind card (animated pulse during idle)
  - Emphasized words: larger (76px+), bolder (900), accent color, bounce animation during idle
  - Word entrance: slide up (30px) + scale (0.8→1) with `easeOutExpo`
  - Black slider border with drop shadow animates drawing around card
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (base ≥64px, emphasis ≥76px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `KeyStatementTest` (120 frames), `KeyStatementLongTest` (180 frames), `KeyStatementShortTest` (90 frames)
- **Props**: `text` (string), `emphasisWords` (string[])

### MapLocation Component Details (`src/MapLocation.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–15%: Map silhouette scales in
  - 15–30%: Pin drops with bounce + rotation (from -15°→10°→0°)
  - 25–35%: Location label scales in (overlaps pin)
  - 35–80%: Black slider border draws around card (SVG stroke-dashoffset, 45% duration)
  - 80%+: Hold (idle pulse, pin float, glow)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on card (18% height, 25%/sec)
  - Accent top bar (gradient)
  - Subtle diagonal line background pattern
  - Radial glow behind card (animated pulse during idle)
  - Abstract world map SVG (simplified continents)
  - Pin: accent color with white inner dot, drop shadow, ground shadow
  - Pin drop: from 200px above with bounce easing
  - Location label: elevated card with coordinates
  - Black slider border with drop shadow animates drawing around card
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (label ≥32px, coords ≥18px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `MapLocationTest` (120 frames), `MapLocationTokyoTest` (120 frames), `MapLocationLongTest` (180 frames)
- **Props**: `locationName` (string), `latitude` (number), `longitude` (number)

### PlainText Component Details (`src/PlainText.tsx`)
- **Animation timeline** (proportional to `durationInFrames`):
  - 0–5%: Text start delay
  - 5–50%: Lines reveal sequentially (12% duration each, 4% stagger, 4-5 words/line)
  - 50–60%: Black slider border draws around card (SVG stroke-dashoffset, 45% duration)
  - 60%+: Hold (idle pulse, glow, line drift)
- **Visual effects**:
  - Light orange (ACCENT_COLOR) top-to-bottom shimmer on card (18% height, 25%/sec)
  - Accent top bar (gradient)
  - Subtle diagonal line background pattern
  - Radial glow behind card (animated pulse during idle)
  - Each line: star bullet (★) with rotation animation during idle
  - Line entrance: slide up (30px) + scale (0.85→1) with `easeOutExpo`
  - Black slider border with drop shadow animates drawing around card
  - Responsive sizing (scales with width/height)
  - Font sizes follow video-layout.md minimums (base ≥56px)
- **No exit animation** — designed to be wrapped by `SceneTransition`
- **Test compositions**: `PlainTextTest` (120 frames), `PlainTextLongTest` (180 frames), `PlainTextShortTest` (90 frames)
- **Props**: `text` (string)

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
│   ├── Timeline.tsx         # ✅ Complete
│   ├── QuoteCard.tsx        # ✅ Complete
│   ├── ProgressMeter.tsx    # ✅ Complete
│   ├── ProcessFlow.tsx      # ✅ Complete
│   ├── KeyStatement.tsx     # ✅ Complete
│   ├── MapLocation.tsx      # ✅ Complete
│   ├── PlainText.tsx        # ✅ Complete
│   ├── ChartCounter.tsx
│   ├── ChartComparison.tsx
│   ├── ChartLine.tsx
│   ├── IconText.tsx
│   ├── KineticCaptions.tsx
│   ├── PersistentBackground.tsx
│   ├── MotionGraphicsVideo.tsx
│   ├── index.tsx            # Composition registry
│   └── Root.tsx
├── public/
├── package.json
└── remotion.config.ts
```
