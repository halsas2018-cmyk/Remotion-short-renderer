# Kinetic Typo Vid — Project Knowledge for AI Assistants

Read before suggesting any change. The "Money lens" rule and "Components are templates" rule are non-negotiable.

---

## 0. Core rules

- **Source of truth for project status is `ROADMAP.md`.** Don't invent horizons.
- **Money lens:** any paid API, hosted service, or compute we don't already own must be deferred to a later `ROADMAP.md` horizon (or a new one) with cost model spelled out. Never silently introduce spend.
- **Components are templates, not custom code.** Every beat type is a copy-paste of `src/HeadlineCard.tsx` (text) or `src/ChartCounter.tsx` (number) on design-system primitives in `src/design-system/index.ts`. New layouts/fonts/palettes = design-system change = new horizon.
- **No circular imports between `src/beats/registry.ts` and `src/beats/renderBeat.tsx`.** Shared helpers go in their own leaf file (e.g. `src/beats/adaptMetadata.ts`). See §4.5.
- **Hook barrels are leaf files.** `src/lib/idleMotion/index.ts` and `src/lib/sceneMotion/index.ts` re-export hooks + types only. They MUST NOT re-export from any consumer component or orchestrator. Same TDZ-under-React-Refresh failure as §4.5. Smoke test does NOT catch this — only `npx remotion studio --no-open` does.

## 0.1 Process rules

1. **You may run commands and edit files directly in this environment** (Claude Code — full Read/Edit/Write/Bash tool surface). The earlier "suggest only, no edits" rule was written for an aider-style harness that lacked tools; it does not apply here.
2. **If ambiguous, ask.** Don't guess or invent files.
3. **If a file isn't in this conversation, ask to add it.**
4. **Return entire files**, not diffs. No elision. (When editing, prefer Edit for targeted changes; Write for new files. Don't paste whole-file replacements back into chat unless the user asks.)
5. **Trust the latest `*added these files to the chat*` message** as the true contents.
6. **Smoke test is the unit of truth.** `./scripts/render-smoke.sh` green + identical `*Test` PNGs = correct refactor. Don't add unit tests for smoke-covered behavior unless asked. **Exception:** 2.3.x scene-based motion hooks (Passes 1/2/3) may produce <1% per-frame diff.
7. **Type-check after cross-layer changes.** `npx tsc --noEmit` is part of the unit of truth for files that import across `MotionGraphicsVideo.tsx` ↔ `audio/BeatKineticCaptions.tsx` ↔ `KineticCaptions.tsx` — the `npm test` (Vitest) pipeline does NOT enforce `tsconfig.json`'s `strict: true` and silently allows mismatched prop shapes and missing fields. **Lesson learned:** the blank-captions bug (Sept 2026) was a TS error in production code that 143/143 tests never caught.

## 1. Money lens

First three horizons (0, 2, 3) are pure-local, zero-cost.

| Status | Services |
|---|---|
| ✅ in use | Edge TTS (free), WhisperX (local CPU), local file I/O, `npx remotion render` (local Chromium), Google Gemini `gemini-3.1-flash-lite` (Google AI Studio free tier, key in `GEMINI_API_KEY`) |
| 🟡 Horizon 3 | OpenAI `gpt-4o-mini` |
| 🟡 Horizon 7 | Managed render farm (Mode B only) |
| 🟡 Horizon 6 | Hosted dashboard (Mode B only) |
| 🟡 Horizon 8 | YouTube Data API v3 |
| 🟡 | OpenRouter `:free` (needs $10 credits; otherwise rate-limited) |
| ❌ DEFERRED | Stock photos, Mapbox paid tier, ElevenLabs, managed map APIs, websockets, S3/GCS, auto-publish |

If a feature needs something not ✅/🟡, STOP. Add a horizon, stop until human signs off.

## 2. Render Mode

**Mode A (current, phone, no GPU):** use Remotion Studio browser render. See full steps in `ROADMAP.md`.
**Mode B (future, laptop with GPU):** `npx remotion render MotionGraphicsVideo out/movie.mp4`.

Mode A horizons: 0, 2, 3, parts of 4 (except 4.1), 5, 9. Mode B adds 1, 6, 7.

## 3. Components are templates (load-bearing)

Every beat type is a copy-paste of two templates on shared design-system primitives.

### 3.1 The two canonical templates

- **`src/HeadlineCard.tsx`** — text-on-card (key_statement, quote_attribution, scrollytelling, ticker_tape, headline_card).
- **`src/ChartCounter.tsx`** — number-on-card (stat_pill).

### 3.2 How to add a new beat type

1. Copy `HeadlineCard.tsx` or `ChartCounter.tsx`. Rename. Change only per-type field set, Zod schema, defaultProps.
2. Add type to `BeatType` union in `src/beats/types.ts`.
3. Add per-type Zod schema + registry entry in `src/beats/registry.ts`. Schema must `.passthrough()`. If a field is an array that the LLM may emit in multiple shapes, use `z.union([...])` and let `adaptMetadata` normalise — see `timelineMetadata` for the `events: string | {date,label}` precedent.
4. Add `*TestComposition` wrapper + `<Composition>` entry in `src/Root.tsx`. Use local `React.FC<{...}>` wrapper, NOT a `<Composition>` element in the component file.
5. If data-vis, keep kinetic captions visible; if text-on-card, suppress them in `src/beats/renderBeat.tsx` (`CAPTION_VISIBLE_BEAT_TYPES`).

### 3.3 Design system compliance (every component)

- Portrait 1080×1920
- Transparent `AbsoluteFill` over `PersistentBackground`
- White card: shadow + 1px `#e8e8e8` border + 28–48px radius
- Top 4px gradient accent bar (`#e86c00` → `#f97316`)
- `loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk`
- `fitText` for auto-sizing
- Entrance animations complete by **50% of `durationInFrames`** (single unified cap, all 20 beat types). Small overrun acceptable for stagger/word-by-word entrances.
- No exit animation in component — `SceneTransition` (mounted by orchestrator) owns entrance fade + cross-fade
- Idle: bounce + 3D tilt + glow pulse via `useIdleMotion` (or scene-based hooks for `ChartComparison3D` / `ChartLine` / `Map3D`)
- Accent palette: `#e86c00` / `#f97316` / `rgba(232, 108, 0, 0.4)`
- `rough-notation` for emphasis (`Highlight` → `Circle` → `Underline` cycle)
- `durationInFrames` forwarded as prop
- Slider border + decorative dots + shimmer

### 3.4 The `useIdleMotion` hook

Lives at `src/lib/idleMotion/useIdleMotion.ts`, barrel at `src/lib/idleMotion/index.ts`. Returns `{ transform, translateY, rotateX, scale }` with per-primitive toggles.

- **Bounce:** `translateY = bounceAmplitude * sin(frame * bounceFrequency * 2π)` (default 6px, 0.08 Hz)
- **Tilt:** `rotateX = tiltAmplitude * sin(frame * tiltFrequency)` (default 2°, 0.05 Hz)
- **Glow:** `scale = 1 + glowAmplitude * sin(frame * glowFrequency)` (default 0.15, 0.03 Hz)

**Pass 1 done (4 of 20):** `HeadlineCard`, `KeyStatement`, `BeforeAfter`, `ChartCounter`. Passes 2/3/4 cover remaining 16.

### 3.4.1 Emphasis cycle

`ANNOTATION_CYCLE = [RoughAnnotation.Highlight, RoughAnnotation.Underline, RoughAnnotation.Circle]`. Each emphasized word gets `ANNOTATION_CYCLE[i % 3]` with `#e86c00`, strokeWidth=2, padding=4, 1s draw.

7 text-on-card components accept `emphasisWords`: key_statement, headline_card, quote_attribution, scrollytelling, ticker_tape, versus, before_after, quote_card. Future consolidation to `useEmphasisCycle` hook deferred to 2.6.

### 3.5 Scene-based motion hooks (`useSceneOrbit` / `useChartReveal` / `useCesiumCamera`)

In `src/lib/sceneMotion/` (sibling of `idleMotion/`). For `ChartComparison3D`, `ChartLine`, `Map3D`. Pass 1 done (`useSceneOrbit`). **Documented exception:** Passes 1/2/3 may produce <1% per-frame PNG diff.

### 3.6 Components that deviate

`BeforeAfter` (two-card with red/green tags), `QuoteAttribution` (multi-line + Georgia quotes), `CompareSplit` (two equal cards, neutral), `LocationPulse` (2D callout). Don't add another similar layout — propose new beat type + horizon.

## 3.7 Kinetic captions architecture (Sept 2026 fix)

Three files cooperate to render the bottom-of-frame word-sync captions on data-vis beats:

| File | Role |
|---|---|
| `src/MotionGraphicsVideo.tsx` | Orchestrator. Gates which beat types get captions via `shouldShowKineticCaptions()`. Mounts `<BeatKineticCaptions>` for those beats. Re-exports `useBeatContext` for back-compat. |
| `src/audio/BeatKineticCaptions.tsx` | Per-beat wrapper. Slices global `words[]` to the current beat's window. Provides `<BeatContext.Provider>` with the beat's type, text, words, start frame, and duration. Renders the typing-click SFX per word. Renders `<KineticCaptions>` inside the provider. |
| `src/KineticCaptions.tsx` | Pure visualizer. Reads `useBeatContext()` to get the active beat's words, rebases their global timestamps to local frames, and renders the highlight + past/future word cards. |

**The shared `useBeatContext` lives in `src/beats/beatContext.ts` (a leaf file).** Both `MotionGraphicsVideo.tsx` and `audio/BeatKineticCaptions.tsx` import from it; `KineticCaptions.tsx` reads from it. **Do not re-define `BeatContext` in either of the three files** — it creates a second React context the visualizer will never subscribe to, and captions silently go blank.

**Why a leaf file:** same reason as `adaptMetadata.ts` (§4.5). If the context were defined in `MotionGraphicsVideo.tsx`, the visualizer would import from the orchestrator; if defined in `BeatKineticCaptions.tsx`, the orchestrator would import from a `src/audio/` leaf. Either direction creates a TDZ-under-React-Refresh trap or a cycle. The leaf breaks both.

**`KineticCaptionsProps` props are optional** (`captionEnabledTypes?`, `beats?`, `words?`). They are only consumed in `*Test` compositions where there is no `<BeatContext.Provider>` above the visualizer. In the real composition, the wrapper provides the context and the visualizer ignores the props.

**Visible beat types** (caption gate, mirrored in both `renderBeat.tsx::CAPTION_VISIBLE_BEAT_TYPES` and `KineticCaptions.tsx::KINETIC_CAPTION_ENABLED_BEAT_TYPES` — keep in sync): `map_3d`, `chart_line`, `chart_comparison_3d`, `chart_counter`, `progress_meter`, `timeline`, `process_flow`. If you add a data-vis beat type, add it to BOTH sets.

**Root-cause-of-blank-captions check (run this when captions stop rendering):**
1. `npx tsc --noEmit | grep -E "beatContext|KineticCaption|BeatKinetic"` — must be empty.
2. Confirm `<BeatContext.Provider value={{...}}>` wraps the visualizer in `BeatKineticCaptions.tsx`.
3. Confirm the visualizer imports `useBeatContext` from `./beats/beatContext`, not from `./MotionGraphicsVideo`.
4. Confirm the orchestrator's `shouldShowKineticCaptions(beat.type)` returns true for the beat type you're rendering.
5. Confirm `words` (the full list) is non-empty in the orchestrator's props (check `public/timestamps.json`).

## 4. Type system source of truth

- Union: `src/beats/types.ts::BeatType`
- Zod schemas: `src/beats/registry.ts`
- Component mapping: `src/beats/registry.ts::getBeatComponent(type)`
- Caption gate: `src/beats/renderBeat.tsx::CAPTION_VISIBLE_BEAT_TYPES` (7 types — `map_3d`, `chart_line`, `chart_comparison_3d`, `chart_counter`, `progress_meter`, `timeline`, **`process_flow`**; process_flow reuses the Timeline component so it gets captions too). Mirrored in `src/KineticCaptions.tsx::KINETIC_CAPTION_ENABLED_BEAT_TYPES` — keep in sync.
- Support gate: `src/beats/registry.ts::isBeatTypeSupported(type)`
- Shape translator: `src/beats/adaptMetadata.ts::adaptMetadata`
- Orchestrator: `src/MotionGraphicsVideo.tsx`
- 143 unit tests: `src/beats/registry.test.ts`

**Bidirectional registry↔BeatType sync test** is load-bearing. Don't weaken it.

### 4.5 Import graph rule

`registry.ts` MUST NOT re-export from `renderBeat.tsx` and vice versa. Either direction creates a cycle.

**Why:** `registry.ts` re-exporting `adaptMetadata` from `renderBeat.tsx` worked for `npm test` (Vitest) but broke `npx remotion studio` with TDZ error under React Refresh — webpack loads `renderBeat.tsx` first, the re-export creates a live binding to a TDZ symbol, and React Refresh throws on the binding.

**Fix:** helpers shared by both layers go in own leaf file. `adaptMetadata` lives in `src/beats/adaptMetadata.ts`. Both layers import from it. Barrel can re-export for test convenience, but orchestrator must never re-export through the barrel back into itself.

**Spot future violations:** any line of form `export { X } from "./renderBeat"` in `registry.ts` (or reverse) is a regression. Same applies to `src/lib/idleMotion/index.ts` and `src/lib/sceneMotion/index.ts` re-exporting from consumers.

## 5. Audio observability (1.4 CANCELLED)

Do not reintroduce `writeAudioPlanLog` / `AudioPlanLog` / `WhooshSlot` exports in `src/lib/sceneSfx.ts`. Dead code. If needed, use wrapper-component pattern with `<AudioMountLog>` + `useEffect`, verified by full `npx remotion render`.

## 6. `remotion.config.ts` webpack fallback

`scripts/lastRenderHash.mjs` lives in `scripts/`, NOT `src/lib/` (webpack walks `src/` and would try to resolve `node:fs`/`node:crypto`). `remotion.config.ts` has `Config.overrideWebpackConfig` adding `resolve.fallback` for Node built-ins. Keep both `setChromiumOpenGlRenderer` and `setDelayRenderTimeoutInMilliseconds` calls.

## 7. Composition vs `*TestComposition` wiring

```ts
const FooTestComposition: React.FC<{ value?: number; label?: string; durationInFrames?: number }> = ({
  value = 70_000_000_000, label = "in debt", durationInFrames = 90,
}) => <Foo value={value} label={label} durationInFrames={durationInFrames} />;

<Composition id="FooTest" component={FooTestComposition} durationInFrames={90} fps={30} width={1080} height={1920} defaultProps={{...}} />
```

**Two rules:**
1. Local wrapper is `React.FC<{...}>` with optional props, NOT bare `React.FC` (Remotion 4.x runtime-checks `defaultProps` against inferred props; bare `React.FC` + extra keys throws during registration → blank Studio page).
2. Component files do NOT export `*TestComposition` returning `<Composition>`. That's dead code from an earlier iteration. Test composition lives in `Root.tsx`.

## 8. Smoke test

`./scripts/render-smoke.sh`:
1. `npm test` (143 tests, ~7s) — schema regressions
2. Hash check `v1:<hash>` vs `out/last-render.json` — cache skip if `--skip-if-unchanged`
3. `npx remotion still MotionGraphicsVideo out/smoke.png --frame=0` at 0.2× scale
4. Write `out/last-render.json` (non-fatal)

`*Test` PNGs are visual baseline. Byte-identical = correct. **Exception:** 2.3.x scene-based hooks may produce <1% diff.

Mode A note: phone `still` is slow (~2 min). 0.2× scale + 143-test pre-step keep under 2.5 min.

Smoke test does NOT catch import-graph cycles — only Studio does. Touch `registry.ts` / `renderBeat.tsx` / hook barrels → run `npx remotion studio --no-open`.

## 9. Deliberately NOT in this codebase

Stock-photo APIs, Mapbox paid tier, Lottie, `@remotion/transition`, per-mount audio observability, lifted `*TestComposition` exports, cross-barrel re-exports between `registry.ts`/`renderBeat.tsx` or hook barrels/consumers.

## 10. Open questions

See `ROADMAP.md`. Load-bearing: LLM cost ceiling, brand identity, YouTube API approval, content rights, local GPU (drives Mode A vs B).

## 11. Status summary

- **Money lens:** first 3 horizons zero-cost.
- **Render mode:** Mode A current, Mode B future.
- **Components are templates** on shared design-system primitives.
- **`useIdleMotion` shared hook** (2.3). 4/20 components done (Pass 1).
- **Scene-based hooks** (2.3.x): `useSceneOrbit` done (Pass 1); `useChartReveal`, `useCesiumCamera` pending.
- **Entrance timing:** single 50% cap, all beats (small stagger overruns OK).
- **Emphasis cycle** (2.4): 7 text-on-card components; consolidation deferred to 2.6.
- **Hook barrels are leaf files.** Smoke test doesn't catch barrel violations — Studio does.
- **No cross-barrel re-exports** between `registry.ts` and `renderBeat.tsx` (see §4.5).
- **Smoke test is unit of truth.** Green + identical PNGs = correct refactor.
- **Composition wiring** lives in `Root.tsx`, not component files.
- **Hash helper in `scripts/`**, not `src/lib/` (webpack walks `src/`).
- **Horizon 2 (incl. 2.5 design-system audit) — ✅ DONE.** 143/143 tests, byte-identical PNGs, 8 follow-ups deferred to 2.6/4.x.
- **Horizon 3 — 🟡 PARTIALLY DONE.** 3.1/3.2/3.3 ✅, 3.4 data-only (`pacing` emitted but orchestrator ignores), 3.5 dropped, 3.6 ✅ (audio-text alignment: `beat_generator.py::align_text_to_audio_window` re-derives each beat's `text` from the audio words in its frame window; original chunk preserved as `scriptText` for the LLM metadata path). Next: 4 or finish 3.4 orchestrator wiring.
- **Caption gate expanded to 7 types** (added `process_flow`).
- **Timeline events accept both `string[]` and `{date,label}[]`** — `timelineMetadata` uses `z.union([...])` to match what `BEAT_TYPE_FIELD_HINTS` in `beat_generator.py` already told the LLM to emit. `adaptMetadata` was already shape-tolerant.
- **Pipeline model** is now `gemini-3.1-flash-lite` (Google AI Studio free tier). Confirmed end-to-end on the Astra story: 15 beats, 1099 frames, 15/15 audio-text matches, smoke test green.
- **Short-form social metadata** (Sept 2026) — `script_generator.py` now asks the LLM for `youtube_title` + `youtube_description` + `tiktok_title` + `tiktok_caption` in the same JSON response. `run_pipeline.py::save_project` writes 4 plain-text files (`.txt`) plus a combined `social_metadata.json` into the per-story output dir. The .txt files are the canonical "paste-into-the-upload-form" copy; the JSON bundle is for programmatic consumers (upload script, etc.). Length guards: yt_title ≤60, yt_desc ≤200, tt_title ≤80, tt_caption ≤300 — `_validate_script` enforces them and triggers a single retry.
- **Don't run commands or edit files yourself.** (Removed in the Claude Code session — see §0.1 step 1.)