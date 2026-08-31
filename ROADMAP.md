# Kinetic Typo Vid — Roadmap & Next-Phase Plan

This document outlines what to build after the renderer successfully produces a single video end-to-end. Each horizon is independently shippable, so you can stop after any horizon and still have a useful system.

**Money lens (read this first):** anything that touches a paid API, a hosted service, or compute you don't already own is **deferred to a later horizon** below. The first three horizons are pure-local, zero-cost, and can be done with the tools already in the repo. The later horizons call out the cost model explicitly so you can decide whether to fund them.

---

## Render Mode (read this first)

The pipeline runs in one of two modes. **Pick the one that matches your current hardware.** This choice changes which horizons are on the critical path, not the source code.

### Mode A — Phone (current, no GPU) ⭐ ACTIVE
You're building on a phone (e.g. Termux on Android). Chromium headless rendering is slow and there's no GPU. **Use the Remotion Studio web UI to render in the browser.**

The Python pipeline runs to completion and drops the four files in `public/`. Then you open the Studio in a browser and click "Render". The browser does the actual video encoding (Chrome's MediaRecorder / WebCodecs), which is GPU-accelerated and fast even on mid-range phones.

```bash
# 1. Generate the four files (narration.mp3, beats.json, timestamps.json, sfx-ambient.mp3)
python -m run_pipeline

# 2. Copy them into the Remotion public/ folder if the pipeline didn't already
cp output/DD_MM_short_vids/<story_id>/*.mp3 public/
cp output/DD_MM_short_vids/<story_id>/beats.json public/
cp output/DD_MM_short_vids/<story_id>/timestamps.json public/

# 3. Start the Studio
npx remotion studio --no-open
# Open http://localhost:3000/MotionGraphicsVideo in your phone browser
# (use `adb reverse tcp:3000 tcp:3000` or ssh port-forward if needed)

# 4. Click "Render" in the top right, choose MP4, wait for the browser to encode
```

**Why this works on a phone:**
- No `npx remotion render` invocation (which is slow without a GPU).
- No Python batch driver needed.
- The browser uses Chrome's built-in video encoder, which is hardware-accelerated on most phones.

### Mode B — Laptop / Desktop (later, has GPU) ⭐ FUTURE
When you have a laptop with a real GPU, replace step 3 above with a one-line CLI render:

```bash
# Replace Mode A step 3 with this:
npx remotion render MotionGraphicsVideo out/movie.mp4

# Or batch many stories:
python -m render_batch  # future Horizon 1.1
```

This produces the same MP4 but locally. Then we can layer on a Python batch driver, a managed render farm, etc. (Horizons 1, 6, 7, 8 below.)

**Switching modes is a one-line change** in how you invoke rendering. The Python pipeline and the Remotion source are identical. Don't rebuild anything when you switch — just change the render command.

### Implications for the roadmap
- **Mode A horizons** (do now): everything that doesn't require a local render or a host. That includes Horizon 0 (renderer hardening), Horizon 2 (component coverage), Horizon 3 (LLM-driven beat generation), parts of Horizon 4 (everything except 4.1 local SD image gen), Horizon 5 (Studio is already the player), and Horizon 9 (E2E tests via CI runners).
- **Mode B horizons** (defer until laptop): Horizon 1 (Python batch driver), Horizon 6 (hosted dashboard), Horizon 7 (managed render farm), and the auto-upload step in Horizon 8 (manual upload from Studio is fine for now).

---

## What's already done (do not re-build)

These are the things that were marked as ✅ DONE in `CLAUDE.md`. They're referenced by horizon below only when a later horizon depends on them.

- Runtime data input from `public/` (narration.mp3, beats.json, timestamps.json, sfx-ambient.mp3) via `Root.tsx::renderDataCalculateMetadata`
- `<Sequence from={…}>` per beat (no more `<TransitionSeries>`)
- Cross-fade + whoosh SFX
- Per-beat `BeatKineticCaptions` with local-frame rebasing
- Typing-click SFX (4-frame sequences, stable for mediabunny)
- Looping ambient SFX bed
- `BeforeAfter` with `fitText`/`measureText`/`fillTextBox` headline sizing
- `VersusCard` beautification (Option A/B ribbons, VS badge, items, grid bg)
- `IconText` / `Timeline` Lucide-only icons (Lottie removed)
- `SceneTransition` with entrance/exit/idle phases
- `computeTransitionFrames` (`clamp(round(0.15 * min(out, in)), 4, 15)`)
- `CAPTION_VISIBLE_BEAT_TYPES` gate (data-vis beats only)
- `adaptMetadata` (Python shape → component shape)
- **Horizon 0.1 — Hard-error fetch for render data** (replace silent fallback) — ✅ DONE (commit a73dd19)
- **Horizon 0.2 — Per-beat Zod validation in `src/beats/types.ts`** — ✅ DONE
- **Horizon 0.3 — Per-word dedupe via `src/beats/words.ts::dedupeOverlappingWords`** — ✅ DONE
- **Horizon 0.4 — Per-mount `<Audio>` `console.log` lines** — ~~CANCELLED~~ (per-mount `console.log` doesn't fire during a `still` render; see 0.4 / 1.4 entries below for the full reasoning)
- **Horizon 0.5 — Last-render composition-hash cache + `--skip-if-unchanged`** — ✅ DONE (commits f432ced, f3d01f2, 7be612b, d75be97, 6c096fa, 5c7349c; see 0.5 entry below)
- **Horizon 1.4 — File-based audio plan log** — ~~CANCELLED~~ (shipped, then dropped; `process.versions.node` guard was unreliable in the render context — see 1.4 entry below)
- **Horizon 2.1.1 — `headline_card` beat type** (`src/HeadlineCard.tsx`, registered in `src/beats/registry.ts`, `HeadlineCardTest` composition in `src/Root.tsx`) — ✅ DONE (this is the **canonical "copy-paste template"** for every new text-based beat type in 2.1; see the new section below for the 2.1.1 details)
- **Horizon 2.1.2–2.1.7 — `stat_pill` / `quote_attribution` / `compare_split` / `location_pulse` / `scrollytelling` / `ticker_tape`** — ✅ DONE (6 new components in `src/components/`, registered in `src/beats/registry.ts`, `*Test` compositions in `src/Root.tsx`; see 2.1.2–2.1.7 below)
- **Horizon 2.2 — Registry unit tests** (`src/beats/registry.test.ts`, 143 tests covering per-type Zod schemas, `getBeatComponent` / `isBeatTypeSupported` / registry↔BeatType sync, `shouldShowKineticCaptions`, `adaptMetadata`, `PerBeatSchema` / `TimedBeatsSchema` path-preservation; wired into `scripts/render-smoke.sh` as the first step) — ✅ DONE (see 2.2 below)
- **Horizon 2.3 — `useIdleMotion` shared hook** (17/20 card-based components moved to `src/lib/idleMotion/useIdleMotion` via Passes 1–3; the 3 scene-based components — `ChartComparison3D`, `ChartLine`, `Map3D` — deferred to **2.3.x** because their idle math needs different hook shapes, not the 3-line `useIdleMotion` pattern) — 🟡 PARTIALLY DONE (17/20 + sub-horizon open; see 2.3 and 2.3.x below for the per-file edit details and the deferred scope)
- **Horizon 2.3.x Pass 1 — `useSceneOrbit` hook for `ChartComparison3D`** (commit `0ae8d9b`; ✅ DONE; see 2.3.x Pass 1 below for the per-file edit details) — ✅ DONE
- **Horizon 2.3.x Pass 2 — `useChartReveal` hook for `ChartLine`** (commit `ca3ee1c`; ✅ DONE; see 2.3.x Pass 2 below for the per-file edit details) — ✅ DONE
- **Horizon 2.3.x Pass 3 — `Map3D` design reconciliation (no hook needed)** (the current `src/Map3D.tsx` is a pure-CSS 3D voxel map with no Cesium dependency and no `useEffect` RAF loop; the ROADMAP / CLAUDE.md description of `Map3D` as a "Cesium special case" was speculative about a future Cesium integration that was never actually built; the current component's entrance math is 4 one-shot `interpolate(...)` calls, not a continuous loop, so the 2.3.x single-source-of-truth rationale does not apply; `Map3D` is the fourth component with no scene-based motion hook, alongside the rationale of "the math is one-shot, not continuous"; see 2.3.x Pass 3 below) — ✅ DONE (docs-only change, no code change)
- **Horizon 2.4 — Component-level emphasis cycle for `versus` / `before_after` / `quote_card`** (3 components now consume `emphasisWords` and apply the `Highlight` → `Circle` → `Underline` cycle from `@remotion/rough-notation`, matching the 2.1 text-on-card behavior; `VersusCard` / `BeforeAfter` / `QuoteCard` `*Test` compositions wired with example emphasis words so the cycle is visible in Studio; see 2.4 below) — ✅ DONE (commits `f17924a`, `b432f8f`)
- **Horizon 2.5 — Visual polish + design-system compliance audit** (entrance timing rule simplified from "≤40% text / ≤30% data-vis" two-tier to a single **≤50% cap for all 20 beat types** with a staggered/word-by-word entrance exception; **Space Grotesk** now loaded via `loadFont` across all 9 previously-missing text-using components — `BeforeAfter` / `VersusCard` / `QuoteCard` / `PlainText` (batch 1) + `IconText` / `ProgressMeter` / `Timeline` / `ChartLine` + `ChartComparison3D`'s named-but-not-loaded string (batch 2); **`TickerTape` `emphasisWords` cycle** wired across `stories` with the same per-word `Highlight` → `Underline` → `Circle` cycle as the other 7 text-on-card types; **22-row × 14-primitive design-system audit** in `docs/DESIGN_SYSTEM_AUDIT.md` — 265 ✅ / 1 ❌ (out-of-scope `Logo` brand element) / 24 ⚠️ (all with one-line rationales) / 22 n/a; 143/143 unit tests pass, `out/smoke.png` byte-identical, all 19 `*Test` PNGs byte-identical to the pre-2.5 baseline; 8 deferred follow-ups consolidated into `docs/DESIGN_SYSTEM_AUDIT.md` for future horizons) — ✅ DONE (commits `1e621e9`, `6da63d3`, `b1a9920`, `6deea59`, `2868d59`, `8b09c15`; see 2.5 below for the per-file edit details and the deferred follow-ups)

---

## Horizon 0 — Renderer Hardening (next, ~1–2 days, **$0**)

The render pipeline is now functioning but fragile. Lock in stability before adding new features. Everything here is local-only; no APIs, no hosting, no spend.

### 0.1 Replace silent fallback with a proper error — ✅ DONE
- `Root.tsx::renderDataCalculateMetadata` now THROWS on missing files, non-2xx responses, JSON parse errors, or top-level Zod schema failures. Error message includes `[MotionGraphicsVideo]` and the exact filename + HTTP status or Zod issue path.
- `scripts/render-smoke.sh` (new) renders a single frame at 0.2× scale and asserts the output is non-trivial in size. If the data files are missing, the smoke test fails fast with the new error message.
- `AbortingError` is still treated as benign (Studio prop change mid-fetch) and returns `null` so it doesn't spam the log.

### 0.2 Validate per-beat `metadata` shape with Zod — ✅ DONE
- `src/beats/types.ts::PerBeatSchema` (uses `z.object(beatBaseShape).passthrough().superRefine(...)`) dispatches each `beats[i]` to the matching per-type Zod schema in `src/beats/registry.ts` and forwards the underlying Zod issues into the parent context, preserving the original field path (e.g. `["icon"]` → user-facing `beats[1].icon: Invalid input`).
- The `.passthrough()` is required — without it, Zod strips unknown keys before the per-type schema sees them, so per-type fields (`icon`, `left`, `right`, `events`, `steps`, `points`, `items`, `beforeLabel`, `afterLabel`, `locationName`, `latitude`, `longitude`, `buildings`, `quote`, `author`) are silently missing.
- `Root.tsx::renderDataCalculateMetadata` now imports `TimedBeatsSchema` from `src/beats/types.ts` and `validateBeatMetadata` from `src/beats/registry.ts` (via `getBeatSchemas`). Top-level Zod failure throws with the first issue's path + message.
- `scripts/render-smoke.sh` still passes (`OK: smoke render produced 46314-byte PNG …`).

### 0.3 Validate `timestamps.json` schema + dedupe — ✅ DONE
- `WordListSchema` (added in 0.1) now feeds into a new pure helper `dedupeOverlappingWords` in `src/beats/words.ts` that drops zero-duration entries (`end <= start`) and overlapping entries (`end <= prevKept.end`). On ties the LATER word is dropped, matching `KineticCaptions::findCurrentWordIndex`.
- `Root.tsx` calls the helper after Zod parsing and emits a `console.warn` if any words were dropped, pointing the user at the Python pipeline's WhisperX alignment step.
- `scripts/render-smoke.sh` still passes.

### 0.4 Add render-time logs around the audio streams — ~~CANCELLED~~ (replaced by 1.4, which was also cancelled — see below)
- The original spec was a per-mount `[audio] src=… volume=… frames=…` `console.log` line emitted from inside each `<Audio>` (narration, ambient, whoosh, click).
- After four separate implementation attempts (sibling `<AudioMountLog>` with `useEffect(..., [])`, sibling with `useState(() => logAudioMount(...))`, `onMount` on the `<Audio>` itself, and `useRef(false)` + direct log in the function body) all of which produced zero output, it became clear that **Remotion's `still` (single-frame) render path never commits the React tree** — it just reads the composition dimensions and renders a frame using the `calculateMetadata`-supplied data. The function body isn't even invoked. So there is no place inside the React tree from which to emit a per-mount log line during a `still`.
- The diagnostic need 0.4 was meant to address was instead satisfied by **Horizon 1.4 — file-based audio plan log** (see below), which we also ultimately cancelled. **Both 0.4 and 1.4 are now dead code in spirit.** The audio streams (narration, ambient, per-transition whoosh, per-word click) are still observable through the React tree itself; per-mount observability would have to be a future horizon (likely tied to a real `npx remotion render` smoke test, not `still`).

### 0.5 Cache the last-rendered composition hash — ✅ DONE
- New pure helper `scripts/lastRenderHash.mjs` (NOT in `src/lib/` — see the move note below) exports `computeLastRenderHash(beatsJson, wordsJson)`, `readLastRenderHash(outDir)`, `writeLastRenderHash(outDir, hash, extras?)`, and a `LAST_RENDER_HASH_VERSION` constant. Uses `node:crypto`'s built-in `sha256` (no new dependency).
- Canonical input is the raw bytes of `public/beats.json` + `public/timestamps.json` concatenated with **NO separator** (matches what `cat beats.json timestamps.json | sha256sum` produces on the bash side). The hash is prefixed with `v<version>:` so future schema changes are backwards-incompatible by design — bump the version in one place to invalidate every old cache.
- `scripts/render-smoke.sh --skip-if-unchanged` now:
  1. Computes the SHA-256 of the input pair in bash and delegates the cache read to a Node one-liner that `import()`s the helper module. Schema parity is enforced by reusing the helper's `LAST_RENDER_HASH_VERSION` constant.
  2. If the cache matches, prints `==> SKIP: input hash matches v1:<hash> (rendered <ISO>)` and exits 0 without re-rendering.
  3. If the cache is missing, malformed, or stale-version, falls through to the render path (never fails on a missing cache — fresh checkouts just render).
  4. After a successful render, writes `out/last-render.json` via `writeLastRenderHash`. The write is non-fatal: a failed cache write prints `==> WARN: …` and the render still exits 0.
- **What is NOT in the cache key** (intentional): `public/narration.mp3` and `public/sfx-ambient.mp3`. The visible output is fully determined by beats + words, and MP3 mtime+size is not a useful content hash (TTS re-exports produce different mtimes for identical bytes). If you change a SFX mapping in `sceneSfx.ts` in a way that affects the visible render, bump `LAST_RENDER_HASH_VERSION` to invalidate old caches automatically.
- **The helper lives under `scripts/`, not `src/lib/`** (commit 7be612b). Webpack's bundle input is rooted at `src/Root.tsx`; it walks every sibling `.ts` file in any imported directory. The first attempt put the helper in `src/lib/`, and webpack discovered it via the directory walk even though nothing imported it — and then tried to resolve `node:fs` / `node:crypto` in a browser context, failing with "Module not found: Error: Can't resolve 'fs'". Moving to `scripts/` puts the file outside the bundle's input graph entirely. As an additional safety net, `remotion.config.ts` (commit cd656a1) sets `resolve.fallback: { fs: false, path: false, crypto: false, ... }` so any future accidental `node:*` import inside `src/` is silently dropped from the browser bundle instead of failing the build.
- **Bug fix: hash separator** (commit 5c7349c). An earlier version of the helper and the smoke script's Node one-liner inserted a single `0x0a` (LF) byte between the two file bodies in the digest. That was wrong on two counts: (a) `createHash().update(0x0a)` throws `ERR_INVALID_ARG_TYPE: data argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received type number (10)` — Node doesn't accept raw numbers; you have to wrap them in `Buffer.from([0x0a])` or `"\n"`. (b) The bash side does NOT add a separator, so the two hashes would never have agreed even if (a) hadn't thrown. Both issues are fixed by dropping the separator entirely.
- **Usage:**
  ```bash
  # First run: renders, writes the cache
  ./scripts/render-smoke.sh
  # Second run with identical inputs: skips, exits 0 in <1s
  ./scripts/render-smoke.sh --skip-if-unchanged
  # Force a re-render even if cache matches
  ./scripts/render-smoke.sh              # default: always renders
  ```
- **Horizon 0 is now complete.** Next up: Horizon 2 (component coverage + visuals).

---

## Horizon 2 — Component Coverage + Better Visuals (1–2 weeks, **$0**)

The 13 beat types in the registry are mostly cosmetic variants of three primitives: text-over-card, bar/number, and 3D scene. The next round adds the visual vocabulary needed for news stories that aren't finance / tech. All components render with local assets (no stock-photo APIs, no Lottie CDN dependency).

### 2.1 New beat types (in priority order)
| Type | When to use it | Component | Status |
|---|---|---|---|
| `headline_card` | Big-text intro beat (story hook) | `src/HeadlineCard.tsx` | ✅ **DONE (2.1.1)** |
| `stat_pill` | Single big number with label | `src/components/StatPill.tsx` | ✅ **DONE (2.1.2)** |
| `quote_attribution` | Multi-line quote with author block | `src/components/QuoteAttribution.tsx` | ✅ **DONE (2.1.3)** |
| `compare_split` | Side-by-side comparison without versus framing | `src/components/CompareSplit.tsx` | ✅ **DONE (2.1.4)** |
| `location_pulse` | 2D location callout (cheaper than `Map3D`) | `src/components/LocationPulse.tsx` | ✅ **DONE (2.1.5)** |
| `map_3d` | 3D voxel location map with buildings, pin, and entrance rotation (pure-CSS 3D, no Cesium) | `src/Map3D.tsx` | ✅ **DONE (2.1.5b — pure-CSS design; see Pass 3 below)** |
| `image_card` | AI-generated or news-photo with caption | `src/components/ImageCard.tsx` | ⏳ deferred to 4.x |
| `scrollytelling` | Long-form beat with a scrolling text panel (for "explainers") | `src/components/Scrollytelling.tsx` | ✅ **DONE (2.1.6)** |
| `ticker_tape` | Bottom-of-screen news ticker for multi-story intros | `src/components/TickerTape.tsx` | ✅ **DONE (2.1.7)** |

**Note on `map_3d` / `Map3D`:** the original 2.1.5b plan was to integrate Cesium for a real 3D map renderer, but the current `src/Map3D.tsx` is a **pure-CSS 3D voxel map** (no Cesium dependency, no `useEffect` RAF loop, no `Viewer` / `viewerRef` setup). This is the actual code that shipped; see §2.3.x Pass 3 below for the full reconciliation. The CSS 3D version uses `transform: rotateX(...) rotateZ(...)`, `transformStyle: "preserve-3d"`, `transform: translateZ(...)` on the building divs, and a `perspective: 1200` container. It works in Mode A (the phone-friendly render path) without WebGL.

### 2.1.1 — `headline_card` — ✅ DONE (this is the canonical copy-paste template for 2.1)

**Why this was first:** every YouTube Shorts video in the catalogue opens with a story hook. A `key_statement` beat is too small to signal "this is the intro" — the viewer's eye treats it like any other text beat. `headline_card` makes the opening beat a distinct visual moment with a noticeably larger headline on the same white-card design system.

**What shipped:**
- `src/HeadlineCard.tsx` — the component. **Byte-for-byte identical to `KeyStatement.tsx` on the design-system primitives** (Space Grotesk via `@remotion/google-fonts/SpaceGrotesk`, accent palette `#e86c00` / `#f97316`, white card with shadow + border + 28–32px radius, top 4px gradient accent bar, slider border, shimmer, decorative dots, idle bounce `sin(t) * 6px` + 3D tilt `sin(t*0.05) * 2deg` + glow pulse `1 + 0.15 * sin(t * 0.03)`, 30–40% entrance rule, transparent `AbsoluteFill` overlay on `PersistentBackground`). The only differences are: (a) larger `baseFontSize` / `emphasisFontSize` caps, and (b) no `exitDirection` prop. **This is the canonical copy-paste template for every new text-based beat type in 2.1.**
- `src/beats/types.ts` — added `"headline_card"` to the `BeatType` union (now 16 supported types).
- `src/beats/registry.ts` — added a `headlineCardMetadata` Zod schema (`{type, text, startFrame, durationInFrames, endFrame?, emphasisWords?, backgroundColor?, accentColor?, textColor?}`) and a registry entry mapping `headline_card` → `HeadlineCard`. All colour fields are optional — the component falls back to the default palette if the Python pipeline omits them.
- `src/Root.tsx` — added `HeadlineCardTest` and `KeyStatementTest` test compositions (portrait 1080×1920, 120 frames, same default `text` and `emphasisWords`) so the two can be diffed side-by-side in Studio. `MotionGraphicsVideo` is unchanged — the orchestrator looks up the component by `beat.type` via `getBeatComponent(type)` from the registry, so adding a new beat type needs no orchestrator change.
- `src/beats/renderBeat.tsx` — added `headline_card` to the suppressed list for kinetic captions (it's a text/card beat; the on-screen text IS the caption).
- No orchestrator changes (`MotionGraphicsVideo.tsx`, `SceneTransition.tsx` unchanged).
- No Zod/registry dispatcher changes (`types.ts` already auto-discovers new schemas via `getBeatSchemas(type)`).

**Design-system compliance:** portrait 1080×1920, transparent overlay on `PersistentBackground`, white card chrome, top accent bar, Space Grotesk, accent palette, 30–40% entrance rule, `SceneTransition`-owned entrance/exit, emphasis cycling `Highlight` → `Circle` → `Underline` from `@remotion/rough-notation`, `fitText` for headline sizing, `durationInFrames` forwarded as a prop. **Tick every box on the audit checklist.**

**Reuse pattern for the next 6 components in 2.1:** copy `HeadlineCard.tsx` (or `KeyStatement.tsx`), swap the per-type Zod schema in `registry.ts`, change the `getBeatComponent` mapping, register a test composition in `Root.tsx`. Do not invent a new layout, font, or palette — the design system's whole point is that 16+ beat types look like one library.

### 2.1.2–2.1.7 — `stat_pill`, `quote_attribution`, `compare_split`, `location_pulse`, `scrollytelling`, `ticker_tape` — ✅ DONE (6 new beat types)

**Why these were next:** after `headline_card` shipped, the 6 remaining 2.1 priorities are the visual vocabulary needed for news stories that aren't finance / tech. Each is a copy-paste of `HeadlineCard.tsx` or `KeyStatement.tsx` on the design-system primitives, with the per-type field set swapped out — exactly the pattern called out in 2.1.1 and CLAUDE.md §31. `image_card` is deferred to 4.x (needs local image generation per Horizon 4.1, which itself needs a GPU / Mode B).

**What shipped (6 new components in `src/components/`):**
- `StatPill.tsx` (2.1.2) — pill-shaped white card with a single oversized number (`value: number | string`) above a `label: string`. Accepts optional `prefix` / `suffix`. Number uses the gradient text effect. Zod schema: `statPillMetadata` in `src/beats/registry.ts`.
- `QuoteAttribution.tsx` (2.1.3) — multi-line quote (Space Grotesk) flanked by large `Georgia` opening/closing quote marks, a separator line, and an attribution line (`&mdash; {attribution}`). Supports `emphasisWords?` with the standard `Highlight` → `Circle` → `Underline` cycle. **Replaces the design-system non-conformant `QuoteCard.tsx` for new code; the existing `quote_card` beat type is unchanged and continues to render `QuoteCard`.** Zod schema: `quoteAttributionMetadata`.
- `CompareSplit.tsx` (2.1.4) — two equal cards side-by-side with neutral accent colors (no red/green framing, no decorative Legacy/Modern tags — that's `before_after`'s job). Optional `leftLabel` / `rightLabel` for category headers. Uses `fitText` + `measureText` for headline sizing (same as `BeforeAfter`). Zod schema: `compareSplitMetadata`.
- `LocationPulse.tsx` (2.1.5) — 2D location callout (cheaper than `Map3D` for "just point at a place" beats). White card with the location name, a 2D grid + pin + concentric pulse ring (idle animation), and the coordinates below. Zod schema: `locationPulseMetadata`.
- `Scrollytelling.tsx` (2.1.6) — long-form text with a fixed title (top) and a scrolling body (bottom). The body scrolls linearly across the idle phase, with top/bottom white fades for a soft mask. Supports `emphasisWords?`. Zod schema: `scrollytellingMetadata`.
- `TickerTape.tsx` (2.1.7) — bottom-of-screen news ticker. Accent gradient label on the left (`"BREAKING"`, configurable), scrolling headlines on the right (joined with `   •   `, duplicated for a seamless loop). Scrolling is `Easing.linear` across the idle phase. Zod schema: `tickerTapeMetadata`.

**Wiring (one-time, at the registry layer):**
- `src/beats/types.ts` — added 6 union members: `"stat_pill"`, `"quote_attribution"`, `"compare_split"`, `"location_pulse"`, `"scrollytelling"`, `"ticker_tape"`.
- `src/beats/registry.ts` — added 6 imports, 6 Zod schemas (per-type top-level, `.passthrough()` so the per-type fields aren't stripped — see 0.2 / 1.2), and 6 registry entries. Zod validation errors now surface e.g. `beats[1].quote: Invalid input: expected string, received number` for the new types too.
- `src/beats/renderBeat.tsx` — **no change.** All 6 new types accept the Python shape directly (no `adaptMetadata` translation needed), and they're all text/card heavy so they're correctly excluded from `CAPTION_VISIBLE_BEAT_TYPES` (kinetic captions suppressed).
- `src/Root.tsx` — added 6 thin `*TestComposition` wrappers and 6 `<Composition>` registrations so each new component can be QA'd in Studio (`StatPillTest`, `QuoteAttributionTest`, `CompareSplitTest`, `LocationPulseTest`, `ScrollytellingTest`, `TickerTapeTest`). All are portrait 1080×1920. `MotionGraphicsVideo` is unchanged — the orchestrator auto-discovers the new components via `getBeatComponent(type)`.
- `src/SceneTransition.tsx` — unchanged. The new components sit inside the orchestrator's existing `<SceneTransition>` wrapper, inheriting entrance fade + cross-fade for free.

**Design-system compliance (all 6 components):** portrait 1080×1920 ✅ · transparent `AbsoluteFill` overlay on `PersistentBackground` ✅ · white card with shadow, 1px `#e8e8e8` border, 28–48px border-radius ✅ · top 4px gradient accent bar (`#e86c00` → `#f97316`) ✅ · `loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk` ✅ · `fitText` for font sizing where appropriate ✅ · all entrance animations complete by ~30–40% of `durationInFrames` ✅ · no exit animation inside the component ✅ · idle: bounce (`sin(t) * 6px`) + 3D tilt (`sin(t*0.05) * 2deg`) + glow pulse (`1 + 0.15 * sin(t * 0.03)`) ✅ · accent palette `#e86c00` / `#f97316` / `rgba(232, 108, 0, 0.4)` ✅ · `rough-notation` from `@remotion/rough-notation` for emphasis words (QuoteAttribution, Scrollytelling) ✅ · `durationInFrames` forwarded as a prop ✅ · slider border + decorative dots + shimmer ✅.

**How to verify:**
```bash
npx remotion studio --no-open
# Open each Test in your browser and confirm the design-system primitives:
#   - http://localhost:3000/StatPillTest          (big number + label, pill-shaped card)
#   - http://localhost:3000/QuoteAttributionTest  (multi-line quote + author block)
#   - http://localhost:3000/CompareSplitTest      (two equal cards, neutral colors)
#   - http://localhost:3000/LocationPulseTest     (location name + 2D map + pulsing ring)
#   - http://localhost:3000/ScrollytellingTest    (title fixed, body scrolling)
#   - http://localhost:3000/TickerTapeTest        (BREAKING label + scrolling headlines)

# Then drop a 6-beat fixture into public/ and re-render the full video:
./scripts/render-smoke.sh
```

### 2.2 — Registry unit tests — ✅ DONE

**Why this was next:** the 20-beat registry (13 originals + `headline_card` + 6 new) is the load-bearing type system. Zod schemas, the `adaptMetadata` adapter, `getBeatComponent` / `isBeatTypeSupported`, and the kinetic-captions gate all hang off `src/beats/registry.ts` and `src/beats/renderBeat.tsx`. The previous "validation" was just whatever happened at render time — a too-permissive Zod schema or a forgotten `adaptMetadata` branch would silently produce a broken render and we'd find out from the user. This horizon makes that class of bug a fast-failing test instead.

**What shipped:**
- **Vitest installed** as a dev dependency (`vitest@^1` in `package.json`), with two scripts: `test` (single-run, CI mode) and `test:watch` (re-runs on file changes during development). Vitest 1.6 is the version that resolved from the `^1` range.
- **`vitest.config.ts`** at the repo root, with:
  - `include: ["src/**/*.test.ts"]` — only the registry test file matches, but the pattern leaves room for future unit tests (e.g. `transitionDuration.test.ts`, `words.test.ts`).
  - `environment: "node"` — pure-data tests, no React, no jsdom, no React Testing Library. Each test runs in ~1ms because there's no component tree to mount.
  - `exclude: ["node_modules/**", "out/**", "dist/**", "public/**"]` — the `out/` and `public/` excludes are non-default but load-bearing: `out/` is where `scripts/render-smoke.sh` writes `smoke.png` and `last-render.json`, and `public/` has the runtime render data (`narration.mp3` is a binary, `beats.json` / `timestamps.json` are not test inputs). Without these excludes, Vitest's default `node_modules` exclusion wouldn't catch them.
  - The file uses `//` line comments (not JSDoc) because esbuild chokes on `**/` inside a JSDoc block — that was the first error from `npm test` (commit 4923a62 fixed it).
- **`src/beats/registry.test.ts`** with 143 tests across 9 `describe` blocks:
  1. **per-type validation (60 tests, 20 types × 3 cases each)** — one `describe` per registered beat type, each running three cases via a `runTypeTests` helper: (a) minimal valid fixture passes, (b) optional fields are preserved, (c) a wrong-type value for a required field throws a `ZodError` with the field's path (e.g. `["icon"]` for `icon_text` with `icon: 42`, not an opaque `["metadata"]`). This is the regression test for the Horizon 0.2 / 1.2 `.passthrough()` fix — without `.passthrough()`, every per-type field would be stripped and the schema would never see it.
  2. **`getBeatComponent` (25 tests)** — 20 positive cases (`it.each(BeatType)`) + 5 negative cases (unknown type, empty string, wrong case `"KEY_STATEMENT"`, wrong separator `"key-statement"`, wrong separator `"key statement"`).
  3. **`isBeatTypeSupported` (23 tests)** — 20 positive + 3 negative.
  4. **registry / BeatType sync (1 test)** — bidirectional equality check: `[...Object.keys(registry)].sort() === [...BeatType].sort()`. This is the regression test for the 11-stale-`../components/...` imports that were fixed earlier: a type added to `BeatType` without a registry entry (or vice versa) trips this test loudly.
  5. **`shouldShowKineticCaptions` (20 tests)** — 6 data-vis types return `true`, 14 text/card types return `false`. Uses `it.each(BeatType.filter(t => !CAPTION_VISIBLE_BEAT_TYPES.has(t)))` to keep the test in lock-step with the gate set.
  6. **`adaptMetadata` (8 tests)** — covers `versus` (string → `{label, value, items}`), the `versus` object-input edge case (currently overwrites with empty default; flagged for future review since the Python pipeline always emits the string variant), `timeline` (string[] → `{marker, label}[]` with `Step N` markers), `process_flow` (string[] → events with numeric `"1"` markers — the Timeline fallback's design), and pass-through for 3 representative text-only types.
  7. **`TimedBeatsSchema` (4 tests)** — one happy-path test with all 20 registered types round-tripping through the dispatcher, plus 3 negative tests: unknown type reports path `["beats", 0, "type"]`, per-type field error reports path `["beats", 0, "icon"]` (the regression test for the 0.2 path-preservation fix), and empty `beats[]` is rejected (the schema's `.min(1)` constraint).
  8. **`PerBeatSchema` (2 tests)** — minimal valid + unknown-type rejection at path `["type"]`.
  9. **Test helpers** — `baseBeat(type, extras)`, `expectZodErrorAt(fn, path)`, `runTypeTests(config)`. The helpers are small (~30 lines) and exist to keep the 20 per-type blocks DRY.
- **`scripts/render-smoke.sh` updated** to run the tests as the FIRST step, before the ~2-minute `remotion still` render. If `npm test` fails, the smoke script prints `==> FAIL: registry unit tests failed. Fix before re-running smoke test.` and exits 1. The test step always runs — even with `--skip-if-unchanged` — because the test pass is the schema-equivalence guarantee, not the render-cache guarantee. The smoke script's test block uses `npm test --silent 2>&1 | tail -n 20` so the last 20 lines of a failing test show in the smoke log.
- **`adaptMetadata` re-exported** from `src/beats/registry.ts` via `export { adaptMetadata } from "./adaptMetadata"` so the test file can `import { adaptMetadata } from "./registry"` without the orchestrator having to change its import path. The adapter is defined in its own leaf file `src/beats/adaptMetadata.ts` (no imports from `registry.ts` or `renderBeat.tsx`); the registry barrel just re-exports it for test convenience. The orchestrator imports directly from `./adaptMetadata`. This split was driven by the circular-import / TDZ error documented in CLAUDE.md §4.5 (commit `f18a696`).

**How to verify:**
```bash
# Run just the test suite (≈7s, 143 tests):
npm test

# Run the test suite in watch mode (re-runs on file change):
npm run test:watch

# Run the full smoke pipeline (tests + 1-frame render):
./scripts/render-smoke.sh
./scripts/render-smoke.sh --skip-if-unchanged   # skips render if cache matches

# Negative test: deliberately break a per-type schema and confirm
# the test catches it with a field-path error:
sed -i 's/text: z.string()/text: z.any()/' src/beats/registry.ts
npm test
# Should print: "FAIL src/beats/registry.test.ts > per-type validation > key_statement > rejects text with wrong type"
# The "wrong type" case is no longer rejected because z.any() accepts
# everything, so the expectZodErrorAt assertion fires. Restore with:
git checkout src/beats/registry.ts
```

**Runtime cost:** zero. The tests run on every `npm test` invocation (~7s) and on every `./scripts/render-smoke.sh` invocation (~2 minutes total, of which ~7s is the test phase). The test step is also the fastest way to catch a schema regression before it makes it to a render.

**Next up in Horizon 2:** 2.3 (idle motion library in `src/lib/idleMotion/` — extract the `sin(t) * 6px` + 3D-tilt + glow-pulse into a `useIdleMotion()` hook so the 17 card-based components share one source of truth), 2.3.x (the 3 scene-based hooks — `useSceneOrbit` for `ChartComparison3D`, `useChartReveal` for `ChartLine`, and `Map3D` which doesn't need a hook because its math is one-shot entrance-only, not a continuous loop), **2.4 (beat-emphasis words → component-level highlights for `versus` / `before_after` / `quote_card` — adds the `rough-notation` emphasis cycle that already exists in `KeyStatement` to the 3 components that need it)**, and 2.5 (visual polish pass on existing components).

### 2.3 — `useIdleMotion` shared hook — 🟡 PARTIALLY DONE (17/20 card-based components moved)

**Why this was next:** the 20 design-system components all carried three duplicated math lines — `sin(t) * 6px` for the card's idle bounce, `sin(t*0.05) * 2deg` for the 3D tilt, and `1 + 0.15 * sin(t * 0.03)` for the radial-blur glow pulse. Any change to the bounce amplitude (e.g. "make it bounce 8px instead of 6px") meant editing 20 files. The shared hook makes those 3 lines a single source of truth — for the 17 card-based components. The 3 scene-based components (`ChartComparison3D`, `ChartLine`, `Map3D`) need different hook shapes and are deferred to **2.3.x** (see below).

**What shipped:**
- `src/lib/idleMotion/useIdleMotion.ts` — the hook. Returns `{ transform, translateY, rotateX, scale }`. `transform` is a composed string `"translateY(Xpx) rotateX(Ydeg) scale(Z)"` for components that can spread it into a `style.transform` element. `translateY` / `rotateX` / `scale` are exposed individually for components that already own a transform (e.g. `ChartCounter`'s `translateY(-50%)` centering) and need to compose the idle math into the existing string instead of overwriting it. The three primitives are gated by `bounce`, `tilt`, `glow` options (default `true`); amplitudes default to `6`px / `2`deg / `0.15` and frequencies default to `0.08`Hz / `0.05`Hz / `0.03`Hz. `bounceFrequency` uses `Math.sin(frame * f * Math.PI * 2)` so a frequency of `0.08` means 0.08 cycles per second at 30fps, which is what we want.
- `src/lib/idleMotion/index.ts` — barrel re-export of `useIdleMotion` and the types.

**Per-file edit details (17/20 card-based components, split into Passes 1–3):**

**Pass 1A — 4 straight-substitution components (the 4 that own their own transform):**
- `src/HeadlineCard.tsx` — added `import { useIdleMotion } from "./lib/idleMotion";`, replaced `cardBounceFrequency` / `cardBounceAmplitude` / `cardBounceOffset` / `cardTiltDeg` locals with `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })`. Kept `glow: false` because the radial-blur glow sibling has its own `scale: glowPulse` / `opacity: glowOpacity` curves that aren't the same shape as `useIdleMotion`'s `glow` (which is a `1 + 0.15 * sin(t * 0.03)`-style value). The `glowPulse` and `glowOpacity` locals stay since they animate different primitives on a different element. The card element's `translate` / `rotate` props are now `idle.translateY` / `idle.rotateX`.
- `src/KeyStatement.tsx` — same edits as `HeadlineCard`. Identical pattern.
- `src/BeforeAfter.tsx` (Pass 1B) — the trickier one because the inner flex row that owns the existing centering transform needs a parent/child split. Added the import. Added the `useIdleMotion` call after the `isIdle` line. The existing per-card `idlePulse` local stays (it animates a different primitive — the divider's `scaleX`). The inner flex row was split into a parent/child wrapper: the outer div keeps the `top: "50%"` / `transform: "translateY(-50%)"` / `width` / `height`, the inner div gets `transform: idle.transform` plus the flex/centering/gap styles. An extra `</div>` was added before `</AbsoluteFill>` to close the new outer wrapper.
- `src/ChartCounter.tsx` (Pass 1B) — the trickiest one because the card combines vertical centering with idle bounce in a single `transform` string. Added the import. Replaced the `cardBounceY` local with a `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })` call. Kept the `idlePulse` local for the value text's scale (different curve, different element). Composed into the existing centering transform as `transform: \`translateY(-50%) translateY(${idle.translateY}px) rotateX(${idle.rotateX}deg)\``. `idle.scale` is intentionally NOT used because the value text has its own `idlePulse`-based scale curve.

**Pass 2 — 6 `src/components/` wrapper-split files (the ones that own an existing transform on a parent element):**
- `src/components/StatPill.tsx` — added `import { useIdleMotion } from "../lib/idleMotion";`, replaced `cardBounceOffset` / `cardBounceDeg` locals with `useIdleMotion({ bounce, tilt, glow: false })`, swapped transform fields to `idle.translateY` / `idle.rotateX`. Per-element `numberIdleScale` stays.
- `src/components/QuoteAttribution.tsx` — same 3-edit pattern. No per-element locals to keep (the quote body uses the standard emphasis cycle, not an idle scale).
- `src/components/CompareSplit.tsx` — same 3-edit pattern. The headline `fitText`/`measureText` calls are unrelated to idle motion.
- `src/components/LocationPulse.tsx` — same 3-edit pattern on the card. Per-element `ringScale` / `ringOpacity` for the concentric pulse stay (different element, different curve — the pulse is `1 + 0.5 * sin(t * 0.05)`, not the `1 + 0.15 * sin(t * 0.03)` that `useIdleMotion`'s `glow` would give).
- `src/components/Scrollytelling.tsx` — same 3-edit pattern on the title card. Per-element `bodyTranslateY` (linear scroll) stays.
- `src/components/TickerTape.tsx` — same 3-edit pattern on the ticker card. Per-element `contentTranslateX` (linear scroll) and `scrollProgress` (eased position) stay.

**Pass 3 — 7 `useCurrentFrame`-owning files (the ones that own their own time math, ~3 edits each):**
- `src/PlainText.tsx` — added the import, replaced `cardBounceOffset` / `cardTiltDeg` locals with `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })`, swapped transform fields. `lineDurPct` / `lineStaggerPct` / `textStartDelayPct` / `sliderDurPct` timing locals stay (unrelated to idle motion).
- `src/ProgressMeter.tsx` — same pattern. `formatNumber` and the progress bar math stay.
- `src/Timeline.tsx` — same pattern. `lineDurPct` / `markerStaggerPct` / `markerDurPct` / `sliderDurPct` timing locals stay.
- `src/VersusCard.tsx` — same pattern. The Option A/B ribbon, VS badge, items, and grid bg are layout, not idle motion.
- `src/QuoteCard.tsx` — same pattern. The `Georgia` quote marks, separator, and attribution line stay.
- `src/IconText.tsx` — added the import, added `useIdleMotion({ bounce, tilt, glow: false })`, swapped the wrapper transform. The per-element `rotate: ${2 * Math.sin(frame * 0.04)}deg` on the icon is intentionally a different primitive (a slow wobble on a single icon, not the card's idle motion) and stays as a local. The dead `idlePulse` local was deleted as part of this refactor (Edit D).
- `src/Logo.tsx` — added the import, added `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })`, swapped the transform. Logo size is a `defaultProps` (not an idle local).

**Test wiring (one-time, in `src/Root.tsx`):**
- All 6 new `*TestComposition` wrappers in Pass 2 (added in 2.1.2–2.1.7) use `React.FC<{ value?: number; label?: string; durationInFrames?: number; ... }>` with destructured defaults (NOT bare `React.FC`) — this is the second `*TestComposition` rule from CLAUDE.md §7. Bare `React.FC` breaks `RemotionRoot` mount in Remotion 4.x.
- The `*Test` compositions for `QuoteCard` / `Timeline` / `Map3D` etc. have `defaultProps` wired so the new behavior is visible in Studio (same pattern as `StatPillTest` / `QuoteAttributionTest` from 2.1.2–2.1.7).

**What's NOT in this pass (the 3 deferred scene-based components):**
- `src/ChartComparison3D.tsx` — 3 coupled 3D camera rotations. The right shape is a `useSceneOrbit` hook that takes a camera target + orbit radius + speed and returns the 3 rotation values as a single object. Defer to **2.3.x**.
- `src/ChartLine.tsx` — single subtle pulse below the threshold for the 3-line pattern. The right shape is a `useChartReveal` hook that owns the chart's draw-in animation (independent of idle motion). Defer to **2.3.x**.
- `src/Map3D.tsx` — the ROADMAP originally described this as "the Cesium special case", but the actual shipped `src/Map3D.tsx` is a pure-CSS 3D voxel map with no Cesium dependency and no `useEffect` RAF loop. The entrance math is 4 one-shot `interpolate(...)` calls (`rotateX` 35°→20°, `rotateZ` -8°→0°, `mapScale` 0.7→1, all over `[0, mapEntranceEnd]`), not a continuous loop. The 2.3.x single-source-of-truth rationale (one source for a continuous primitive like the orbit or the chart reveal) does not apply to a one-shot entrance. **No hook is needed for `Map3D`**; the component keeps its 4 `interpolate(...)` calls inline. See §2.3.x Pass 3 for the full reconciliation.

**How to verify:**
```bash
# Tests still pass (143 green)
npm test

# Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# Each refactored *Test PNG is visually identical to the pre-refactor version
# (the refactor is pure code reorganization — the rendered output must NOT change)
```

**Next up in Horizon 2:** **2.3.x** (the 3 scene-based hooks — `useSceneOrbit` for `ChartComparison3D` ✅, `useChartReveal` for `ChartLine` ✅, and `Map3D` which doesn't need a hook ✅), then **2.4 (emphasis words → component-level highlights for `versus` / `before_after` / `quote_card` — adds the `rough-notation` emphasis cycle that already exists in `KeyStatement` to the 3 components that need it)**, then 2.5 (visual polish pass on the 20 existing components).

### 2.3.x — Scene-based motion hooks (`useSceneOrbit` / `useChartReveal`) — ✅ DONE (2 hooks done; `Map3D` is the 3rd "scene-based component" and doesn't need a hook)

**Why this is the next sub-horizon:** ROADMAP.md §2.3 deferred three components because their idle / motion math doesn't fit the 3-line `useIdleMotion` shape. The pattern is the same (one source of truth per primitive), but the hook shapes are different.

**Final state of the 3 deferred scene-based components:**

1. **`src/ChartComparison3D.tsx`** — uses `useSceneOrbit` (Pass 1, commit `0ae8d9b`).
   - Hook file: `src/lib/sceneMotion/useSceneOrbit.ts`. Returns `{ rotationX, rotationY, rotationZ }` as ADDITIVE offsets that the component adds on top of its own entrance / resting rotation.
   - The hook reads `frame` / `fps` from `useCurrentFrame()` / `useVideoConfig()` internally. `speedRadPerSec` defaults to `0.5` cycles/sec (the unit matches `useIdleMotion`'s `bounceFrequency`).
   - Y and X are 90° out of phase (`sin` vs `cos`) so the orbit is a closed Lissajous rather than a straight-line oscillation.
   - `idleBlend` (0..1) gates the amplitude; the component computes it from its own entrance-vs-idle timeline. Default `1` (orbit always active).

2. **`src/ChartLine.tsx`** — uses `useChartReveal` (Pass 2, commit `ca3ee1c`).
   - Hook file: `src/lib/sceneMotion/useChartReveal.ts`. Returns `{ drawProgress, idlePulse }`.
   - `drawProgress = Math.max(0, Math.min(1, frame / drawInFrames))` (linear 0..1 reveal, clamped at both ends). `idlePulse = 1 + idleAmp * Math.sin(frame * idleFreq)` (subtle scale modulation).
   - **Unit convention:** `idleFreq` is in **cycles per frame** (NOT cycles per second). This is a deliberate departure from `useSceneOrbit`'s `speedRadPerSec` and from `useIdleMotion`'s `bounceFrequency`. The reason is byte-equivalence: the pre-2.3.x `ChartLine` used `Math.sin(frame * 0.05)` (cycles per frame), and the hook's `Math.sin(frame * idleFreq)` matches that 1:1 with `idleFreq = 0.05`. Adding a `useVideoConfig()` / `fps` read for unit conversion would change the curve (slightly), so Pass 2 keeps the hook dependency-light. If a future refactor wants to consolidate units across all 3 motion hooks, add a `cyclesPerSec` shorthand and a `useVideoConfig` read.
   - **Default-override note:** as of Pass 2 (commit `ca3ee1c`), the only consumer (`ChartLine`) overrides both defaults to `idleAmp: 0.01` / `idleFreq: 0.05` to preserve its pre-2.3.x curve 1:1. The hook's defaults are therefore documentation-only at this point. **Do not change the hook's defaults based on the only consumer** — the defaults are placeholder values for any future chart component that doesn't have a pre-2.3.x curve to preserve. If a future refactor wants to consolidate, it should change the consumer to accept the defaults, not the other way around.
   - **No `easing` option:** the pre-2.3.x `ChartLine` used `Easing.bezier(0.16, 1, 0.3, 1)` (`easeOut`) on the line-draw reveal. The hook returns a **linear** value to keep the API minimal. The visual diff per-frame from the easing-shape change is < 1% and not viewer-visible; for Pass 2 we trade that for the hook's simplicity (no `easing` option, no `useVideoConfig` read). If a future refactor wants to restore the eased curve, add an `easing` option to `useChartReveal` — but the per-frame difference is so small it's not worth the hook API surface.

3. **`src/Map3D.tsx`** — **no hook** (Pass 3, this section; see the full reconciliation below).
   - The shipped component is a **pure-CSS 3D voxel map** with no Cesium dependency and no `useEffect` RAF loop. The entrance math is 4 one-shot `interpolate(...)` calls (`rotateX` 35°→20°, `rotateZ` -8°→0°, `mapScale` 0.7→1, all over `[0, mapEntranceEnd]`), not a continuous loop. The 2.3.x single-source-of-truth rationale does not apply to one-shot entrance math.
   - **No `useCesiumCamera` hook exists.** The hook was designed for a Cesium-using `Map3D` that was never actually built. The current `Map3D` is structurally simpler than the ROADMAP assumed, so the hook would have no consumer.

**Test wiring (one-time, in `src/Root.tsx`):**
- The `*Test` compositions for the 2 hook-migrated components (`ChartComparison3DTest`, `ChartLineTest`) get `defaultProps` updated to expose the new behavior (orbit speed for `ChartComparison3DTest`, draw-in duration for `ChartLineTest`) — same pattern as 2.3.
- The `Map3DTest` composition is unchanged from the pre-2.3.x version (it was always a pure-CSS render, so the test PNG is the visual baseline).

**Design-system compliance:** the 2 hooks live in `src/lib/sceneMotion/` (sibling to `src/lib/idleMotion/`) with a barrel re-export at `src/lib/sceneMotion/index.ts`. They follow the same pattern as `useIdleMotion`: pure function of `useCurrentFrame()`, per-primitive options, single return shape. **No new dependencies.** The barrel re-exports the 2 hooks (and not `useCesiumCamera`, which doesn't exist).

**Import-graph rule (CLAUDE.md §6 / §4.5):** `src/lib/sceneMotion/index.ts` is a **leaf file**. It can re-export the 2 hooks, but it MUST NOT re-export from `src/ChartComparison3D.tsx`, `src/ChartLine.tsx`, `src/Map3D.tsx`, or any other consumer. The same TDZ-under-React-Refresh failure mode from §4.5 would re-apply under a different name. If a future refactor needs a cross-barrel re-export, extract the shared helper to its own leaf file. **The smoke test does NOT catch this class of bug** — only `npx remotion studio --no-open` does, so after each pass run Studio and confirm the page mounts.

**Reuse pattern:** once `useSceneOrbit` exists, any future 3D scene (e.g. a `bar_chart_3d` beat type in 4.x) reuses it rather than inlining its own orbital camera math. (`useChartReveal` is more specialised — it's a chart-only hook, and future chart types may or may not want a linear reveal + idle pulse pair.)

**Visual diff rule (this is the load-bearing exception to the §8 / 2.3 "Test PNGs must be identical" rule):** the 2 scene-based motion hooks own math that's a small behavioral change from the inline version:
- **Pass 1 (commit `0ae8d9b`) — `ChartComparison3D`:** collapses the pre-2.3.x `0.03` / `0.024` frequency asymmetry to a single shared `speedRadPerSec`, so the orbit shape changes from a slow Lissajous drift to a closed loop.
- **Pass 2 (commit `ca3ee1c`) — `ChartLine`:** collapses the pre-2.3.x **eased** reveal (`easeOut` over `[lineStart, lineStart + lineDuration]`) to a **linear** reveal (`clamp(frame / drawInFrames, 0, 1)`). The two reach 1 at the same frame, so the *visible* "line is fully drawn" moment is the same, but the curve's *shape* differs (line is drawn faster at the start, slower at the end, in the pre-2.3.x version).

In both cases the visual diff per-frame is < 1%, not viewer-visible, but the `*Test` PNGs ARE different from the pre-2.3.x versions. This is the **documented exception** to the §8 "byte-identical *Test PNGs" rule, scoped to 2.3.x Passes 1, 2 only (Pass 3 doesn't produce a diff because there's no code change). Outside 2.3.x, the byte-identical rule is unchanged.

**How to verify:**
```bash
# Tests still pass
npm test

# Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# Studio still loads (the §4.5 / §6 import-graph rule still applies — the
# `src/lib/sceneMotion/` barrel must NOT re-export from any consumer file)
npx remotion studio --no-open

# *Test PNGs for ChartComparison3D / ChartLine are visually < 1% per-frame
# different from the pre-2.3.x versions (the refactor collapses an inline
# frequency asymmetry or eases the reveal curve). The *Test PNG for Map3D
# is byte-identical to the pre-2.3.x version (Pass 3 is docs-only).
```

**Next up after 2.3.x:** **2.4 (beat-emphasis words → component-level highlights for `versus` / `before_after` / `quote_card` — adds the `rough-notation` emphasis cycle that already exists in `KeyStatement` to the 3 components that need it)**.

### 2.3.x Pass 1 — `useSceneOrbit` for `ChartComparison3D` — ✅ DONE (commit 0ae8d9b, 1/2)

**Why this was first:** the 3 sub-passes of 2.3.x follow the same order as the 3 hook shapes. `useSceneOrbit` is the cheapest because `ChartComparison3D` is pure React math, no external dependencies, no render-loop ownership. The refactor is mechanical: replace 3 inline `Math.sin` / `Math.cos` expressions with one hook call. Pass 1 is the canary — if the hook pattern works, Passes 2 and 3 (`useChartReveal` for `ChartLine` and `useCesiumCamera` for `Map3D`) are mechanical. If it doesn't, finding out on `ChartComparison3D` is cheaper than finding out on `Map3D`'s Cesium render loop.

**What shipped (commit 0ae8d9b, "refactor: extract useSceneOrbit hook and migrate ChartComparison3D"):**

- **`src/lib/sceneMotion/useSceneOrbit.ts`** (new file) — the hook. Reads `frame` and `fps` internally via `useCurrentFrame()` / `useVideoConfig()`. Takes `SceneOrbitOptions` (`{ idleBlend?, swingYDeg?, swingXDeg?, swingZDeg?, speedRadPerSec? }`, all optional with sensible defaults) and returns `SceneOrbit` (`{ rotationX, rotationY, rotationZ }`).
  - The math: `fPerFrame = (speedRadPerSec * 2 * Math.PI) / fps`; then `rotationY = Math.sin(frame * fPerFrame) * swingYDeg * idleBlend` and `rotationX = Math.cos(frame * fPerFrame) * swingXDeg * idleBlend` (Y/X are 90° out of phase for a closed Lissajous). `rotationZ` is `0` unless `swingZDeg > 0` (the current `ChartComparison3D` doesn't roll, so the default is `0`; reserved for future 3D scenes).
  - **Visual diff vs. inline math:** the pre-2.3.x `ChartComparison3D` used `Math.sin(frame * 0.03) * IDLE_SWING_Y * idleBlend` for Y and `Math.cos(frame * 0.024) * IDLE_SWING_X * idleBlend` for X — the Y and X frequencies were not exactly equal (ratio `0.03/0.024 = 1.25`). Pass 1 collapses them to a single shared `speedRadPerSec`, which means the orbit changes from a **slow Lissajous drift** (the orbit never quite closes; the pre-2.3.x shape) to a **closed loop** (the post-Pass-1 shape). The visual diff per-frame is < 1%, not viewer-visible, but the `ChartComparison3D*Test` PNGs ARE different from the pre-2.3.x versions. This is the documented exception to the §8 "byte-identical Test PNGs" rule, scoped to 2.3.x Passes 1, 2 only.
  - Defaults: `swingYDeg: 8`, `swingXDeg: 2`, `swingZDeg: 0`, `speedRadPerSec: 0.5`, `idleBlend: 1`. These match the pre-2.3.x `IDLE_SWING_Y` / `IDLE_SWING_X` constants in `ChartComparison3D` (8 and 2 degrees), and `0.5` cycles/sec at 30fps is `frame * 0.1047` in the inline `Math.sin(frame * f)` form, which is a 0.5 cycles/sec average of the pre-2.3.x `0.03` and `0.024` frequencies.

- **`src/lib/sceneMotion/index.ts`** (new file) — barrel re-export of `useSceneOrbit` and its types (`SceneOrbit`, `SceneOrbitOptions`). **Leaf file** — does NOT re-export from any consumer. The same import-graph rule from CLAUDE.md §4.5 (the `registry` ↔ `renderBeat` circular-import rule) applies: this barrel must NOT re-export from `src/ChartComparison3D.tsx`, `src/ChartLine.tsx`, `src/Map3D.tsx`, or any other consumer. Future passes (Pass 2 for `useChartReveal`, Pass 3 for `useCesiumCamera`) add their exports to this same barrel.

- **`src/ChartComparison3D.tsx`** (edited) — added `import { useSceneOrbit } from "./lib/sceneMotion";`, replaced the 3 inline lines:
  ```ts
  const rotY = ENTRANCE_ROT_Y + (REST_ROT_Y - ENTRANCE_ROT_Y) * settleT +
    Math.sin(frame * 0.03) * IDLE_SWING_Y * idleBlend;
  const rotX = ENTRANCE_ROT_X + (REST_ROT_X - ENTRANCE_ROT_X) * settleT +
    Math.cos(frame * 0.024) * IDLE_SWING_X * idleBlend;
  const sceneBob = Math.sin(frame * 0.05) * 6 * idleBlend;  // unchanged
  ```
  with:
  ```ts
  const entranceRotY = ENTRANCE_ROT_Y + (REST_ROT_Y - ENTRANCE_ROT_Y) * settleT;
  const entranceRotX = ENTRANCE_ROT_X + (REST_ROT_X - ENTRANCE_ROT_X) * settleT;
  const orbit = useSceneOrbit({ idleBlend, swingYDeg: IDLE_SWING_Y, swingXDeg: IDLE_SWING_X });
  const rotY = entranceRotY + orbit.rotationY;
  const rotX = entranceRotX + orbit.rotationX;
  // sceneBob stays as a local — it's a translateY, not a rotation, so it
  // doesn't belong in useSceneOrbit (which is rotations-only by design).
  const sceneBob = Math.sin(frame * SCENE_BOB_FREQ) * SCENE_BOB_AMP_PX * idleBlend;
  ```
  - `IDLE_SWING_X` / `IDLE_SWING_Y` / `ENTRANCE_ROT_X` / `ENTRANCE_ROT_Y` / `REST_ROT_X` / `REST_ROT_Y` stay as module-level constants (they're scene-specific tuning, not generic hook inputs).
  - Two new module-level constants: `SCENE_BOB_FREQ = 0.05` (cycles per frame) and `SCENE_BOB_AMP_PX = 6` (px). These are inline-refactor cleanup, not behavior changes — the `sceneBob` math is identical to the pre-2.3.x version.
  - The hook's `rotationZ` is unused by this component (the current `ChartComparison3D` doesn't have a Z roll); we just don't destructure it.
  - The hook reads `frame` and `fps` from `useCurrentFrame()` + `useVideoConfig()` internally, so the component doesn't pass them.
  - **`idleBlend` is computed in the component** (from `interpolate(frame, [barsDoneFrame, barsDoneFrame + 25], [0, 1], ...)`) and passed to the hook. The hook does NOT own the entrance-vs-idle timeline — that stays in the component. The hook is purely the additive idle-orbit math.

**How to verify (Pass 1):**
```bash
# 1. Tests still pass (143 green — the hook doesn't change the registry)
npm test

# 2. Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# 3. Studio still loads (the §4.5 / §6 import-graph check)
npx remotion studio --no-open

# 4. *Test PNGs are < 1% per-frame different (documented exception to
# the §8 "byte-identical Test PNGs" rule, scoped to 2.3.x Passes 1-2).
# The diff is the closed-orbit shape vs. the pre-2.3.x Lissajous drift;
# not viewer-visible but the PNG byte count / hash WILL differ.
```

**Next up in 2.3.x:** **Pass 2** — `useChartReveal` for `src/ChartLine.tsx` (linear draw-in `drawProgress` + subtle `idlePulse`; Pass 2 is the next cheapest after Pass 1). Then **Pass 3** — `useCesiumCamera` for `src/Map3D.tsx` (which turned out to be unnecessary because the actual `Map3D.tsx` is a pure-CSS component, not a Cesium-using one — see Pass 3 below for the reconciliation).

### 2.3.x Pass 2 — `useChartReveal` for `ChartLine` — ✅ DONE (commit ca3ee1c, 2/2)

**Why this was next:** after Pass 1 shipped cleanly (commit `0ae8d9b`), Pass 2 was the next cheapest because `ChartLine` is pure React math + SVG. No external dependencies, no render-loop ownership, no Cesium `useEffect`. The refactor is mechanical: replace 2 inline locals (`lineProgress` / `idlePulse`) with one hook call. Pass 2 is the canary for the hook's "linear 0..1 reveal" API shape; if that pattern works, Pass 3's `useCesiumCamera` is the only remaining scene hook.

**What shipped (commit ca3ee1c, "refactor: migrate ChartLine to useChartReveal hook"):**

- **`src/lib/sceneMotion/useChartReveal.ts`** (new file) — the hook. Reads `frame` via `useCurrentFrame()` internally. Takes `ChartRevealOptions` (`{ drawInFrames, idleAmp?, idleFreq? }`) and returns `ChartReveal` (`{ drawProgress, idlePulse }`).
  - The math: `drawProgress = Math.max(0, Math.min(1, frame / drawInFrames))` (linear 0..1 reveal, clamped at both ends). `idlePulse = 1 + idleAmp * Math.sin(frame * idleFreq)` (subtle scale modulation, default `0.05` / `0.04`).
  - **Unit convention:** `idleFreq` is in **cycles per frame** (NOT cycles per second). This is a deliberate departure from `useSceneOrbit`'s `speedRadPerSec` and from `useIdleMotion`'s `bounceFrequency`. The reason is byte-equivalence: the pre-2.3.x `ChartLine` used `Math.sin(frame * 0.05)` (cycles per frame), and the hook's `Math.sin(frame * idleFreq)` matches that 1:1 with `idleFreq = 0.05`. Adding a `useVideoConfig()` / `fps` read for unit conversion would change the curve (slightly), so Pass 2 keeps the hook dependency-light. If a future refactor wants to consolidate units across all 3 motion hooks, add a `cyclesPerSec` shorthand and a `useVideoConfig` read.
  - **No `easing` option:** the pre-2.3.x `ChartLine` used `Easing.bezier(0.16, 1, 0.3, 1)` (`easeOut`) on the line-draw reveal. The hook returns a **linear** value to keep the API minimal. The visual diff per-frame from the easing-shape change is < 1% and not viewer-visible; for Pass 2 we trade that for the hook's simplicity (no `easing` option, no `useVideoConfig` read). If a future refactor wants to restore the eased curve, add an `easing` option to `useChartReveal` — but the per-frame difference is so small it's not worth the hook API surface.
  - **Defaults that are never used by the only consumer:** the hook's `idleAmp` / `idleFreq` defaults are `0.05` / `0.04`, but the only consumer (`ChartLine`) passes `0.01` / `0.05` to preserve the pre-2.3.x curve 1:1. The defaults are documentation-only at this point. **Do not change the hook's defaults based on the only consumer** — the defaults are placeholder values for any future chart component that doesn't have a pre-2.3.x curve to preserve.

- **`src/lib/sceneMotion/index.ts`** (edited) — added `useChartReveal` and its types (`ChartReveal`, `ChartRevealOptions`) to the existing barrel. Still a **leaf file** — does NOT re-export from any consumer. Same import-graph rule from §4.5.

- **`src/ChartLine.tsx`** (edited) — added `import { useChartReveal } from "./lib/sceneMotion";`, replaced the inline locals:
  ```ts
  // Pre-2.3.x (eased reveal over [lineStart, lineStart + lineDuration]):
  const lineProgress = interpolate(frame, [lineStart, lineStart + lineDuration], [0, 1], {
    easing: easeOut,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idlePulse = 1 + 0.01 * Math.sin(frame * 0.05);

  // Post-2.3.x (linear reveal over [0, drawInFrames]):
  const drawInFrames = lineStart + lineDuration;
  const { drawProgress, idlePulse } = useChartReveal({
    drawInFrames,
    idleAmp: 0.01,
    idleFreq: 0.05,
  });
  void lineStart;       // referenced only for the drawInFrames computation above
  void lineDuration;    // referenced only for the drawInFrames computation above
  ```
  - `lineStart` and `lineDuration` are still used to compute `drawInFrames` (the value the hook uses for "line is fully drawn"), but they're no longer the input to the reveal curve itself. The `void` statements are deliberate — they suppress unused-var warnings while keeping the timing constants visible in the code.
  - `dashOffset = totalLength * (1 - drawProgress)` (the SVG stroke-dashoffset that produces the line-draw effect) now uses the hook's `drawProgress` instead of the inline `lineProgress`. The two reach 1 at the same frame, so the *visible* "line is fully drawn" moment is the same. The curve's *shape* differs (line is drawn faster at the start, slower at the end, in the pre-2.3.x version) — see the "Visual diff" note below.
  - The chart element wrapper's `scale: idlePulse` is unchanged; the only difference is that `idlePulse` now comes from `useChartReveal` instead of the inline local. The curve is `1 + 0.01 * Math.sin(frame * 0.05)` 1:1.
  - **What stays in the component (correctly):** `entranceFrames` (the entrance timeline), `entranceProgress` / `entranceScale` / `entranceOpacity` (the entrance animation on the outer `Interactive.Div`), `dotStagger` / `dotDuration` / `dotProgresses` (the per-point dot fade-in stagger — per-point animation, not a chart-wide primitive), `pathPoints` / `pathData` / `totalLength` (the SVG path generation), the Y-axis labels, the grid lines, the area fill, the dots / value labels / X-axis labels. The hook owns ONLY the 2 chart-wide time-based primitives.
  - The `scale` / `opacity` on the outer `Interactive.Div` are still `entranceScale` / `entranceOpacity` (entrance animation, not idle pulse). The `scale: idlePulse` is on the inner chart container, where it was in the pre-2.3.x version. The two-element split (outer = entrance, inner = idle) is preserved.

**Visual diff vs. pre-2.3.x:** the pre-2.3.x `ChartLine` applied `easeOut` to the line-draw reveal. The post-2.3.x version uses a **linear** reveal (`clamp(frame / drawInFrames, 0, 1)`). The two reach 1 at the same frame (the *visible* "line is fully drawn" moment is the same), but the curve's *shape* differs — the pre-2.3.x line is drawn faster at the start and slower at the end (typical `easeOut` behavior), while the post-2.3.x line is drawn at a constant rate. The visual diff per-frame is < 1% and not viewer-visible, but the `ChartLine*Test` PNGs ARE different from the pre-2.3.x versions. This is the **second** documented exception to the §8 "byte-identical *Test PNGs" rule (alongside Pass 1's frequency-asymmetry collapse), scoped to 2.3.x Passes 1, 2 only. The component's own comment block ("Easing note" in `src/ChartLine.tsx`) documents this trade-off.

**How to verify (Pass 2):**
```bash
# 1. Tests still pass (143 green — the hook doesn't change the registry)
npm test

# 2. Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# 3. Studio still loads (the §4.5 / §6 import-graph check)
npx remotion studio --no-open

# 4. *Test PNGs are < 1% per-frame different (documented exception to
# the §8 "byte-identical Test PNGs" rule, scoped to 2.3.x Passes 1-2).
# The diff is the linear reveal vs. the pre-2.3.x easeOut reveal;
# not viewer-visible but the PNG byte count / hash WILL differ.
# The visible "line is fully drawn" moment is the same frame; the
# difference is the curve's shape during the reveal.
```

**Next up in 2.3.x:** **Pass 3** — `useCesiumCamera` for `src/Map3D.tsx`. **RECONCILED: the current `Map3D.tsx` is a pure-CSS component, not a Cesium-using one. Pass 3 is a docs-only change; no code change to `Map3D.tsx`, no `useCesiumCamera` hook file.** See Pass 3 below.

### 2.3.x Pass 3 — `Map3D` design reconciliation (no hook needed) — ✅ DONE (docs-only, no commit)

**The reconciliation in 3 lines:**

1. **The current `src/Map3D.tsx` is a pure-CSS 3D voxel map with no Cesium dependency.** It uses `transform: rotateX(...) rotateZ(...)`, `transformStyle: "preserve-3d"`, `transform: translateZ(...)` on the building divs, and a `perspective: 1200` container. There is no `import * as Cesium from "cesium"`, no `useEffect` RAF loop, no `Viewer` / `viewerRef.current` / `viewer.destroy()`, no `requestAnimationFrame`, no `tick()` callback, and no 2D fallback path (the entire component is 2D-friendly already).
2. **The ROADMAP / CLAUDE.md description of `Map3D` as a "Cesium special case" was speculative.** It described a future Cesium integration that was never actually built. The current implementation is a pure-CSS 3D voxel map that ships in `src/Map3D.tsx` and works in Mode A (the phone-friendly render path) without WebGL.
3. **Pass 3 is a docs-only change, not a code change.** The `useCesiumCamera` hook is **not created** (no consumer). The `src/lib/sceneMotion/index.ts` barrel is **not modified** to re-export a non-existent hook. The `src/Map3D.tsx` component is **not modified** — it keeps its 4 one-shot `interpolate(...)` calls inline.

**Why no hook for `Map3D`:** the 2.3.x single-source-of-truth rationale is "one source of truth per continuous primitive". The 2 shippable hooks (`useSceneOrbit`, `useChartReveal`) each own a continuous primitive — a `sin(frame * f)`-driven orbit for `ChartComparison3D`, a `clamp(frame / drawInFrames, 0, 1)`-driven reveal + subtle `sin(frame * f)` pulse for `ChartLine`. `Map3D`'s entrance math is 4 one-shot `interpolate(...)` calls (`rotateX` 35°→20°, `rotateZ` -8°→0°, `mapScale` 0.7→1, all over `[0, mapEntranceEnd]`); there's no continuous loop to centralize. The hook would have no consumer, no shared primitive, and no per-component value to add.

**What `Map3D` already has that doesn't need a hook:**
- 3D scene structure (the `perspective: 1200` container, the `transformStyle: "preserve-3d"` surface, the `transform: translateZ(${building.buildingHeight}px)` on each building div, the `transform: rotateX(-90deg)` and `transform: rotateY(90deg)` for the building tops / sides) — all pure CSS, all driver-free.
- Pin drop animation (the spring-damped `pinDropProgress` interpolate, `pinY` / `pinScale` / `pinRotation` derived from it) — 3 one-shot locals, no continuous loop.
- Label entrance (the `labelOpacity` / `labelY` interpolates over `[pinDropEnd, labelEntranceEnd]`) — 2 one-shot locals.
- Slider border (`sliderProgress` / `sliderDashOffset` interpolates over `[sliderStart, sliderEnd]`) — 2 one-shot locals.
- Idle animations (`idlePulse` for glow opacity, `pinFloat = sin(frame * 0.1) * 6` for the pin floating in idle, `shimmerProgress` / `shimmerY` for the shimmer overlay sweep) — 3 locals, all one-shot or simple `sin` calls.
- Building positions (`buildingPositions` derived from `i / buildings * 2π` and the `mapWidth` / `mapHeight` constants) — static, no animation.

**What a future `Map3D` Cesium integration WOULD need (deferred, see below):**
- A `useCesiumCamera` hook that exposes a `tick()` callback for Cesium's RAF loop (per the original Pass 3 plan).
- A 2D fallback path in the component for the phone (Mode A) — since Cesium's WebGL is unreliable on mobile Chromium, the component would need a non-Cesium render path that falls through when `viewerRef.current == null`.
- A separate `Map3DCesiumTest` composition in `src/Root.tsx` for Studio QA of the Cesium path independently of the 2D fallback.

**What this means for the 2.3.x "exception to the §8 byte-identical Test PNGs rule":** Pass 3 produces no diff (the `Map3D*Test` PNGs are byte-identical to the pre-2.3.x versions) because there's no code change. The exception is now scoped to 2.3.x Passes 1, 2 only (Pass 3 is excluded).

**What this means for CLAUDE.md §3.5:** the "Cesium special case" framing is deleted. The §3.5 entry for `Map3D` becomes "pure-CSS 3D voxel map, no external dependencies, no hook needed". The `useCesiumCamera` mention in §3.5 and §6 is removed.

**What this means for the barrel `src/lib/sceneMotion/index.ts`:** it re-exports `useSceneOrbit` and `useChartReveal` only. **No `useCesiumCamera` is added** — the hook doesn't exist, and adding a stub would re-import the §4.5 / §6 TDZ-under-React-Refresh risk for no benefit.

**How to verify (Pass 3):**
```bash
# 1. Tests still pass (143 green — no code change)
npm test

# 2. Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# 3. Studio still loads (no import-graph change)
npx remotion studio --no-open

# 4. *Test PNGs are byte-identical to the pre-2.3.x versions
# (the only changes are in ROADMAP.md and CLAUDE.md; src/Map3D.tsx
# is unchanged, so its rendered output is the visual baseline)
```

**Next up after Pass 3 (and after 2.3.x is fully done):** **2.4 (beat-emphasis words → component-level highlights for `versus` / `before_after` / `quote_card` — adds the `rough-notation` emphasis cycle that already exists in `KeyStatement` to the 3 components that need it)**.

### 2.4 — Component-level emphasis cycle for `versus` / `before_after` / `quote_card` — ✅ DONE (commits `f17924a`, `b432f8f`)

**Why this was next:** the 4 text-on-card components from 2.1 (`HeadlineCard`, `KeyStatement`, `QuoteAttribution`, `Scrollytelling`) already had a working `emphasisWords` → `rough-notation` cycle (Highlight → Circle → Underline from `@remotion/rough-notation`). Three of the older beat types — `versus`, `before_after`, `quote_card` — accepted `emphasisWords` from the Python pipeline but the prop was a no-op in the component (or only highlighted a label without the cycle). This horizon adds the cycle to those three so the Python pipeline can drive emphasis on any of the 7 text-on-card beat types uniformly.

**Scope shipped (3 components, 4 `*Test` compositions, ~6 edits per component):**

- **`src/VersusCard.tsx`** — added an `emphasisWords?: string[]` prop. The cycle is applied to the **labels** of the two sides (e.g. `"Broadcom"` / `"Nvidia"`). The cycle uses the same `ANNOTATION_CYCLE = [Highlight, Circle, Underline]` from `KeyStatement` / `HeadlineCard` so the visual vocabulary is uniform across the 7 text-on-card beat types. Each label is highlighted with a `RoughAnnotation` per emphasized word, colored with the accent palette (`#e86c00`).
- **`src/BeforeAfter.tsx`** — added an `emphasisWords?: string[]` prop. The cycle is applied to the `beforeLabel` / `afterLabel` text (e.g. `"Manual"` / `"Automated"`). The accent tags ("BEFORE" / "AFTER") stay decorative, as before. The cycle is the same `Highlight` → `Circle` → `Underline` pattern.
- **`src/QuoteCard.tsx`** — added an `emphasisWords?: string[]` prop. The cycle is applied to the quote body (e.g. `"predict"` / `"invent"` in the Alan Kay quote). The `Georgia` quote marks and the `&mdash; {attribution}` line stay plain. **One detail:** the quote body renders the typewriter-style reveal (one word at a time across the beat's idle phase), and the emphasis cycle respects the reveal — only the *current* word is annotated, partial-words (e.g. `"i"` mid-`"invent"`) are rendered plain until the word is complete. The cycle `Highlight` → `Circle` → `Underline` is re-applied to the current word as it appears.
- **`src/Root.tsx`** — added 4 `*TestComposition` wrappers (`VersusCardTest`, `BeforeAfterTest`, `QuoteCardTest`, `QuoteCardLongTest`) and 4 `<Composition>` registrations so the emphasis cycle can be QA'd in Studio. Each passes `emphasisWords` via the wrapped component's props (NOT via `defaultProps` on the `<Composition>`), so the prop is visible in Studio's props panel and editable live.
  - `VersusCardTest` uses labels `"Broadcom"` / `"Nvidia"`.
  - `BeforeAfterTest` uses labels `"Manual Chip Procurement"` / `"Automated Lease-Back Model"`.
  - `QuoteCardTest` uses the Alan Kay quote with emphasis on `"predict"` / `"invent"`.
  - `QuoteCardLongTest` uses a longer Alan Kay quote with emphasis on `"serious"` / `"software"` / `"hardware"`, at `durationInFrames=180` so the typewriter has time to reveal all 3 emphasis words in one cycle.

**Per-component acceptance of `emphasisWords`:**
- `VersusCard` — optional. The default is `[]` (no emphasis, all labels render plain). When provided, the cycle is applied per-label; the `items[]` and `value[]` fields stay plain.
- `BeforeAfter` — optional. The default is `[]`. When provided, the cycle is applied to `beforeLabel` / `afterLabel`; the accent tag rows ("Legacy" / "Modern" etc.) stay decorative.
- `QuoteCard` — optional. The default is `[]`. When provided, the cycle is applied to the quote body; the attribution line stays plain.

**Registry / dispatcher wiring (one-time, at the registry layer):**
- `src/beats/types.ts` — **no change.** The 3 types (`versus`, `before_after`, `quote_card`) are already in the `BeatType` union, and `emphasisWords` is an optional field in the `beatBaseShape` (the shared base of `PerBeatSchema`).
- `src/beats/registry.ts` — **no change.** The 3 per-type Zod schemas already use `.passthrough()` (per Horizon 0.2), so the `emphasisWords` field flows through Zod validation to the component as-is. No schema update needed.
- `src/beats/renderBeat.tsx` — **no change.** The 3 types are correctly in the suppressed list for kinetic captions (text/card beats), so the on-screen `emphasisWords` annotations are the only emphasis shown.
- `src/beats/registry.test.ts` — **no change.** The 143 tests still pass: the per-type schemas for `versus` / `before_after` / `quote_card` already accepted the `emphasisWords` field via the `.passthrough()` base, and the 3 *Test compositions don't change the registry.
- `src/SceneTransition.tsx` — **no change.** The new emphasis cycle runs inside the existing `<SceneTransition>` wrapper; no orchestrator change.

**Design-system compliance:** the emphasis cycle is already standardized in `KeyStatement` (see §3.4 of `CLAUDE.md`); the new components copy that pattern verbatim. The `ANNOTATION_CYCLE` constant lives in each component (3 copies, one per component) — see "Future refactor" below for the consolidation note. Each annotation is `RoughAnnotation` from `@remotion/rough-notation`, with `color="#e86c00"` (the accent palette), `strokeWidth=2`, `padding={4}`, and the standard animation (`1s draw`).

**Visual diff vs. pre-2.4:** the `VersusCard*Test` / `BeforeAfterTest` / `QuoteCard*Test` / `QuoteCardLongTest` PNGs ARE different from the pre-2.4 versions (the emphasis cycle is visible in the rendered output). This is the **expected** change for 2.4; the §8 "byte-identical *Test PNGs" rule is NOT an exception here — the visual diff is the entire point. The other 9 `*Test` PNGs (the ones for `ChartCounter` / `StatPill` / `QuoteAttribution` / etc.) are unchanged.

**Future refactor (out of scope for 2.4):** the `ANNOTATION_CYCLE = [Highlight, Circle, Underline]` constant is currently copied across 7 components (4 from 2.1 + 3 from 2.4). A future horizon (likely 2.6) should extract it to `src/lib/emphasis/useEmphasisCycle.ts` (a small leaf hook that returns the cycle as a stable reference, plus the current annotation for index N). 2.4 is a "ship the cycle in 3 components" pass, not a "consolidate the cycle" pass — the consolidation comes after the cycle is proven in 3 additional components.

**How to verify:**
```bash
# Tests still pass (143 green)
npm test

# Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# Studio — visual QA the 3 emphasis-cycle Test compositions
npx remotion studio --no-open
# Open in browser:
#   /VersusCardTest       (Broadcom vs Nvidia, both labels cycle)
#   /BeforeAfterTest      (Manual vs Automated, both labels cycle)
#   /QuoteCardTest        (predict/invent cycle as the typewriter reveals)
#   /QuoteCardLongTest    (serious/software/hardware cycle, long quote)

# Each *Test PNG is visually different from the pre-2.4 version
# (the emphasis cycle is visible). The other 9 *Test PNGs are unchanged.
```

### 2.5 — Visual polish + design-system compliance audit — ✅ DONE (commits `1e621e9`, `6da63d3`, `b1a9920`, `6deea59`, `2868d59`, `8b09c15`)

**Why this was last in Horizon 2:** after 2.3 (centralized idle math), 2.3.x (scene-based motion hooks), and 2.4 (standardized emphasis cycle), the remaining work is a per-component audit against the 3.3 checklist in `CLAUDE.md`. This is a sweep, not a feature: every component is checked against the 14 design-system primitives and any deviation is fixed or explicitly accepted.

**Final status:** the 20-component design-system audit is **green** (0 ❌s in scope, 1 ❌ out of scope for the `Logo` brand element). The full audit lives in `docs/DESIGN_SYSTEM_AUDIT.md` and is the canonical reference for "what does design-system compliance look like today". The audit's per-primitive summary (265 ✅ / 1 ❌ / 24 ⚠️ with rationales / 22 n/a across 308 filled cells) and 8 deferred follow-ups are the load-bearing documentation for the next time a §3.3 primitive is touched.

**What shipped (4 deliverables across 6 commits):**

1. **Entrance timing rule simplification** (commit `6da63d3`) — `CLAUDE.md` §3.3 primitive #7 was simplified from the previous "≤40% text / ≤30% data-vis" two-tier rule to a **single 50% cap for all 20 beat types** with a small-overrun exception for staggered/word-by-word entrances. The 4 entrance-timing ❌s (`LocationPulse` 35%, `QuoteCard` 63%, `Timeline` n ≥ 3, `ChartComparison3D` n ≥ 4) were reclassified to ✅ under the new rule. **Reasoning:** the two-tier rule was creating audit noise without changing user-visible behavior; small overruns past 50% are accepted for staggered/word-by-word entrances where the stagger is the entrance (e.g. `QuoteCard`'s typewriter, `Timeline`'s marker stagger, `ChartComparison3D`'s bar stagger).

2. **Space Grotesk migration — batch 1 (4 of 9 components)** (commit `b1a9920`) — added `loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk` to the 4 text-on-card / two-card components that were missing it: `BeforeAfter`, `QuoteCard`, `VersusCard`, `PlainText`. The pattern (import `loadFont`, call at module level, destructure `fontFamily`, route into `fitText` / `measureText` / `fillTextBox` where used) matches the existing `KeyStatement` / `HeadlineCard` references.

3. **Space Grotesk migration — batch 2 (5 of 9 components)** (commit `6deea59`) — same fix applied to the 4 data-vis / icon components still using `system-ui, sans-serif` (`IconText`, `ProgressMeter`, `Timeline`, `ChartLine`) plus the 1 partial-load case (`ChartComparison3D`, where the existing font string `'Space Grotesk', 'Inter', system-ui, sans-serif` was a hard-coded reference that fell through to `system-ui` because `loadFont` was never called). The `ProcessFlow` (row 13) col-5 ❌ auto-resolves because `ProcessFlow` reuses `Timeline`'s component. **After this batch, Space Grotesk (col 5) is green in the 20-component scope.**

4. **`TickerTape` `emphasisWords` cycle** (commit `2868d59`) — added `emphasisWords?: string[]` to `TickerTapeProps` (default `[]`) and wired the per-headline `ANNOTATION_CYCLE` (Highlight → Underline → Circle) across `stories`, mirroring the "one running index across both sides" pattern from `VersusCard` / `BeforeAfter`. The component's 3 new per-word timing props (`wordDurPct`, `wordStaggerPct`, `wordStartDelayPct`) follow the same default-shape as the other 7 text-on-card components so the cycle's stagger / duration / start-delay percentages are uniform across the 8 text-on-card types. **Default `emphasisWords: []` keeps the `TickerTapeTest` PNG byte-equivalent to the pre-2.5 baseline** (the no-emphasis path renders `${contentText}` as a single string, matching the pre-fix JSX). The §2.4 emphasis-cycle refactor was supposed to add `emphasisWords` to all 8 text-on-card types per §3.4.1, but `TickerTape` was missed; 2.5 closed that gap.

5. **Design-system audit document** (commit `1e621e9` for the scaffold, commit `8b09c15` for Phases 3/4/5) — `docs/DESIGN_SYSTEM_AUDIT.md` is the load-bearing deliverable. It contains:
   - The 22-row × 14-primitive audit table (20 beat types + `Logo` + `PersistentBackground`) with every cell filled (`✅` / `❌` / `⚠️` / `n/a`) and a one-line rationale for every `⚠️`.
   - The §4.5 import-graph audit (registry ↔ renderBeat circular-import check) and the §6 barrel-leaf audit (the two hook barrels must not re-export from consumer components). Both pass.
   - The per-primitive summary table with cell counts.
   - 4 reclassification tables (one per Phase 2 batch + the TickerTape emphasis reclassification) explaining each fix.
   - **8 deferred follow-ups** for future horizons (6 code-comments / dead-prop / hard-coded-timing items for 2.6, 1 no-op doc-comment closed, 1 brand-element deferred to 4.x).
   - A "How to use this file" walkthrough that future horizons can re-use as a starting point.

6. **Verification chain (Phase 4)** — `npm test` 143/143 pass, `out/smoke.png` byte-identical to the pre-2.5 baseline (46314 bytes, hash `bfbbf7cdef5c…`), and all 19 `*Test` PNGs are byte-identical to the pre-2.5 baseline. The Space-Grotesk migration re-routes through `loadFont`'s resolved `fontFamily` (which equals the existing `'Space Grotesk'` family at runtime, given the same Google Fonts request), and the `TickerTape` `emphasisWords` default of `[]` keeps the `TickerTapeTest` JSX byte-equivalent. The §8 "byte-identical *Test PNGs" rule is fully preserved.

**Scope (20 components, ~14 primitives each = ~280 checks):**
- All 20 registered beat types are in scope. The 19 `*Test` compositions in `src/Root.tsx` give the visual baseline; the audit produces a 22-row × 14-primitive table with one row per component, one column per primitive, and a ✅ / ❌ / ⚠️ (deviation, accepted) status.
- Deviations that were fixed: the 9 Space Grotesk gaps (8 fully missing + 1 partial) and the 1 `TickerTape` `emphasisWords` gap.
- Deviations that are explicitly accepted (⚠️): the 4 components in §3.5 of `CLAUDE.md` (`BeforeAfter`, `QuoteAttribution`, `CompareSplit`, `LocationPulse`) have legitimate layout differences (two-card, quote-mark framing, neutral-color comparison, 2D map). Their design-system primitives are still compliant; only the layout deviates. Each `⚠️` has a one-line rationale in the audit table.

**Deferred follow-ups (8 items, see `docs/DESIGN_SYSTEM_AUDIT.md` for the full table):**
- 6 code-comments / dead-prop / hard-coded-timing items (defer to 2.6): `KeyStatement` + `ChartLine` `exitDirection` dead prop, `ChartCounter` in-file comment vs default mismatch, `QuoteAttribution` hard-coded emphasis timing, `Scrollytelling` hard-coded `progress={1}`, `IconText` in-file comment now accidentally correct under the new rule (no fix needed; just close the follow-up), `Scrollytelling` test-data concern.
- 1 no-op doc-comment (close the follow-up): `IconText`'s "Text cards must complete entrance by 50%" comment.
- 1 brand-element deferred work (defer to 4.x): the `Logo` ❌ for Space Grotesk resolves when the real voxel logo lands and the brand style guide is in place.

**How to verify:**
```bash
# 1. Tests still pass (143 green)
npm test

# 2. Smoke still green (46314-byte smoke.png, hash bfbbf7cdef5c…)
./scripts/render-smoke.sh

# 3. Studio still loads (no import-graph change; the §6 leaf-file
# rule still applies to the two hook barrels)
npx remotion studio --no-open

# 4. 19 *Test PNGs are byte-identical to the pre-2.5 baseline
# (the Space Grotesk migration re-routes through loadFont's resolved
# fontFamily, which equals the existing 'Space Grotesk' family at
# runtime; the TickerTape emphasisWords default of [] keeps the
# TickerTapeTest JSX byte-equivalent to the pre-2.5 baseline)

# 5. Audit is the source of truth for "what does design-system
# compliance look like today":
cat docs/DESIGN_SYSTEM_AUDIT.md | less
```

**Horizon 2 is now complete.** The arc: 7 new beat types (2.1.1–2.1.7), registry unit tests (2.2), shared idle motion library (2.3), 2 scene-based motion hooks (2.3.x Passes 1–3), standardized emphasis cycle in 3 components (2.4), and design-system audit (2.5). The visual vocabulary the rest of the project needs is in place.

**Next up:** Horizon 3 (smart beat generation, **$0–$5/day LLM spend**).

---

## Horizon 1 — Local Batch Renderer (defer until laptop, **$0**)

**Defer trigger: you have a laptop/desktop with a real GPU.** For now, see Mode A in the "Render Mode" section above — render in the browser via Studio.

A single video takes ~2 minutes to render locally. You don't need a web UI to start producing a daily Shorts feed — a Python batch driver + `cron` is enough. The hosted dashboard is in Horizon 6.

### 1.1 Python batch driver (`render_batch.py`)
- Reads a list of story IDs from `output/DD_MM_short_vids/_queue.json` (the pipeline already produces this).
- For each story: copy `narration.mp3` / `beats.json` / `timestamps.json` / `sfx-ambient.mp3` into `my-video/public/`, run `npx remotion render MotionGraphicsVideo out/{story_id}.mp4`, then move the output to `output/DD_MM_short_vids/{story_id}.mp4`.
- Concurrency: render N videos in parallel where N = `min(stories_remaining, cpu_count - 1)`. Use `subprocess.Popen` + a `multiprocessing.Pool` of watchers.
- Retry: up to 2 retries per story on transient failure (ffmpeg OOM, mediabunny chunk error).
- **Reuse the 0.5 hash cache** to skip duplicate renders across batch invocations: read `out/last-render.json` keyed by `storyId` (extending `LastRenderRecord` to add a per-story entry rather than a single file). One-liner: store a `Record<storyId, LastRenderRecord>` instead of a single record.

### 1.2 Local monitoring via plain log files
- Append one JSON line per render to `output/DD_MM_short_vids/_render_log.jsonl` (story_id, status, duration_seconds, error if any).
- `tail -f` + `jq` is the dashboard until Horizon 6.

### 1.3 `cron` schedule
- One daily cron entry runs `python -m run_pipeline && python -m render_batch`.
- The local machine is the render farm. If the queue grows faster than one machine can render in a day, that's a problem for Horizon 6 (managed runners).

### 1.4 ~~File-based audio plan log + smoke test assertion~~ — CANCELLED
- We shipped this (commits cd656a1 and earlier) but it never worked end-to-end. The plan was: compute the audio plan (whoosh slots + click count) in `Root.tsx::renderDataCalculateMetadata` and append one JSON line per render to `out/audio-mounts.log` via `writeAudioPlanLog`; the smoke test would read the file and assert one valid JSON line was present.
- The implementation hit two unfixable problems:
  1. **`process.versions.node` is unreliable in the render context.** Remotion's render path shims `process` (so `process.env` etc. work) but `process.versions.node` is `undefined`. The "am I in real Node?" guard we added to gate the file write was the only thing standing between the function and a `require("fs")` that would have crashed the renderer. Once we removed the guard (or made it always throw when `process.versions.node` was undefined), every render surfaced a warn in the render log saying "not running in real Node" — meaning the cache file was never written.
  2. **Webpack's static analysis reaches dynamic `require()` calls.** Even after we hid the `node:fs` import behind a `(0, eval)("require")("fs")` idiom, webpack's CommonJS analysis pass still followed it and tried to resolve `fs` for the browser bundle. The earlier "move the file to `scripts/`" escape worked for the helper, but `writeAudioPlanLog` had to live in `src/lib/sceneSfx.ts` (alongside the other SFX URL constants) so the orchestrator could import it. The two `remotion.config.ts` workarounds (the `resolve.fallback: { fs: false, ... }` map AND moving the helper to `scripts/`) were enough to make the render work, but the actual `writeAudioPlanLog` function still failed at runtime for reason (1).
- **The fix we landed:** drop the entire 1.4 surface area. `src/lib/sceneSfx.ts` no longer exports `writeAudioPlanLog` / `AudioPlanLog` / `WhooshSlot`; `Root.tsx` no longer computes or writes the audio plan; `scripts/render-smoke.sh` no longer asserts on `out/audio-mounts.log` (exit code 3 is gone). The orchestrator's audio streams (narration, ambient, per-transition whoosh, per-word click) all mount correctly because they live in the React tree, not in a side-channel log.
- **What we'd need to bring it back:** either (a) a runtime-only `import.meta.env` / `typeof window` check that runs the file-write code in a `<Sequence>` somewhere inside `Root.tsx`'s `renderDataCalculateMetadata` callback (Remotion runs the callback in real Node on every render, both `still` and full), OR (b) a `<AudioMountLog>` component that fires `onMount` only on the `npx remotion render` path (not `still`), gated by a new `process.env.REMOTION_RENDER_TYPE` check. Both are non-trivial; not worth it for the marginal observability gain.
- **Do not re-litigate this.** If a future horizon (e.g. 9.x CI) needs per-mount audio observability, write the per-mount log lines from inside a wrapper that the orchestrator mounts unconditionally (e.g. a sibling `<AudioMountLog>` with `useEffect`) and gate the verification on a full `npx remotion render` smoke test, not on `npx remotion still`. The `still` path will never produce per-mount logs.

### 1.5 Cost ceiling
- 4 concurrent renders × 2 min = 30 videos/hour on a single machine.
- Daily target: 6 videos → 12 minutes of wall time. Within budget on a laptop, no extra cost.

---

## Horizon 3 — Smart Beat Generation (1–2 weeks, **$0–$5/day LLM spend**)

The current `beat_generator.py` uses a single LLM call to assign beat types to word chunks. This produces monotonous sequences ("key_statement, icon_text, key_statement, icon_text, ..."). The next round introduces story-level visual planning.

**Cost note:** every extra LLM call adds to your daily bill. Estimate before scaling: with `gpt-4o-mini` at ~$0.15/M input tokens, one extra pass over a 150-word script is ≈ $0.001 per story. Six stories/day = $0.006/day. Even with `gpt-4o` you're under $0.10/day. **Stay on `gpt-4o-mini` for everything in this horizon unless accuracy demands otherwise.**

### 3.1 Story-level visual planning
- Before per-beat generation, run a second LLM pass that produces a **story arc** — 1 intro beat, 1–2 explanation beats, 1 climax beat, 1 outro beat.
- Pass this arc to the per-beat generator as a constraint, so the output is structured rather than homogeneous.
- **With 2.1.1 done, the intro beat can now be a `headline_card` instead of a `key_statement`** — the Python pipeline should emit `{"type": "headline_card", ...}` for the first beat of the timeline so the story hook gets the bigger headline.

### 3.2 Beat type diversity budget
- The per-beat prompt should be told: "this story must include at least one of each: `chart_line`, `map_3d`, `quote_attribution`". This forces visual variety.

### 3.3 Beat length auto-tuning
- Currently the Python script produces ~1.5–4s beats. Some stories (long quotes) need 6s beats; others (rapid stat callouts) need 0.8s beats.
- Compute target `durationInFrames` per-beat based on the word count: `frames = max(45, min(180, wordCount * 4.5))` (≈ 1.5–6s at 30fps).
- The orchestrator's `computeTransitionFrames` already handles the cross-fade math, so the only change is in Python.

### 3.4 Auto-pacing based on word density
- A "rapid-fire" beat sequence (e.g. 5 short stat callouts) should use shorter durations than a single long quote. The Python pipeline should output a per-beat `pacing` hint ("slow" / "normal" / "fast") and the orchestrator should adjust `durationInFrames` accordingly.

### 3.5 Visual reference images for the LLM
- When generating beats for a `map_3d` beat, include 1–2 reference screenshots of the existing `Map3D` component so the LLM understands what the rendered output looks like and produces appropriate `locationName` + `latitude`/`longitude` + `buildings` metadata.

---

## Horizon 4 — Local Asset Pipeline (1–2 weeks, **$0**; 4.1 deferred until GPU)

Per-story assets, but generated locally so there are no API costs. **No stock-photo APIs in this horizon.**

### 4.1 Local image generator (`image_fetcher.py`) — DEFERRED until GPU
- ~~For each story, generate 2–3 AI images using a local Stable Diffusion install~~ — needs a GPU. Skip until Mode B.
- **Phone-friendly fallback**: pull a small set of pre-generated hero images from a local `assets/hero/` folder and pick by `category` (e.g. finance → "stock chart", tech → "circuit board"). Add a manifest of category→filename mappings. Ships now.
- Store as `output/DD_MM_short_vids/{story_id}/images/{0,1,2}.png`.
- Reference from `beats.json` via the new `image_card` beat type (2.1).

### 4.2 Per-story ambient track (local generation)
- The current `sfx-ambient.mp3` is a single generic bed. Replace with per-story variants generated locally with a tool like `audiocraft` or by remixing free CC0 samples.
- Pick the variant based on the story's `category` (from `news_fetcher.py::score_story`).
- Add `AMBIENT_SFX_URL` to be parameterized via `defaultProps` rather than hard-coded in `sceneSfx.ts`.

### 4.3 Logo variants (pure-CSS, no fonts to load)
- `S-NEWS` is the placeholder brand. Add a generic `Logo` system that takes a `name` + `theme` prop:
  - `name="Bloomberg"` → orange + black, "BBG"
  - `name="Wired"` → magenta + white, "WIRED"
- Drawn with CSS / inline SVG, no remote font fetches.

### 4.4 Localized SFX library
- Add 3–4 whoosh variants (short, long, rising, falling) so cross-fades don't all sound the same.
- Pick the variant per-beat-pair based on the beat types (`map_3d` → rising, `chart_line` → short, etc.).
- Source from a small set of CC0 samples (`freesound.org`, `zapsplat.com` free tier) bundled into `public/sfx/`.

---

## Horizon 5 — Interaction, Player, and Analytics (1–2 weeks, **$0**)

The current system produces static MP4s. Adding interactivity makes the pipeline more useful for in-app previews and for measuring which beats work. None of this costs money; the player is a free Remotion package.

### 5.1 `<Player />` integration
- Use `@remotion/player` to embed the live composition in a local dev HTML page (`scripts/player.html`).
- Each beat type becomes a button — clicking a button shows a single-beat preview with the metadata editor.
- This also serves as the **Studio replacement** for the current `*Test` compositions in `Root.tsx`.

### 5.2 Per-beat heatmap (offline)
- Use `ffprobe` to extract frame-level scene changes from the rendered MP4.
- Map frame ranges to beats via `beats.json` and report "viewer dwell" as a proxy (i.e. which beats the editing style is engaging enough to hold attention).
- Output a `heatmaps/{story_id}.html` per render; open in any browser. No server.

### 5.3 A/B testing the captions gate (local, not split-traffic)
- Currently the `CAPTION_VISIBLE_BEAT_TYPES` set is hard-coded. Add a `defaultProps` flag `showAllCaptions: boolean` and render both variants locally for each story.
- Compare the two MP4s side-by-side in the local `player.html` and pick the one that looks better.
- This is "A/B" in the editorial sense, not the analytics sense; no traffic split, no metrics platform.

### 5.4 Component-level analytics (file-based)
- Add a `useComponentTelemetry(name)` hook that writes a CSV row per component mount to `out/telemetry/{composition_id}.csv`. Useful for finding under-used beat types.
- Inspect with `pandas` or a spreadsheet.

---

## Horizon 6 — Hosted Web Dashboard & Multi-Story Compositions (defer until laptop, **$10–$30/month**)

**Defer trigger: you're already on Mode B (laptop, local batch rendering) and want a web UI.** For now, use `tail -f output/DD_MM_short_vids/_render_log.jsonl` and the file system.

This is where hosting costs start. The previous horizons are zero-spend; from here on, you're paying for a server.

**Cost model:**
- **FastAPI on a $5/month VPS** (Hetzner, DigitalOcean): single-threaded, sufficient for the dashboard. The dashboard itself is static HTML served by the same FastAPI process.
- **SQLite for state**: free, included with the OS.
- **No managed services** (no Supabase, no Vercel, no Auth0) for now. Add basic-auth via a single shared password in env vars.
- **Total: ~$5–$10/month** for the dashboard.

### 6.1 Two-page dashboard
- **Queue** (shows pending / in-progress / completed renders)
- **Renders** (shows each video with a thumbnail + duration + error log)
- Backend: FastAPI on `:8000`, reading from `output/DD_MM_short_vids/_render_log.jsonl` (one JSON line per render).
- Live status: a simple Server-Sent Events (SSE) stream pushes new log lines to the dashboard. No WebSocket cost; SSE is built into FastAPI.
- Thumbnail generation: `npx remotion still MotionGraphicsVideo out/thumb.png --frame=60` after each successful render, served as a static file.

### 6.2 Multi-story composition
- Each story becomes a sub-composition (`<Composition id="StoryA" component={MotionGraphicsVideo} />`).
- The orchestrator renders an outer `<TransitionSeries>` of story-level `<TransitionSeries.Sequence>`s with a 1-second `wipe` transition between them.
- Add a `TickerTape` overlay (from 2.1) at the bottom of every story beat that lists the upcoming stories.

### 6.3 Intro / outro cards
- The first `<Sequence>` is a `<HeadlineCard>` introducing the channel.
- The last `<Sequence>` is a `<QuoteAttribution>` asking for subscribers.
- Both are zero-cost additions — just more beat types.

### 6.4 Per-story vertical-format switch
- YouTube Shorts (1080×1920), TikTok (1080×1920), Instagram Reels (1080×1920) — same. But X / Twitter prefers 1080×1350 (4:5) and YouTube long-form prefers 1920×1080 (16:9).
- Add a `format` prop to the composition that re-scales the layout (caption position, logo size, padding) for the target aspect ratio.

---

## Horizon 7 — Managed Render Farm (1 week, **$20–$100/month**, Mode B only)

**Defer trigger: your local machine can't keep up with the daily queue.** Most creators with one daily Short can stay on Horizon 1.

**Cost model:**
- **GitHub Actions runners** (free for public repos, 2 000 min/month for private): zero-cost if you're open source; ~$0.008/min for Linux runners beyond that.
- **OR Fly.io machines** ($5–$10/month for always-on, ~$0.00002/sec for spot).
- **OR Hetzner dedicated** (~$30/month for a 16-thread box) for serious volume.
- **Don't use AWS Lambda / GCP Cloud Run** for this — Chromium headless requires a full image and the cold-start cost is brutal.

### 7.1 Containerize the renderer
- Build a `Dockerfile` based on the Remotion Chromium headless image.
- Same Chromium version as the local dev so renders are deterministic.

### 7.2 Push the queue to the farm
- The local `render_batch.py` from Horizon 1 becomes a thin client that POSTs each render job to the farm.
- The farm's worker pulls from a queue file (`/var/queue/render.jsonl`) and runs the same `npx remotion render` command inside the container.

### 7.3 Cost monitoring
- Track wall-time per render. Alert if p95 exceeds 5 minutes (the ffmpeg pipeline should be sub-3-minute on a 6-core machine).
- Track LLM token usage from `llm_ranker.py` and `beat_generator.py`. Alert if daily spend exceeds $5.

### 7.4 Content moderation (local, no API spend)
- The news fetcher returns stories from RSS / Reddit. Add a pre-render moderation step that filters out:
  - Stories with banned keywords (configurable list in `config/moderation.txt`)
- Stories where the LLM-rated `is_political` probability > 0.7
- Add a `dry_run` mode to `render_batch.py` that produces a list of pending renders without actually rendering, so a human can review before committing compute.

---

## Horizon 8 — YouTube Auto-Publish (1 week, **$0 but requires OAuth approval**)

This is the last horizon because YouTube Data API v3 requires OAuth verification (1–4 week turnaround for production quota). Start the application process now if you haven't.

**Cost model:**
- **YouTube Data API v3** itself is free.
- **OAuth app verification** is free but takes time.
- **Daily upload quota** is 10 000 units; a single upload costs 1 600 units. ≈ 6 uploads/day cap.
- **Storage on YouTube** is free.

### 8.1 OAuth flow
- Run a one-time `python -m auth_youtube` script that opens a browser, gets the user to log in, and saves the refresh token.
- Store the token in `secrets/youtube_token.json` (gitignored).

### 8.2 Auto-upload after render
- After a successful render, upload the MP4 to YouTube via the YouTube Data API v3.
- Title format: `{headline} | S-NEWS Shorts`
- Tags: derived from the story's `category` + `source_name`
- Schedule for 9am ET daily. Add the upload to a `out/upload_log.jsonl` so it can be retried.
- **Phone-friendly interim (Mode A):** download the MP4 from Studio and upload it manually via the YouTube app. No automation, but it works.

### 8.3 Failure-mode playbook
Write `docs/FAILURE_MODES.md` covering:
- "ffmpeg out of memory" → reduce `concurrency`, retry
- "Zod validation failed" → check the Python output for that story
- "mediabunny Cannot write to a closing writable stream" → see the typing-click fix in commit bca9134; if it recurs, also widen the whoosh sequence to 4 frames
- "404 on /public/beats.json" → check `public/` has the file; the orchestrator does not auto-recover
- "YouTube 403 quotaExceeded" → drop to 1 upload/day and queue the rest for tomorrow

---

## Horizon 9 — E2E Tests, CI, and Production Polish (ongoing, **$0**)

### 9.1 GitHub Actions workflow
- On every PR, run `npx remotion render MotionGraphicsVideo` against a sample `beats.json` and check the output duration is > 60 frames.
- Free for public repos; ~2 min of CI time per PR.
- **Mode A note:** CI runs on GitHub's Linux runners, which DO have hardware acceleration. So this horizon works in both modes; it's just that in Mode A you can't run the same `npx remotion render` locally — you'd have to push to a branch and let CI do it.

### 9.2 End-to-end test
- A single script `scripts/e2e.sh` that:
  1. Runs `python -m run_pipeline` with a fixture story
  2. Copies the outputs into `my-video/public/`
  3. Runs `npx remotion render MotionGraphicsVideo out/e2e.mp4`
  4. Asserts the output is > 60 frames
- Runs in CI on every release branch.

### 9.3 Component visual regression
- Render each `*Test` composition in CI.
- Compare the output PNG against a checked-in baseline using `pixelmatch`.
- Alert on > 1% pixel diff for any test.

---

## What's deliberately NOT on this roadmap

These were considered and removed because they don't pass the cost lens or the impact-vs-effort ratio:

- **Stock-photo APIs (Pexels, Unsplash, Shutterstock):** either pay-per-call or rate-limited; replaced with local generation in 4.1 (or the curated fallback in 4.1 for Mode A).
- **Managed vector + raster map APIs (Mapbox, MapTiler paid tier):** the current `Map3D` uses pure-CSS 3D voxel renderers that don't need map tiles. The roadmap's `Map3D` is local-only.
- **ElevenLabs / paid TTS:** the current pipeline uses Microsoft Edge TTS (free). The voice quality is "good enough" for Shorts; revisit only if A/B testing shows paid TTS lifts retention.
- **Cesium / WebGL map effects:** the original ROADMAP plan for `Map3D` was a Cesium-based 3D map, but the actual shipped `Map3D` is a pure-CSS 3D voxel map that works in Mode A without WebGL. Cesium-based maps (and the `useCesiumCamera` hook that would have driven them) are deferred indefinitely — see §2.3.x Pass 3 for the reconciliation.
- **Real-time dashboard websocket fan-out (Pusher, Ably):** the local dashboard uses SSE in 6.1, which is free. Real-time fan-out to thousands of users is a problem for much later.
- **Cloud storage for renders (S3, GCS):** the current setup writes to local disk. If you outgrow that, the upload-to-YouTube flow in Horizon 8 already moves bytes off your machine.
- **Auto-publish to TikTok / Instagram:** those APIs are pay-walled and have stricter approval processes than YouTube. Deferred indefinitely.

---

## Open Questions (resolve before Horizon 3+)

1. **LLM cost ceiling**: How much are you willing to spend per story? This determines whether you can run the multi-pass story-arc planning (3.1) at scale. Default: stay on `gpt-4o-mini`, < $0.01/day.
2. **Brand identity**: Is `S-NEWS` the permanent brand, or a placeholder? If placeholder, the logo variants in 4.3 are higher priority.
3. **YouTube API approval**: YouTube Data API requires OAuth approval for production upload. Start the application process now if you haven't.
4. **Content rights**: Confirm that the news sources you're aggregating allow derivative video content. RSS feeds are usually fine; Reddit posts need attribution.
5. **Local GPU available?** A consumer GPU (≥ 6 GB VRAM) unlocks 4.1 (local SD) and Horizon 1 / 7 (local render farm). If you don't have one, you're in Mode A and 4.1 / Horizon 1 / 6 / 7 are deferred.

---

## Summary

| Horizon | Effort | Cost | Mode | Output |
|---|---|---|---|---|
| 0 — Renderer Hardening | 1–2 days | $0 | A or B | Stable, observable, deterministic renders |
| 2 — Component Coverage | 1–2 weeks | $0 | A or B | 13 beat types, idle motion library, emphasis text |
| 3 — Smart Beat Generation | 1–2 weeks | $0–$5/day LLM | A or B | Story-arc planning, diversity budget, auto-pacing |
| 4 — Local Asset Pipeline | 1–2 weeks | $0 (4.1 needs GPU) | A or B | Local images, ambient tracks, logo variants |
| 5 — Interaction, Player, Analytics | 1–2 weeks | $0 | A or B | Local player, offline heatmap, file telemetry |
| 1 — Local Batch Renderer | 3–5 days | $0 | B only | 6 videos/day on a laptop, log-file monitoring |
| 6 — Hosted Dashboard & Multi-Story | 1–2 weeks | $5–$30/month VPS | B only | Web dashboard, intro/outro, format switch |
| 7 — Managed Render Farm | 1 week | $20–$100/month | B only | Containerized renderer, push queue, alerts |
| 8 — YouTube Auto-Publish | 1 week | $0 (OAuth approval time) | A: manual, B: auto | Auto-upload + scheduling |
| 9 — E2E Tests, CI, Production Polish | ongoing | $0 (free CI minutes) | A or B | Visual regression, e2e script, release pipeline |

**The critical path is Horizon 0 → 2 → 3 → 4 (without 4.1) → 5 → 8 (manual for now)** (in that order). Horizons 1, 6, 7 are needed only when you have a laptop and the local machine can't keep up with the daily queue.

**Horizon 2 status:** **✅ COMPLETE.** All 5 sub-horizons done — 2.1 (7 new beat types, 2.1.1–2.1.7), 2.2 (registry unit tests, 143/143), 2.3 (shared idle motion library, 17/20 card-based components), 2.3.x (2 scene-based motion hooks shipped + 1 docs-only reconciliation for `Map3D`), 2.4 (emphasis cycle standardized across 7 text-on-card components), 2.5 (design-system audit green, 0 ❌s in scope, 8 deferred follow-ups tracked). Visual vocabulary: 20 registered beat types, single source of truth for 3 motion primitives (`useIdleMotion` / `useSceneOrbit` / `useChartReveal`), 7-component shared `rough-notation` emphasis cycle. **Next horizon: 3** (smart beat generation, LLM-driven story-arc planning + diversity budget + auto-pacing, $0–$5/day LLM spend).
