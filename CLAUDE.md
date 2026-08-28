# Kinetic Typo Vid — Project Documentation

## Overview
Automated pipeline for creating YouTube Shorts from news stories.  
**Phase 1 (Python) — COMPLETE**: Discover → Research → Script → Voice → Word Timestamps → Beats (visual plan).  
**Phase 2 (Remotion) — IN PROGRESS**: Render beats + narration into final MP4.

---

## Render Data (single-folder input)

The renderer reads **four** files at composition-mount time. Drop them in `public/` and run `npx remotion render MotionGraphicsVideo out/movie.mp4`. No code change required.

```
public/
├── narration.mp3       # TTS narration (mounted by the orchestrator)
├── beats.json          # Beat plan from Phase 1 (fetched via calculateMetadata)
├── timestamps.json     # WhisperX word-level timestamps (fetched via calculateMetadata)
└── sfx-ambient.mp3     # Looping ambient bed (mounted by the orchestrator)
```

The orchestrator **never** imports these files at build time. They are loaded at runtime:
- `narration.mp3` and `sfx-ambient.mp3` are read directly by `MotionGraphicsVideo` via `<Audio src={staticFile("…")} />`.
- `beats.json` and `timestamps.json` are fetched in `Root.tsx`'s `renderDataCalculateMetadata` via `fetch(staticFile("…"))` and injected into `props.beats` / `props.words`. The orchestrator's own `calculateMetadata` then derives `durationInFrames` from those props.

To render a different story, copy the four files above into `public/` and re-run the render command. The `*Test` compositions in Studio still use hard-coded `defaultProps` (no fetch needed).

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
1. **Animation**: Use `useCurrentFrame()` + `interpolate()` with `Easing.bezier` / `Easing.spring` for timing — no CSS transitions
2. **Timing**: Keep `interpolate()` calls inline in style props for Studio interactivity
3. **Transforms**: Use individual CSS properties (`scale`, `translate`, `rotate`) over `transform` strings
4. **Fonts**: Load via `@remotion/google-fonts` for type-safe, blocking font loading
5. **Assets**: Place in `public/` folder, reference with `staticFile()`. For **runtime** JSON data, use `fetch(staticFile("…"))` inside `calculateMetadata` (see Step 8).
6. **Transitions**: Use `<TransitionSeries>` + `fade()` (from `@remotion/transitions`) for cross-fades between beats. Use `SceneTransition` for per-beat entrance/exit.
7. **SFX**: Use `<Audio>` from `@remotion/media` (works in both server-side render and `<Player>`). Centralize URLs in `src/lib/sceneSfx.ts`.
8. **Ambient SFX**: A looping bed under the narration uses `<Audio loop loopVolumeCurveBehavior="extend" volume={(f) => interpolate(f, [0, FADE_FRAMES], [0, TARGET_VOLUME], {extrapolateRight: "clamp"})} />`. Mounted at the root, not per-beat, so it spans the whole composition.

### Running the Renderer
```bash
# 1. Drop the four files into public/ (see top of this doc)
# 2. Render
npx remotion render MotionGraphicsVideo out/movie.mp4
```

### Preview
```bash
npx remotion studio --no-open
```

---

## Phase 2: Video Generator Plan (IN PROGRESS)

### Architecture
```
public/   (single source of render data)
  narration.mp3
  beats.json
  timestamps.json
  sfx-ambient.mp3
  ↓
Root.tsx::renderDataCalculateMetadata (async fetch via staticFile)
  ↓
MotionGraphicsVideo.tsx (orchestrator)
  ↓
calculateMetadata (sync; subtracts transition frames)
  ↓
<TransitionSeries> (per-beat <Sequence> with cross-fade between)
  ↓
  <Audio src=whoosh>          (UI feedback on each cross-fade; inside Transition)
  ↓
  adaptMetadata() (Python shape → component shape)
  ↓
  validateBeatMetadata() (Zod)
  ↓
  PersistentBackground (root, behind everything)
  ↓
  SceneTransition (per-beat entrance/exit with Easing.bezier)
  ↓
  Beat component (KeyStatement, ChartLine, etc.) [from registry]
  ↓
  BeatKineticCaptions (word-sync overlay; only for data-vis types)
  ↓
  <Audio src=mouse-click>     (one per word; typing SFX; data-vis beats only)
  ↓
Audio narration (root)
Audio ambient SFX (root, looping, fades in over 1s)
```

### Project Structure
```
src/
├── Root.tsx                          # Compositions registry + renderDataCalculateMetadata ✅ DONE
├── MotionGraphicsVideo.tsx           # Main orchestrator ✅ DONE
├── beats/
│   ├── registry.ts                   # Maps beat.type → React component + Zod schema ✅ DONE
│   ├── renderBeat.tsx                # Renders a single beat ✅ DONE
│   ├── types.ts                      # Beat type definitions ✅ DONE
│   └── words.ts                      # Word timestamp type ✅ DONE
├── SceneTransition.tsx               # Per-beat entrance/exit with Easing.bezier ✅ DONE
├── PersistentBackground.tsx          # Background (logo + 2D scrolling grid) ✅ DONE
├── Logo.tsx                          # 3D S-NEWS voxel logo
├── components/
│   ├── KeyStatement.tsx
│   ├── PlainText.tsx
│   ├── IconText.tsx
│   ├── ChartLine.tsx
│   ├── ChartCounter.tsx
│   ├── ChartComparison3D.tsx         # Only `chart_comparison_3d` is used
│   ├── ProgressMeter.tsx
│   ├── Timeline.tsx
│   ├── VersusCard.tsx
│   ├── BeforeAfter.tsx
│   ├── Map3D.tsx                     # Only `map_3d` is used
│   └── KineticCaptions.tsx
├── audio/
│   ├── BeatKineticCaptions.tsx       # Per-beat wrapper + typing SFX ✅ DONE
│   └── NarrationLayer.tsx            # <Audio> wrapper with word-sync
├── lib/
│   ├── totalDuration.ts              # Sums beat durations
│   ├── transitionDuration.ts         # Dynamic cross-fade frames ✅ DONE
│   └── sceneSfx.ts                   # SFX URLs + defaults (whoosh, click, ambient) ✅ DONE
├── calculateMetadata.ts              # Dynamic duration ✅ DONE (in MotionGraphicsVideo.tsx)
├── Composition.tsx                   # Template file (unused; placeholder)
└── …
public/                                # All render data lives here (single-folder input)
├── narration.mp3
├── beats.json
├── timestamps.json
└── sfx-ambient.mp3
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
- `chart_comparison_3d` → `{items[{label,value}]}`
- `progress_meter` → `{value, maxValue, label}`
- `timeline` → `{events[{marker,label}]}`
- `versus` → `{left, right}`
- `before_after` → `{beforeLabel, afterLabel}`
- `map_3d` → `{locationName, latitude, longitude, buildings?}`
- `process_flow` → `{steps[]}`
- `quote_card` → `{quote, author?}`

**Active beat types** (what the Python pipeline currently emits):
- `map_3d` (not `map_location`)
- `chart_comparison_3d` (not `chart_comparison`)

**Fallback mappings**:
- `process_flow` → `Timeline`
- `quote_card` → `KeyStatement`

### Step 3: Orchestrator (`src/MotionGraphicsVideo.tsx`) — ✅ DONE
- Root composition: `MotionGraphicsVideo`
- Renders the `narration.mp3` once at the root via `<Audio src={staticFile(narrationSrc)} />`
- Wraps `PersistentBackground` once at the root (so its frame counter is global)
- Renders beats inside a single `<TransitionSeries>` (see Step 4) with a `<TransitionSeries.Transition presentation={fade()} />` between every adjacent pair
- Each `<TransitionSeries.Transition>` also contains a `<Audio src={whoosh}>` for UI feedback (see Step 4b/6b)
- Renders the `sfx-ambient.mp3` once at the root as a looping ambient bed (see Step 6d)
- `calculateMetadata` returns `sum(beatDurations) - sum(transitionFrames)` so the composition auto-resizes when `beats.json` changes (see Step 4b for the duration math)
- White background

### Step 4: Render a Single Beat (`src/beats/renderBeat.tsx`) — ✅ DONE
Each beat is wrapped in `<TransitionSeries.Sequence durationInFrames={...}>`. The cross-fade between adjacent sequences is rendered by `<TransitionSeries.Transition presentation={fade()} timing={linearTiming({...})} />` (in the orchestrator, see Step 4b).

Inside each `<TransitionSeries.Sequence>`:
1. `<SceneTransition>` → `<BeatComponent {...validatedMetadata} durationInFrames={...} />` — the typed component from the registry
2. `<BeatKineticCaptions text={beat.text} words={beatWords} beatType={beat.type} fps={fps} />` — per-beat word-sync caption overlay, **only rendered for data-vis beat types** (see below). The `fps` prop is forwarded so the click track is frame-accurate.

**Per-beat word slicing:** The orchestrator filters `allWords` to `[startFrame/fps, (startFrame + durationInFrames)/fps]` so captions stay in sync with the current beat.

**Failure handling:** If Zod validation fails OR no component is registered, the beat renders a labeled fallback message inside its sequence (red for invalid, blue for unsupported) — this keeps the timeline readable and makes Python pipeline bugs visible.

**Kinetic captions gate:** `BeatKineticCaptions` is rendered ONLY for these beat types (data-vis heavy — captions help the viewer follow numbers/visuals):
`map_3d`, `chart_line`, `chart_comparison_3d`, `chart_counter`, `progress_meter`, `timeline`.

It is suppressed for text/card heavy beat types (the on-screen text is already the caption):
`key_statement`, `plain_text`, `icon_text`, `versus`, `before_after`, `process_flow`, `quote_card`.

The gate is implemented in `src/beats/renderBeat.tsx` as:

```ts
const CAPTION_VISIBLE_BEAT_TYPES = new Set<string>([
  "map_3d",
  "chart_line",
  "chart_comparison_3d",
  "chart_counter",
  "progress_meter",
  "timeline",
]);

const shouldShowKineticCaptions = (beatType: string): boolean =>
  CAPTION_VISIBLE_BEAT_TYPES.has(beatType);
```

…and used inside `RenderBeat` after word-slicing:

```ts
const showCaptions = shouldShowKineticCaptions(beat.type);
// …
{showCaptions ? <BeatKineticCaptions … /> : null}
```

**Metadata adapter (`adaptMetadata`):** Python emits a *minimal* shape per beat (`versus.left` is a string, `timeline.events` is a string array) but the existing components expect a *rich* shape (`VersusCard` wants `{label, value, items}` objects; `Timeline` wants `{marker, label}` objects). `adaptMetadata(type, raw, text)` runs before Zod validation and converts the minimal shape into the rich shape. Adapters:
- `versus`: `{left: "..."}` → `{left: {label: "..."}}` (same for `right`)
- `timeline`: `["a", "b"]` → `[{marker: "Step 1", label: "a"}, ...]`
- `process_flow`: `["a", "b"]` → `[{marker: "1", label: "a"}, ...]` (Timeline fallback)
- all others: pass through

### Step 4b: Dynamic Cross-Fade Between Beats — ✅ DONE
Adjacent beats are joined with `<TransitionSeries.Transition presentation={fade()} />` (from `@remotion/transitions/fade`). The transition **duration** is computed dynamically per pair, so short beats get a short cross-fade and long beats don't drag through a long one.

**Helper: `src/lib/transitionDuration.ts`**

```ts
export const TRANSITION_PCT = 0.15;
export const TRANSITION_MIN_FRAMES = 4;
export const TRANSITION_MAX_FRAMES = 15;

export const computeTransitionFrames = (
  outgoingDurationInFrames: number,
  incomingDurationInFrames: number,
): number => {
  const shorter = Math.min(outgoingDurationInFrames, incomingDurationInFrames);
  const pctBased = Math.round(TRANSITION_PCT * shorter);
  return Math.max(
    TRANSITION_MIN_FRAMES,
    Math.min(TRANSITION_MAX_FRAMES, pctBased),
  );
};
```

Formula: `transitionFrames = clamp(round(0.15 * min(out, in)), 4, 15)`. The shorter side is the bottleneck (you can't cross-fade longer than the shorter side has idle time), and the `[4, 15]` clamp keeps very short beats visible and very long beats snappy (≤0.5s at 30 fps).

**Composition duration:** `calculateMetadata` uses the same helper to compute the total:

```ts
total = sum(beatDurations) - sum(transitionFrames[i] for i in 0..n-2)
```

`computeTransitionFrames` is the single source of truth — both the orchestrator and `calculateMetadata` call it so the rendered timeline and the declared total duration are guaranteed to match.

**Studio editability trade-off:** `<TransitionSeries.Sequence>` supports `durationInFrames` but NOT `from`. Beat ordering is therefore determined by array order in `beats.json`, not by per-beat `startFrame` (which the Python pipeline still emits for reference but the orchestrator now ignores). Cross-fade duration is also derived, not editable in Studio.

### Step 5: Dynamic Duration (`calculateMetadata`) — ✅ DONE
Lives inside `src/MotionGraphicsVideo.tsx`. Sums beat durations and subtracts the sum of `computeTransitionFrames` per adjacent pair. Composition auto-resizes and stays in sync with the rendered timeline.

### Step 6: Scene Transitions (`src/SceneTransition.tsx`) — ✅ DONE
- Wraps a beat's content in a `SceneTransitionContext` with `entranceProgress`, `exitProgress`, `idleProgress`, `overallProgress`, `isIdle`
- Phase budgets: 18% entrance / 64% idle / 18% exit (tuned for 1.5s–4s beats)
- **Easing**: `Easing.bezier(0.16, 1, 0.3, 1)` (Remotion skill default) on entrance; `Easing.bezier(0.7, 0, 0.84, 0)` on exit; same entrance easing on the default `translateY` slide-up
- Default wrapper behavior: gentle fade + slide-up entrance, fade exit
- Children can read context via `useSceneTransition()` to layer their own animations
- Default context (when used outside a `<SceneTransition>`) provides identity values so existing `*Test` compositions still work

### Step 6b: Scene Transition SFX — ✅ DONE
Each `<TransitionSeries.Transition>` in the orchestrator contains a `<Audio src={TRANSITION_SFX_URL} volume={TRANSITION_SFX_VOLUME} />` that plays a short whoosh at the start of the cross-fade. The SFX is mounted as a *child* of `<TransitionSeries.Transition>`, so it starts when the transition starts and stops when the transition ends — the local clock is bounded by the transition's own `durationInFrames`, no need for `from`/`durationInFrames` props on the audio.

- **URL**: `https://remotion.media/whoosh.wav` (from the project's `sfx.md` skill).
- **Volume**: 0.5.
- **Behavior**: same whoosh for every transition; no loop; first beat has no incoming transition so no SFX plays for it; the final beat has no outgoing transition so the closing fade-out is silent.
- **Centralized**: `src/lib/sceneSfx.ts` exports `TRANSITION_SFX_URL` and `TRANSITION_SFX_VOLUME` so tweaks happen in one place.
- **Compatibility**: `<Audio>` from `@remotion/media` works in both server-side render and `<Player>` (unlike `<Audio>` from `remotion` which becomes `<Html5Audio>`).

Code shape inside the orchestrator's `<TransitionSeries>`:

```tsx
<TransitionSeries.Transition
  presentation={fade()}
  timing={linearTiming({
    durationInFrames: computeTransitionFrames(
      beat.durationInFrames,
      next.durationInFrames,
    ),
  })}
>
  <Audio src={TRANSITION_SFX_URL} volume={TRANSITION_SFX_VOLUME} />
</TransitionSeries.Transition>
```

### Step 6c: Typing SFX on Kinetic Captions — ✅ DONE
Whenever `<BeatKineticCaptions>` renders (i.e. for data-vis beats), it also renders a click track — one short `<Audio>` per word, placed at the word's start frame inside the beat's local timeline. The click gives the typing a tactile feel without competing with the narration.

- **URL**: `https://remotion.media/mouse-click.wav` (from the project's `sfx.md` skill).
- **Volume**: 0.15 (intentionally quiet — doesn't fight the narration or the whoosh).
- **Gating**: same `CAPTION_VISIBLE_BEAT_TYPES` set as the visual captions. Text/card beats don't get the click track because they don't show words ticking through.
- **Implementation**: in `src/audio/BeatKineticCaptions.tsx`. For each `word` in the beat's word list, the wrapper renders a 1-frame `<Sequence from={wordStartFrame} durationInFrames={1}>` containing the click. The 1-frame sequence is enough to start the audio; the click itself is a short blip that stops on its own. The parent `<TransitionSeries.Sequence>` bounds the whole track to the beat's `durationInFrames`.
- **Prop change**: `RenderBeat` now forwards `fps` to `<BeatKineticCaptions fps={fps} />` so the click track is frame-accurate.

Code shape inside `BeatKineticCaptions`:

```tsx
{words.map((w, i) => {
  const wordStartFrame = Math.max(0, Math.round(w.start * fps));
  return (
    <Sequence
      key={`type-${i}-${w.start}`}
      from={wordStartFrame}
      durationInFrames={1}
    >
      <Audio src={TYPING_SFX_URL} volume={TYPING_SFX_VOLUME} />
    </Sequence>
  );
})}
```

### Step 6d: Ambient SFX Bed — ✅ DONE (commit 36433c8)
A looping ambient track plays underneath the narration for the entire composition. It is the third audio source in the mix (narration + ambient + per-transition whoosh + per-word click) and is intended to sit quietly under everything else.

- **URL**: `sfx-ambient.mp3` — local file in `/public`. Drop the file in `public/`; the orchestrator mounts it via `<Audio src={staticFile(AMBIENT_SFX_URL)} />`.
- **Volume**: 0.15, with a 1-second fade-in from 0 → 0.15 at the start of the composition. Steady-state volume is low so the ambient doesn't compete with the narration, the whoosh, or the typing clicks. Per `.agents/skills/remotion-markup/audio.md` best practices for ambient sound: low steady volume + `loop` + `loopVolumeCurveBehavior="extend"`.
- **Mounted at the root** of `MotionGraphicsVideo`, NOT per-beat, so it spans the whole composition without restarting at every cross-fade.
- **Centralized**: `src/lib/sceneSfx.ts` exports `AMBIENT_SFX_URL`, `AMBIENT_SFX_VOLUME`, and `AMBIENT_SFX_FADE_IN_FRAMES`.
- **Compatibility**: `<Audio>` from `@remotion/media` works in both server-side render and `<Player>` (unlike `<Audio>` from `remotion` which becomes `<Html5Audio>`).

Code shape inside the orchestrator:

```tsx
<Audio
  src={staticFile(AMBIENT_SFX_URL)}
  loop
  loopVolumeCurveBehavior="extend"
  volume={(f) =>
    interpolate(
      f,
      [0, AMBIENT_SFX_FADE_IN_FRAMES],
      [0, AMBIENT_SFX_VOLUME],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    )
  }
/>
```

### Step 7: Per-beat Captions Wrapper (`src/audio/BeatKineticCaptions.tsx`) — ✅ DONE
Bridges the new orchestrator props (`{text, words, durationInFrames, beatType, fps}`) to the existing `KineticCaptions` API (`{captionEnabledTypes, beats, words}`). Used so the orchestrator can pass already-sliced `words` per beat without modifying `KineticCaptions.tsx`. Also hosts the typing-click track (see Step 6c).

### Step 8: Wire Up `Root.tsx` — ✅ DONE
- `renderDataCalculateMetadata` (in `Root.tsx`) is the **async** `calculateMetadata` for the `MotionGraphicsVideo` composition. It fetches `public/beats.json` and `public/timestamps.json` via `fetch(staticFile("…"))` in parallel, injects the parsed JSON into `props.beats` / `props.words`, and returns both the resolved `durationInFrames` (from `beats.totalDurationInFrames`) and the populated props.
- The **sync** `calculateMetadata` in `MotionGraphicsVideo.tsx` then runs on the now-populated `props.beats` to compute the actual rendered duration (`sum - sum(transitionFrames)`) — this is the value Remotion actually uses to size the composition.
- `defaultProps` passes only placeholder values (`beats: empty, words: [], narrationSrc: "narration.mp3"`) because the real values come from the fetch.
- The four data files all live in `public/` — `narration.mp3`, `beats.json`, `timestamps.json`, `sfx-ambient.mp3`. Drop them in `public/` and run `npx remotion render`. No code change required.
- All existing `*Test` compositions are preserved in the same root file with their hard-coded `defaultProps` (they don't need the JSONs).

### Step 9: Build Order Status
1. ~~`beats/types.ts` + `beats/registry.ts` — type foundation~~ ✅
2. ~~`MotionGraphicsVideo.tsx` — orchestrator~~ ✅
3. ~~`SceneTransition.tsx` — entrance/exit wrapper~~ ✅
4. ~~`calculateMetadata` — dynamic duration~~ ✅
5. ~~Per-beat `RenderBeat` + `BeatKineticCaptions` wrapper~~ ✅
6. ~~Wire up `Root.tsx` (replace TODO stub)~~ ✅
7. ~~Fix orchestrator prop mismatches (`adaptMetadata` + drop `text` prop)~~ ✅
8. ~~Fix import path in `Root.tsx` (`./beats.json` → `./beats/beats.json`)~~ ✅
9. ~~Gate `BeatKineticCaptions` to data-vis beat types only~~ ✅
10. ~~Add `Easing.bezier` to `SceneTransition` entrance/exit~~ ✅
11. ~~Switch orchestrator to `<TransitionSeries>` with dynamic cross-fade~~ ✅
12. ~~Add whoosh SFX to every `<TransitionSeries.Transition>`~~ ✅
13. ~~Add typing click SFX on every word in kinetic captions~~ ✅
14. ~~Add looping ambient SFX bed under narration~~ ✅ (commit 36433c8)
15. ~~Single-folder data input: read all 4 render files from `public/` via runtime fetch~~ ✅
16. Run `npx remotion studio` to find next round of component-side mismatches (NEXT)

### Critical Decisions
1. **`<TransitionSeries>` for cross-fade + per-beat `<Sequence>` was replaced.** Now using `<TransitionSeries>` with `<TransitionSeries.Sequence>` and `<TransitionSeries.Transition presentation={fade()} />` between adjacent beats. Cross-fade duration is computed dynamically per pair. Trade-off: per-beat `from` is no longer editable in Studio (only `durationInFrames`).
2. **Where to load render data?** — Runtime fetch from `public/`. `Root.tsx::renderDataCalculateMetadata` fetches `public/beats.json` + `public/timestamps.json` via `fetch(staticFile("…"))`, injects them into `props`. `MotionGraphicsVideo` reads `public/narration.mp3` and `public/sfx-ambient.mp3` directly via `staticFile("…")`. No build-time imports. Trade-off: a small startup cost at composition mount (the JSONs need to fetch) and a single `MotionGraphicsVideo` `defaultProps` placeholder. Benefit: drop the four files in `public/` and render — no source edit.
3. **Keep `*Test` compositions in `Root.tsx`?** — Yes, in their own folder for Studio component preview.
4. **Zod for metadata validation** — Confirmed; install via `npx remotion add zod`.
5. **Fallback components** — Confirmed; `process_flow` and `quote_card` reuse existing components until dedicated variants are built.
6. **Top-level `text` vs `metadata.text`** — Orchestrator merges top-level `text` into `metadata` before Zod validation, then passes top-level `text` to `KineticCaptions` separately.
7. **Failure handling** — Bad Python output is shown in-place as a red/blue fallback message inside the offending beat's sequence, not as a render crash.
8. **BeatKineticCaptions wrapper** — Created to bridge the new orchestrator's per-beat word slicing to the existing `KineticCaptions` API without modifying that component.
9. **Metadata adapter (`adaptMetadata`)** — Converts Python's minimal beat shapes (string `left`/`right`, string `events[]`, string `steps[]`) into the rich object shapes the existing components expect, BEFORE Zod validation. Keeps the components untouched while accepting the Python pipeline's output format.
10. **Kinetic captions gate** — `BeatKineticCaptions` is rendered only for data-vis beat types (`map_3d`, `chart_line`, `chart_comparison_3d`, `chart_counter`, `progress_meter`, `timeline`). Suppressed for text/card heavy types where the on-screen text is the caption. The gate is centralized in `RenderBeat` via `CAPTION_VISIBLE_BEAT_TYPES` (see Step 4 for the code snippet).
11. **3D-only map and chart comparison** — The Python pipeline emits `map_3d` (not `map_location`) and `chart_comparison_3d` (not `chart_comparison`). The 2D variants are not currently in use.
12. **Easing on per-beat entrance/exit** — `SceneTransition` uses `Easing.bezier(0.16, 1, 0.3, 1)` (Remotion skill default) for entrance and `Easing.bezier(0.7, 0, 0.84, 0)` for exit. Same entrance easing on the default `translateY` slide-up.
13. **Dynamic cross-fade duration** — `computeTransitionFrames(out, in)` (in `src/lib/transitionDuration.ts`) returns `clamp(round(0.15 * min(out, in)), 4, 15)`. Used by both the orchestrator and `calculateMetadata` as the single source of truth.
14. **Transition SFX** — A whoosh.wav from the Remotion CDN plays at the start of every `<TransitionSeries.Transition>`, mounted as a child of the transition (its local clock is bounded by the transition's own `durationInFrames`). Volume 0.5. URL and volume centralized in `src/lib/sceneSfx.ts`. First beat has no incoming transition, so no SFX plays for it; final beat's exit is silent.
15. **Typing SFX** — A mouse-click.wav from the Remotion CDN plays at the start of every word inside `<BeatKineticCaptions>`, gated to the same data-vis beat types as the visual captions. Volume 0.15. Each click lives inside a 1-frame `<Sequence from={wordStartFrame} durationInFrames={1}>`; the parent `<TransitionSeries.Sequence>` bounds the whole track to the beat. `fps` is forwarded from `RenderBeat` to `BeatKineticCaptions` so the click track is frame-accurate.
16. **Single-folder render data** — All four data files (`public/narration.mp3`, `public/beats.json`, `public/timestamps.json`, `public/sfx-ambient.mp3`) are loaded at composition mount time. `Root.tsx` fetches the two JSONs in `renderDataCalculateMetadata` and injects them into `props`. The audio files are read directly by the orchestrator via `staticFile("…")`. This replaces the previous build-time import in `Root.tsx`. To render a different story, copy the four files into `public/` and run `npx remotion render` — no source edits required.
17. **Ambient SFX** — A local `public/sfx-ambient.mp3` plays on `loop` with `loopVolumeCurveBehavior="extend"` underneath the narration. Volume is a callback `(f) => interpolate(f, [0, 30], [0, 0.15], {extrapolateRight: "clamp"})` so it fades in over the first second and then holds at 0.15 for the rest of the composition. Per `audio.md` best practices for ambient sound. Mounted at the root of `MotionGraphicsVideo` (not per-beat) so it spans the whole composition without restarting at every cross-fade. URL and volume centralized in `src/lib/sceneSfx.ts`.

### Real `beats.json` Example (current reference)
```json
{
  "fps": 30,
  "totalDurationInFrames": 1143,
  "beats": [
    { "type": "key_statement", "text": "Bank of America just warned...", "emphasisWords": ["Bank of America", "warned"], "startFrame": 4, "endFrame": 81, "durationInFrames": 77 },
    { "type": "icon_text", "text": "ignoring value stocks...", "icon": "warning", "startFrame": 81, "endFrame": 162, "durationInFrames": 81 },
    { "type": "versus", "text": "sitting on the sidelines...", "left": "value stocks sitting on sidelines", "right": "everyone chasing flashy tech", "startFrame": 257, "endFrame": 337, "durationInFrames": 80 },
    { "type": "timeline", "text": "costs rise...", "events": ["costs rise", "inflation stays high", "grocery‑store chain example"], "startFrame": 466, "endFrame": 565, "durationInFrames": 99 },
    { "type": "before_after", "text": "or a utility firm...", "beforeLabel": "utility firm quiet", "afterLabel": "utility firm pulling ahead", "startFrame": 565, "endFrame": 647, "durationInFrames": 82 },
    { "type": "process_flow", "text": "If you bought...", "steps": ["identify under‑the‑radar stocks", "buy a handful"], "startFrame": 878, "endFrame": 944, "durationInFrames": 66 }
  ]
}
```
With the new `<TransitionSeries>` + dynamic cross-fade, the rendered composition duration is `sum(durations) - sum(transitionFrames)` where each `transitionFrames` is `clamp(round(0.15 * min(out, in)), 4, 15)`. For the example above (sum of durations = 485, 5 transitions): 5 transitions × ~12 frames each ≈ 60 frames. Total ≈ **425 frames @ 30fps = 14.2 seconds** (within YouTube Shorts' 60s cap). Each of the 5 cross-fades plays a whoosh at the start; data-vis beats (`timeline` in this example) play a mouse-click per word in their captions. The ambient track loops under everything for the full 14.2 seconds.
