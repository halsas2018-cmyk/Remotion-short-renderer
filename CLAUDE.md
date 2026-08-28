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
calculateMetadata (dynamic duration)
  ↓
RenderBeat per beat (hard-coded <Sequence>)
  ↓
  adaptMetadata() (Python shape → component shape)
  ↓
  validateBeatMetadata() (Zod)
  ↓
  PersistentBackground (behind)
  ↓
  SceneTransition (entrance/exit)
  ↓
  Beat component (KeyStatement, ChartLine, etc.) [from registry]
  ↓
  BeatKineticCaptions (word-sync overlay)
  ↓
Audio narration (root)
```

### Project Structure
```
src/
├── Root.tsx                          # Compositions registry
├── MotionGraphicsVideo.tsx           # Main orchestrator ✅ DONE
├── beats/
│   ├── registry.ts                   # Maps beat.type → React component + Zod schema ✅ DONE
│   ├── renderBeat.tsx                # Renders a single beat ✅ DONE
│   ├── types.ts                      # Beat type definitions ✅ DONE
│   └── words.ts                      # Word timestamp type ✅ DONE
├── SceneTransition.tsx               # Entrance/exit wrapper ✅ DONE
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
│   ├── BeatKineticCaptions.tsx       # Per-beat wrapper ✅ DONE
│   └── NarrationLayer.tsx            # <Audio> wrapper with word-sync
├── calculateMetadata.ts              # Dynamic duration ✅ DONE (in MotionGraphicsVideo.tsx)
└── lib/
    └── totalDuration.ts              # Sums beat durations
```

### Step 1: Beat Type System (`src/beats/types.ts`) — ✅ DONE (commit 78e3f69)
- `BeatType` union of all 15 supported types
- `Beat` object: `{type, startFrame, durationInFrames, metadata}`
- `TimedBeats`: wraps beats with `fps` and `totalDurationInFrames`

### Step 2: Component Registry (`src/beats/registry.ts`) — ✅ DONE (commit ffebd7d)
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

**Fallback mappings**:
- `chart_comparison` → `ChartComparison3D`
- `map_location` → `Map3D`
- `process_flow` → `Timeline`
- `quote_card` → `KeyStatement`

### Step 3: Orchestrator (`src/MotionGraphicsVideo.tsx`) — ✅ DONE
- Root composition: `MotionGraphicsVideo`
- Renders the `narration.mp3` once at the root via `<Audio src={staticFile(narrationSrc)} />`
- Maps over `beats.beats` (data array) and produces one `<RenderBeat>` per beat
- Each beat is a single authored `<Sequence>` (the JSX tree inside `RenderBeat` is hardcoded, so durations stay editable in Studio per the Remotion video-editing rule)
- `calculateMetadata` reads `props.beats` and returns `durationInFrames = lastBeat.startFrame + lastBeat.durationInFrames` so the composition auto-resizes when `beats.json` changes
- White background; `PersistentBackground` per-beat composes on top

### Step 4: Render a Single Beat (`src/beats/renderBeat.tsx`) — ✅ DONE
Each beat's `<Sequence>` contains three layers, in z-order:
1. `<PersistentBackground />` (logo + grid + 3D cubes) — drawn behind
2. `<SceneTransition>` → `<BeatComponent {...validatedMetadata} durationInFrames={...} />` — the typed component from the registry
3. `<BeatKineticCaptions text={beat.text} words={beatWords} beatType={beat.type} />` — per-beat word-sync caption overlay

**Per-beat word slicing:** The orchestrator filters `allWords` to `[startFrame/fps, (startFrame + durationInFrames)/fps]` so captions stay in sync with the current beat.

**Failure handling:** If Zod validation fails OR no component is registered, the beat renders a labeled fallback message inside its sequence (red for invalid, blue for unsupported) — this keeps the timeline readable and makes Python pipeline bugs visible.

**Metadata adapter (`adaptMetadata`):** Python emits a *minimal* shape per beat (`versus.left` is a string, `timeline.events` is a string array) but the existing components expect a *rich* shape (`VersusCard` wants `{label, value, items}` objects; `Timeline` wants `{marker, label}` objects). `adaptMetadata(type, raw, text)` runs before Zod validation and converts the minimal shape into the rich shape. Adapters:
- `versus`: `{left: "..."}` → `{left: {label: "..."}}` (same for `right`)
- `timeline`: `["a", "b"]` → `[{marker: "Step 1", label: "a"}, ...]`
- `process_flow`: `["a", "b"]` → `[{marker: "1", label: "a"}, ...]` (Timeline fallback)
- all others: pass through

### Step 5: Dynamic Duration (`calculateMetadata`) — ✅ DONE
Lives inside `src/MotionGraphicsVideo.tsx`. Reads `props.beats` and returns the last beat's `startFrame + durationInFrames`. Composition auto-resizes.

### Step 6: Scene Transitions (`src/SceneTransition.tsx`) — ✅ DONE
- Wraps a beat's content in a `SceneTransitionContext` with `entranceProgress`, `exitProgress`, `idleProgress`, `overallProgress`, `isIdle`
- Phase budgets: 18% entrance / 64% idle / 18% exit (tuned for 1.5s–4s beats)
- Default wrapper behavior: gentle fade + slide-up entrance, fade exit
- Children can read context via `useSceneTransition()` to layer their own animations
- Default context (when used outside a `<SceneTransition>`) provides identity values so existing `*Test` compositions still work

### Step 7: Per-beat Captions Wrapper (`src/audio/BeatKineticCaptions.tsx`) — ✅ DONE
Bridges the new orchestrator props (`{text, words, durationInFrames, beatType}`) to the existing `KineticCaptions` API (`{captionEnabledTypes, beats, words}`). Used so the orchestrator can pass already-sliced `words` per beat without modifying `KineticCaptions.tsx`.

### Step 8: Wire Up `Root.tsx` — ✅ DONE
- The `MotionGraphicsVideo` composition is now wired to the real `MotionGraphicsVideo` component (was a TODO stub)
- `defaultProps` passes `beats` (from `beats.json`), `words` (from `timestamps.json`), and `narrationSrc: "narration.mp3"`
- `calculateMetadata` from the orchestrator overrides the static `durationInFrames`
- All existing `*Test` compositions are preserved in the same root file

### Step 9: Build Order Status
1. ~~`beats/types.ts` + `beats/registry.ts` — type foundation~~ ✅
2. ~~`MotionGraphicsVideo.tsx` — orchestrator~~ ✅
3. ~~`SceneTransition.tsx` — entrance/exit wrapper~~ ✅
4. ~~`calculateMetadata` — dynamic duration~~ ✅
5. ~~Per-beat `RenderBeat` + `BeatKineticCaptions` wrapper~~ ✅
6. ~~Wire up `Root.tsx` (replace TODO stub)~~ ✅
7. ~~Fix orchestrator prop mismatches (`adaptMetadata` + drop `text` prop)~~ ✅
8. Run `npx remotion studio` to find next round of component-side mismatches (NEXT)

### Critical Decisions
1. **Per-beat `<Sequence>`** vs **`<TransitionSeries>`** — Using per-beat `<Sequence>` (cut-based, easier to edit in Studio). No cross-fade transitions between beats for now.
2. **Where to load `beats.json`?** — Build-time import in `Root.tsx` (chosen for now; runtime fetch can be added later via `calculateMetadata` if needed).
3. **Keep `*Test` compositions in `Root.tsx`?** — Yes, in their own folder for Studio component preview.
4. **Zod for metadata validation** — Confirmed; install via `npx remotion add zod`.
5. **Fallback components** — Confirmed; `chart_comparison`, `map_location`, `process_flow`, `quote_card` reuse existing components until dedicated variants are built.
6. **Top-level `text` vs `metadata.text`** — Orchestrator merges top-level `text` into `metadata` before Zod validation, then passes top-level `text` to `KineticCaptions` separately.
7. **Failure handling** — Bad Python output is shown in-place as a red/blue fallback message inside the offending beat's sequence, not as a render crash.
8. **BeatKineticCaptions wrapper** — Created to bridge the new orchestrator's per-beat word slicing to the existing `KineticCaptions` API without modifying that component.
9. **Metadata adapter (`adaptMetadata`)** — Converts Python's minimal beat shapes (string `left`/`right`, string `events[]`, string `steps[]`) into the rich object shapes the existing components expect, BEFORE Zod validation. Keeps the components untouched while accepting the Python pipeline's output format.
