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
   - Output: `beats.json` — array of `{type, startFrame, durationInFrames, metadata}`

### Output Format
Each beat object contains:
- `type`: Component type (key_statement, icon_text, chart_line, versus, etc.)
- `text`: The narration chunk for this beat (top-level)
- `startFrame`: Frame number where the beat begins
- `endFrame`: Frame number where the beat ends (redundant with `startFrame + durationInFrames`; ignored by the orchestrator)
- `durationInFrames`: Duration in frames
- `metadata`: Type-specific data (text, emphasisWords, points, etc.)

---

## Phase 2: Remotion Rendering (In Progress)

### Component Library
Components are located in `src/` and follow these conventions:

#### KineticCaptions.tsx
- Displays word-by-word captions synced to narration
- Current word is highlighted with orange color and background
- **Card Style**: Current word is wrapped in a card with white background, orange border, and subtle shadow
- Past words fade to gray, future words are hidden
- Supports emphasis words with cycling annotations (Highlight, Circle, Underline)
- Idle animations: card bounce, 3D tilt, glow pulse, shimmer
- Responsive sizing with `fitText` for optimal text scaling
- **Timing**: Internal animations complete by ~50% of duration, then holds idle state
- **No exit animation**: Designed to be wrapped by SceneTransition
- **Card Configuration**:
  - `cardBgColor`: White background with slight transparency
  - `cardBorderColor`: Orange border matching highlight color
  - `cardBorderWidth`: 2px border
  - `cardBorderRadius`: 12px rounded corners
  - `cardPadding`: 6px 12px padding
  - `cardShadow`: Subtle shadow for depth

#### KeyStatement.tsx
- Displays text with word-by-word entrance animations
- Supports emphasis words with cycling annotations (Highlight, Circle, Underline)
- Idle animations: card bounce, 3D tilt, glow pulse, shimmer
- Responsive sizing with `fitText` for optimal text scaling
- **Timing**: Internal animations complete by ~50% of duration, then holds idle state
- **No exit animation**: Designed to be wrapped by SceneTransition

#### ChartLine.tsx
- Renders line charts with animated drawing
- Supports value formatting (K, M, B, T suffixes)
- Grid lines, axis labels, and data point dots
- **Timing**: Internal animations complete by 30% of duration
- **No exit animation**: Designed to be wrapped by SceneTransition
- Uses `Interactive.Div` for Studio editability

### Best Practices
1. **Animation**: Use `useCurrentFrame()` + `interpolate()` — no CSS transitions
2. **Timing**: Keep `interpolate()` calls inline in style props for Studio interactivity
3. **Transforms**: Use individual CSS properties (`scale`, `translate`, `rotate`) over `transform` strings
4. **Fonts**: Load via `@remotion/google-fonts` for type-safe, blocking font loading
5. **Assets**: Place in `public/` folder, reference with `staticFile()`
6. **Transitions**: Use `SceneTransition` component for entrance/exit animations between beats

### Running the Renderer
```bash
npx remotion render
```

### Preview
```bash
npx remotion studio --no-open
```

---

## Phase 2: Video Generator Plan (IN PROGRESS)

### Architecture
```
beats.json (Phase 1 output)
  ↓
MotionGraphicsVideo.tsx (orchestrator)
  ↓
DynamicDuration wrapper (calculateMetadata)
  ↓
SceneTransition (entrance/exit)
  ↓
Beat component (KeyStatement, ChartLine, etc.)
  ↓
KineticCaptions (word-level sync)
  ↓
PersistentBackground (logo + grid + cubes)
  ↓
Audio narration
```

### Project Structure
```
src/
├── Root.tsx                          # Compositions registry
├── MotionGraphicsVideo.tsx           # Main orchestrator
├── beats/
│   ├── registry.ts                   # Maps beat.type → React component + Zod schema ✅ DONE
│   ├── renderBeat.ts                 # Renders a single beat with SceneTransition
│   └── types.ts                      # Beat type definitions ✅ DONE
├── SceneTransition.tsx               # Entrance/exit wrapper
├── PersistentBackground.tsx          # Background (logo + grid + cubes)
├── Logo.tsx                          # 3D S-NEWS voxel logo
├── components/
│   ├── KeyStatement.tsx
│   ├── PlainText.tsx
│   ├── IconText.tsx
│   ├── ChartLine.tsx
│   ├── ChartCounter.tsx
│   ├── ChartComparison.tsx
│   ├── ChartComparison3D.tsx
│   ├── ProgressMeter.tsx
│   ├── Timeline.tsx
│   ├── VersusCard.tsx
│   ├── BeforeAfter.tsx
│   ├── Map3D.tsx
│   └── KineticCaptions.tsx
├── audio/
│   └── NarrationLayer.tsx            # <Audio> wrapper with word-sync
├── schemas/
│   └── beatMetadata.ts               # Zod schemas for metadata validation
├── calculateMetadata.ts              # Dynamic duration/width/height
└── lib/
    └── totalDuration.ts              # Sums beat durations
```

### Step 1: Beat Type System (`src/beats/types.ts`) — ✅ DONE (commit 78e3f69)
- `BeatType` union of all 15 supported types
- `Beat` object: `{type, startFrame, durationInFrames, metadata}`
- `TimedBeats`: wraps beats with `fps` and `totalDurationInFrames`

### Step 2: Component Registry (`src/beats/registry.ts`) — ✅ DONE
Maps each `BeatType` to:
- The React component (`getBeatComponent(type)`)
- A Zod schema that validates the `metadata` shape (`validateBeatMetadata(type, metadata)`)
- A support check (`isBeatTypeSupported(type)`)

**Zod schemas** (per-beat-type metadata contracts):
- `key_statement` → `{text, emphasisWords?}`
- `plain_text` → `{text}`
- `icon_text` → `{text, icon, emphasisWords?}`
- `chart_line` → `{points[{label,value}], durationInFrames?, exitDirection?}`
- `chart_counter` → `{value, label, durationInFrames?}`
- `chart_comparison` / `chart_comparison_3d` → `{items[{label,value}]}`
- `progress_meter` → `{value, maxValue, label}`
- `timeline` → `{events[{marker,label}]}`
- `versus` → `{left, right}`
- `before_after` → `{beforeLabel, afterLabel}`
- `map_location` / `map_3d` → `{locationName, latitude, longitude, buildings?}`
- `process_flow` → `{steps[]}`
- `quote_card` → `{quote, author?}`

**Why Zod:** When Python's LLM-driven `beat_generator.py` outputs bad data, the registry fails fast in Remotion Studio with a clear error instead of a deep `undefined` crash during render.

**Fallback mappings** (types that don't yet have a dedicated component):
- `chart_comparison` → `ChartComparison3D` (reuses the 3D variant)
- `map_location` → `Map3D` (no dedicated 2D map yet)
- `process_flow` → `Timeline` (timeline works as a step list)
- `quote_card` → `KeyStatement` (key statement works for a single quote line)

**Key data shape notes** (learned from inspecting `beats.json`):
- `text` is at the top level of every beat (NOT inside `metadata`). The orchestrator must pass `text` separately to `KineticCaptions`.
- `endFrame` is redundant with `startFrame + durationInFrames`; the registry ignores it.
- `emphasisWords` is optional everywhere it appears.
- `icon_text` requires an `icon` string (used for the icon component's icon picker).
- `versus` uses `left`/`right` strings directly, NOT the `[{label, value, items?}]` shape the `VersusCardTest` composition uses. The orchestrator must map them to the right prop names.

### Step 3: Orchestrator (`src/MotionGraphicsVideo.tsx`)
- Uses `<Sequence from={beat.startFrame} durationInFrames={beat.durationInFrames}>` per beat
- Each sequence wraps:
  - `<PersistentBackground />` (always behind)
  - `<SceneTransition>` → the beat component
  - `<KineticCaptions>` overlay (respects `captionEnabledTypes` to skip on chart beats)
- Per-beat `<Sequence>` (NOT `.map()`) keeps durations editable in Studio per the Remotion video-editing rule.

### Step 4: Dynamic Duration (`src/calculateMetadata.ts`)
- `calculateMetadata` reads `props.beats` and returns `durationInFrames = lastBeat.startFrame + lastBeat.durationInFrames`
- Composition auto-resizes when `beats.json` changes.
- Optionally load `beats.json` at runtime via `staticFile()` + `fetch` so Phase 1 output updates do not require a Remotion rebuild.

### Step 5: Audio + Word Sync (`src/audio/NarrationLayer.tsx`)
- Single `<Audio src={staticFile("narration.mp3")} />` for the full track
- Volume ramp-out over the last 0.3s to avoid pop
- `KineticCaptions` already consumes `word_timestamps.json` via `words[]` with `{word, start, end}` in seconds; sync is driven by `useCurrentFrame()` / fps.

### Step 6: Scene Transitions (`src/SceneTransition.tsx`)
- Provides the `SceneTransitionContextValue` (`isIdle`, `entranceProgress`, `exitProgress`, `idleProgress`, `overallProgress`) that existing components already expect.
- Hardcoded `<Sequence>` per beat with internal `entranceProgress` interpolation (cut-based Shorts) is preferred over `<TransitionSeries>` cross-fade for editability.

### Step 7: Wire Up `Root.tsx`
- Replace the `MotionGraphicsVideo` TODO stub with the real composition.
- Pass `beats`, `words`, `narrationSrc` via `defaultProps`.
- Keep all `*Test` compositions in their own folder for Studio component preview.
- `MotionGraphicsVideo` uses `calculateMetadata` for dynamic duration.

### Step 8: Build Order
1. ~~`beats/types.ts` + `beats/registry.ts` — type foundation~~ ✅
2. `MotionGraphicsVideo.tsx` — orchestrator (single-beat render first to prove the loop)
3. `SceneTransition.tsx` — entrance/exit wrapper
4. `calculateMetadata.ts` — dynamic duration
5. `audio/NarrationLayer.tsx` — narration audio
6. Wire up `Root.tsx` properly (replace TODO stub)
7. Run `npx remotion studio` and fix component prop mismatches beat-by-beat

### Critical Decisions
1. **Per-beat `<Sequence>`** vs **`<TransitionSeries>`** — Using per-beat `<Sequence>` (cut-based, easier to edit in Studio). No cross-fade transitions between beats for now.
2. **Where to load `beats.json`?** — Runtime fetch via `calculateMetadata` so Phase 1 output updates do not require a rebuild.
3. **Keep `*Test` compositions in `Root.tsx`?** — Yes, in their own folder for Studio component preview.
4. **Zod for metadata validation** — Confirmed; install via `npx remotion add zod`.
5. **Fallback components** — Confirmed; `chart_comparison`, `map_location`, `process_flow`, `quote_card` reuse existing components (ChartComparison3D, Map3D, Timeline, KeyStatement) until dedicated variants are built.
6. **Top-level `text` vs `metadata.text`** — Orchestrator will treat top-level `text` as the per-beat narration source for `KineticCaptions`, and ignore any `metadata.text` (some Zod schemas still require it for the inner component to render).
