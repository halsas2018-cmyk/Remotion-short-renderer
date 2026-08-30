# Kinetic Typo Vid — Project Knowledge for AI Assistants

This file is the load-bearing context for any AI assistant (Claude, GPT, Cursor, etc.) touching this repo. Read it before suggesting any change. The "Money lens" rule and the "Components are templates" rule are non-negotiable; everything else is a guideline.

---

## 0. Read this first

- **Source of truth for project status, in-flight work, and deferred work is `ROADMAP.md`.** If a horizon / task is not in `ROADMAP.md`, do not invent it.
- **Money lens:** any change that introduces a paid API, a hosted service, or compute we don't already own must be deferred to a later horizon in `ROADMAP.md` (or a new horizon added to it). Never silently introduce spend. If a new paid dependency is genuinely required, add a new `ROADMAP.md` horizon for it with the cost model spelled out and stop there until the human signs off.
- **Components are templates, not custom code.** Every beat type is a copy-paste of `src/HeadlineCard.tsx` (text-on-card) or `src/ChartCounter.tsx` (number-on-card) on the design-system primitives in `src/design-system/index.ts`. If a new beat type needs a new layout / font / palette, that's a design-system change and belongs in a separate horizon — not in the per-type component.

---

## 0.1 How to work this repo (process rules)

1. **Don't run commands or edit files yourself.** I cannot run shell commands, edit files, or push commits. I can only suggest changes as code blocks that you paste into your editor. If I "ran" something in a previous session, treat that as a description of what was run, not something that actually happened on your filesystem.
2. **If the request is ambiguous, ask questions.** Don't guess. Don't invent files. Don't assume a file exists that I haven't seen.
3. **If a file is not in this conversation, ask me to add it to the chat.** I will not propose changes to a file based on a summary or a guess about its contents.
4. **When proposing changes, return the entire file.** Not a diff, not "the relevant section" — the whole file, in the `path/filename.ext` + ``````...```````` format from the user's system prompt. Skip / elide comments are forbidden; if a file is too long, that's a signal to split the change into multiple smaller files, not to truncate the listing.
5. **Trust the latest `*added these files to the chat*` message as the true contents of those files.** Earlier messages may contain older versions. When I have a current snapshot in the chat, use it; if a file is summarized but not added in full, ask for the full version.
6. **The smoke test is the unit of truth.** If `./scripts/render-smoke.sh` is green and the 4 `*Test` compositions are visually identical to the pre-refactor versions, the refactor is correct. Don't add unit tests for behavior that's already covered by the smoke test's `npm test` step (143 tests) unless the user asks for them.

---

## 1. Money lens (read this first)

Anything that touches a paid API, a hosted service, or compute we don't already own is **deferred to a later horizon** in `ROADMAP.md`. The first three horizons (0, 2, 3) are pure-local, zero-cost, and can be done with the tools already in the repo.

| Service | Status | Where it lives |
|---|---|---|
| Microsoft Edge TTS (free) | ✅ in use | `news_fetcher.py` |
| WhisperX (local, CPU) | ✅ in use | `news_fetcher.py` |
| Local file I/O only | ✅ in use | everywhere |
| `npx remotion render` (local Chromium) | ✅ in use | Mode A in `ROADMAP.md` |
| OpenAI `gpt-4o-mini` (paid, but tiny) | 🟡 used in Horizon 3 only | `beat_generator.py` |
| Stock-photo APIs (Pexels, Unsplash, Shutterstock) | ❌ DEFERRED | `ROADMAP.md` "What's deliberately NOT on this roadmap" |
| Mapbox / MapTiler paid tier | ❌ DEFERRED | same |
| ElevenLabs / paid TTS | ❌ DEFERRED | same |
| Managed vector + raster map APIs | ❌ DEFERRED | same |
| Real-time dashboard websocket fan-out (Pusher, Ably) | ❌ DEFERRED | same |
| Cloud storage (S3, GCS) | ❌ DEFERRED | same |
| Auto-publish to TikTok / Instagram | ❌ DEFERRED | same |
| Managed render farm (Fly.io, Hetzner, GitHub Actions paid) | 🟡 Horizon 7, Mode B only | `ROADMAP.md` Horizon 7 |
| Hosted dashboard (VPS + FastAPI + SQLite) | 🟡 Horizon 6, Mode B only | `ROADMAP.md` Horizon 6 |
| YouTube Data API v3 (free but needs OAuth approval) | 🟡 Horizon 8 | `ROADMAP.md` Horizon 8 |

**If a new feature needs something not in the ✅ or 🟡 rows, STOP. Add a new horizon to `ROADMAP.md` with the cost model spelled out, and stop there until the human signs off.**

---

## 2. Render Mode (read this first)

The pipeline runs in one of two modes. Pick the one that matches your current hardware. Source of truth is `ROADMAP.md` "Render Mode" section.

### Mode A — Phone (current, no GPU) ⭐ ACTIVE

You're building on a phone (e.g. Termux on Android). Chromium headless rendering is slow and there's no GPU. Use the Remotion Studio web UI to render in the browser.

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

### Mode B — Laptop / Desktop (later, has GPU) ⭐ FUTURE

Replace step 3 with `npx remotion render MotionGraphicsVideo out/movie.mp4` or `python -m render_batch`. Same source, same pipeline, different invocation.

**Implications for which horizon is on the critical path:** Mode A horizons are 0, 2, 3, parts of 4 (everything except 4.1), 5, and 9. Mode B adds 1, 6, 7. The auto-upload step in 8 is manual for Mode A.

---

## 3. Components are templates (load-bearing)

**This is the single most important architectural rule in this codebase.** Every beat type is a copy-paste of two canonical templates, with the per-type field set swapped out. The design-system primitives (Space Grotesk, white card with shadow + 1px border, top 4px gradient accent bar, slider border, shimmer, decorative dots, idle bounce, 3D tilt, glow pulse, `SceneTransition` wrapper, `rough-notation` emphasis, `fitText` for sizing) live in `src/design-system/index.ts` and are shared by every component.

### 3.1 The two canonical templates

- **`src/HeadlineCard.tsx`** — text-on-card template. The canonical copy-paste source for `key_statement`, `quote_attribution`, `scrollytelling`, `ticker_tape`, and any new text-heavy beat type. Uses `emphasisWords` + `@remotion/rough-notation` (Highlight / Circle / Underline cycle).
- **`src/ChartCounter.tsx`** — number-on-card template. The canonical copy-paste source for `stat_pill` and any new number / metric beat type.

### 3.2 How to add a new beat type (the only allowed pattern)

1. **Copy `src/HeadlineCard.tsx` (text) or `src/ChartCounter.tsx` (number).** Rename the component. Change only the per-type field set, the per-type Zod schema, and the per-type `defaultProps` for the test composition. Do not invent a new layout, font, palette, or animation primitive.
2. **Add the type to the `BeatType` union in `src/beats/types.ts`.**
3. **Add the per-type Zod schema + registry entry in `src/beats/registry.ts`.** Zod schema must use `.passthrough()` so the per-type fields aren't stripped (see `ROADMAP.md` 0.2 for the bug history).
4. **Add a `*TestComposition` wrapper + `<Composition>` entry in `src/Root.tsx`** so the new component can be QA'd in Studio. Use the local wrapper pattern (`React.FC<{ ... }>` that consumes `defaultProps`), NOT a `<Composition>` element inside the component file (that's dead code in this codebase).
5. **If the type is data-vis (numbers, charts, maps), keep kinetic captions visible. If text-on-card, suppress them in `src/beats/renderBeat.tsx`.** The `CAPTION_VISIBLE_BEAT_TYPES` set is the source of truth.

### 3.3 What "design system compliance" means

Every component must tick every box:

- Portrait 1080×1920 (the YouTube Shorts / TikTok / Reels target format)
- Transparent `AbsoluteFill` overlay on `PersistentBackground`
- White card with shadow + 1px `#e8e8e8` border + 28–48px border-radius
- Top 4px gradient accent bar (`#e86c00` → `#f97316`)
- `loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk`
- `fitText` for font sizing where text auto-fits
- All entrance animations complete by ~30–40% of `durationInFrames` (text beats) or ~25–30% (non-text beats — see `src/ChartCounter.tsx` for the non-text timeline)
- No exit animation inside the component — `SceneTransition` (mounted by the orchestrator's `BeatContent` wrapper) owns the entrance fade and the cross-fade to the next beat
- Idle: bounce (`sin(t) * 6px`) + 3D tilt (`sin(t*0.05) * 2deg`) + glow pulse (`1 + 0.15 * sin(t * 0.03)`), all via the shared `useIdleMotion` hook (see 3.4)
- Accent palette: `#e86c00` (orange) / `#f97316` (light orange) / `rgba(232, 108, 0, 0.4)` (glow)
- `rough-notation` from `@remotion/rough-notation` for emphasis words (Highlight → Circle → Underline cycle)
- `durationInFrames` forwarded as a prop (composition-level timing is the source of truth)
- Slider border + decorative dots + shimmer

### 3.4 The shared `useIdleMotion` hook

Every text-on-card and number-on-card component extracts its idle animation into a single hook so the 20+ components share one source of truth for the three primitives:

- **Bounce:** `translateY = bounceAmplitude * sin(frame * bounceFrequency * 2π)` (default `6` px, default `0.08` Hz, sinusoidal so it loops cleanly)
- **Tilt:** `rotateX = tiltAmplitude * sin(frame * tiltFrequency)` (default `2` deg, default `0.05` Hz)
- **Glow:** `scale = 1 + glowAmplitude * sin(frame * glowFrequency)` (default `0.15`, default `0.03` Hz)

The hook lives at `src/lib/idleMotion/useIdleMotion.ts` with a barrel re-export at `src/lib/idleMotion/index.ts`. The hook accepts `IdleMotionOptions` for per-primitive toggles (`bounce`, `tilt`, `glow`) and amplitude/frequency overrides, and returns an `IdleMotion` object:

```ts
{
  transform: "translateY(Xpx) rotateX(Ydeg) scale(Z)",  // composed string, spread into style.transform
  translateY: number,  // for components that need to compose into an existing transform
  rotateX: number,
  scale: number,
}
```

**Why three return shapes:** most components use the composed `transform` string directly on a `style={{ transform: idle.transform }}` element. But some components (e.g. `ChartCounter` and `BeforeAfter`) already own a `translate` + `rotate` for centering, so they pull out the individual `translateY` / `rotateX` fields and compose them into the existing transform string. **Never re-derive the `sin` math in a component** — always use this hook, with the right toggle, so the 20 components stay in sync.

Per-primitive toggle rules:
- Default all three to `true` when the component is in its idle phase.
- Set `glow: false` when the component already animates a separate `scale` / `opacity` on a glow sibling (e.g. the radial-blur behind the card). The two curves would compound and the glow would look wrong.
- Set `bounce: false` (or `tilt: false`) only when the component is mid-animation and the idle curve would conflict with the entrance / exit curve.

**Horizon 2.3 Pass 1 — 4 of 20 components done.** `src/HeadlineCard.tsx` ✅, `src/KeyStatement.tsx` ✅, `src/BeforeAfter.tsx` ✅, `src/ChartCounter.tsx` ✅. All four moved the three primitive lines into `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })` and the 143-test `npm test` + the `./scripts/render-smoke.sh` run (46314-byte `smoke.png`, hash `bfbbf7cdef5c…`) both stayed green. Per-file edit details:

- **`src/HeadlineCard.tsx` (Pass 1B)** — added `import { useIdleMotion } from "./lib/idleMotion";`, replaced the `cardBounceFrequency` / `cardBounceAmplitude` / `cardBounceOffset` / `cardTiltDeg` locals with a single `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })` call. The `glow: false` is required because the radial-blur glow sibling has its own `scale: glowPulse` / `opacity: glowOpacity` curves that aren't the same shape as `useIdleMotion`'s `glow` primitive (which is a `1 + 0.15 * sin(t * 0.03)`-style value); the two curves would compound. The `glowPulse` and `glowOpacity` locals stay since they animate different primitives on a different element. The card element's `translate` / `rotate` props now consume `idle.translateY` / `idle.rotateX`.
- **`src/KeyStatement.tsx` (Pass 1B)** — identical edits to `HeadlineCard`. Same import, same `useIdleMotion` call, same `glow: false` reason (the radial-blur glow sibling owns its own `glowPulse` / `glowOpacity`), same `idle.translateY` / `idle.rotateX` consumption in the card's `translate` / `rotate` props.
- **`src/BeforeAfter.tsx` (Pass 2)** — the trickier one because the inner flex row that owns the existing centering transform needs a parent/child split. Added the import. Added the `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })` call after the `isIdle` line. The existing per-card `idlePulse` local stays (it animates a different primitive — the divider's `scaleX`). The inner flex row was split into a parent/child wrapper: the outer div keeps the `top: "50%"` / `transform: "translateY(-50%)"` / `width` / `height`, the inner div gets `transform: idle.transform` plus the flex/centering/gap styles. An extra `</div>` was added before `</AbsoluteFill>` to close the new outer wrapper.
- **`src/ChartCounter.tsx` (Pass 3)** — the trickiest one because the card combines vertical centering with idle bounce in a single `transform` string. Added the import. Replaced the `cardBounceY` local with a `useIdleMotion({ bounce: isIdle, tilt: isIdle, glow: false })` call. The `idlePulse` local for the value text's scale stays (different curve, different element). The idle math was composed into the existing centering transform as `transform: \`translateY(-50%) translateY(${idle.translateY}px) rotateX(${idle.rotateX}deg)\``. `idle.scale` is intentionally NOT used because the value text has its own `idlePulse`-based scale curve.

**What's NOT in Pass 1 (the remaining 16 components):** the 6 in `src/components/` (`StatPill`, `QuoteAttribution`, `CompareSplit`, `LocationPulse`, `Scrollytelling`, `TickerTape`) and 10 more spread across the 13 pre-2.1 beat types. Pass 2 covers the 3 other wrapper-split files (the ones that own an existing transform on a parent element). Pass 3 covers the 4 other `useCurrentFrame`-owning files (the ones that own their own time math). Pass 4 covers the 2 special cases (`LocationPulse` and `Map3D`). See `ROADMAP.md` 2.3 for the full Pass 1/2/3/4 breakdown.

### 3.5 Components that deviate from the templates

There are a few components that intentionally deviate from the two canonical templates:

- **`src/BeforeAfter.tsx`** — has its own two-card layout (BEFORE + divider + AFTER), red/green tag colors, and a `Legacy/Manual/Slow/Costly` → `Modern/Automated/Fast/Efficient` decorative tag row. The deviance is the layout; the design-system primitives (card chrome, slider border, accent bar, decorative dots, idle bounce / 3D tilt / glow, `useIdleMotion` hook) are the same. The split is intentional: `before_after` needs to look like a comparison, not a single statement. **Do not add another `before_after`-style two-card layout** — if you need a comparison, use `src/BeforeAfter.tsx`. If you need a different comparison shape, propose a new beat type and a new horizon.
- **`src/components/QuoteAttribution.tsx`** — multi-line quote with a Georgia opening/closing quote marks, a separator line, and an author block. Same design-system primitives; the deviance is the quote-mark framing.
- **`src/components/CompareSplit.tsx`** — two equal cards side-by-side with neutral accent colors (no red/green framing, no Legacy/Modern tags). That's `BeforeAfter`'s job. **Do not add another `compare_split`-style two-card layout** — if you need a comparison, use `src/components/CompareSplit.tsx`. If you need a different comparison shape, propose a new beat type and a new horizon.
- **`src/components/LocationPulse.tsx`** — 2D location callout (cheaper than `src/Map3D.tsx` for "just point at a place" beats). Same design-system primitives; the deviance is the 2D map visualization.

All other components (13 pre-2.1 beat types) are pending the 2.3 idle-motion refactor.

---

## 4. Source of truth for type system

The beat type system is the load-bearing invariant. The 20 registered types are in:

- **The union:** `src/beats/types.ts::BeatType` (a `const` tuple cast to a union).
- **The Zod schemas:** `src/beats/registry.ts` (one per type).
- **The component mapping:** `src/beats/registry.ts::getBeatComponent(type)` (one per type).
- **The "is this a data-vis beat" gate:** `src/beats/renderBeat.tsx::CAPTION_VISIBLE_BEAT_TYPES` (6 types: `chart_line`, `chart_counter`, `chart_pie`, `map_3d`, `progress_meter`, `timeline`).
- **The "is this beat type supported" gate:** `src/beats/registry.ts::isBeatTypeSupported(type)`.
- **The shape translator:** `src/beats/registry.ts::adaptMetadata(type, metadata)` (calls `src/beats/renderBeat.tsx::adaptMetadata` under the hood — it's re-exported from the registry barrel for test convenience).
- **The orchestrator:** `src/MotionGraphicsVideo.tsx` (composes the 20 beat types into a single video via `<Sequence from={…}>` + `<SceneTransition>` wrapper).
- **The 143 unit tests:** `src/beats/registry.test.ts` — covers per-type Zod validation, `getBeatComponent` / `isBeatTypeSupported` / registry↔BeatType sync, `shouldShowKineticCaptions`, `adaptMetadata`, and `PerBeatSchema` / `TimedBeatsSchema` path-preservation. The 143-test pass is the first step of `./scripts/render-smoke.sh`; a failure there means the schema broke and the smoke test won't even try to render.

**The bidirectional registry↔BeatType sync test** (`[...Object.keys(registry)].sort() === [...BeatType].sort()`) is the load-bearing guard against the "added the type but forgot the entry" / "added the entry but forgot the type" class of bug. Do not weaken this test. If a new type breaks it, fix the registry and the union together.

---

## 5. Audio observability (Horizon 1.4 — CANCELLED, do not re-litigate)

The audio streams (narration, ambient, per-transition whoosh, per-word click) are observable through the React tree itself. Per-mount `console.log` lines from inside the audio components are not feasible during a `still` render because Remotion's `still` path never commits the React tree (it just reads `calculateMetadata` and renders a frame).

The file-based `out/audio-mounts.log` plan was implemented (commits cd656a1 and earlier) and then dropped. The `process.versions.node` guard was unreliable in the render context (Remotion shims `process` but `process.versions.node` is `undefined`), and webpack's static analysis reached dynamic `require()` calls even behind `(0, eval)("require")("fs")` idioms. The fix was to drop the entire 1.4 surface area.

**If a future horizon needs per-mount audio observability, write the per-mount log lines from inside a wrapper that the orchestrator mounts unconditionally (e.g. a sibling `<AudioMountLog>` with `useEffect`) and gate the verification on a full `npx remotion render` smoke test, not on `npx remotion still`.**

**Do not reintroduce `writeAudioPlanLog` / `AudioPlanLog` / `WhooshSlot` exports in `src/lib/sceneSfx.ts`.** They are dead code. If a future horizon needs to log the audio plan, it must use the wrapper-component pattern above, not a side-channel `fs.writeFileSync` call.

---

## 6. The 0.5 hash helper and `remotion.config.ts` webpack fallback

The `scripts/lastRenderHash.mjs` helper lives in `scripts/`, NOT `src/lib/`. Webpack's bundle input is rooted at `src/Root.tsx`; it walks every sibling `.ts` file in any imported directory. The first attempt put the helper in `src/lib/`, and webpack discovered it via the directory walk even though nothing imported it — and then tried to resolve `node:fs` / `node:crypto` in a browser context, failing with "Module not found: Error: Can't resolve 'fs'".

As a defense-in-depth, `remotion.config.ts` calls `Config.overrideWebpackConfig((current) => ...)` to add a `resolve.fallback` map that tells webpack: "when you see an import of `fs` (or any of the other Node built-ins we know are bogus in a browser context), replace it with `false`". This silently drops accidental `node:*` imports inside `src/` instead of failing the build.

**The `remotion.config.ts` file must keep both `Config.overrideWebpackConfig` and the two `setChromiumOpenGlRenderer` / `setDelayRenderTimeoutInMilliseconds` calls.** The chromium settings are for headless rendering (Mode B); the webpack fallback is for browser bundle safety. The order in the file matters: the fallback's `resolve.fallback` is the spread of `current.resolve?.fallback`, not a full replacement, so Remotion's own fallbacks are preserved.

---

## 7. Composition vs. *TestComposition wiring in `Root.tsx`

The established pattern for the 9 `*Test` compositions:

```ts
// Local wrapper in Root.tsx — consumes defaultProps, returns the component with them applied
const FooTestComposition: React.FC<{ value?: number; label?: string; durationInFrames?: number }> = ({
  value = 70_000_000_000,
  label = "in debt",
  durationInFrames = 90,
}) => {
  return <Foo value={value} label={label} durationInFrames={durationInFrames} />;
};

// Then in RemotionRoot:
<Composition
  id="FooTest"
  component={FooTestComposition}
  durationInFrames={90}
  fps={30}
  width={1080}
  height={1920}
  defaultProps={{
    value: 70_000_000_000,
    label: "in debt",
    durationInFrames: 90,
  }}
/>
```

**Two non-obvious rules:**

1. The local wrapper is `React.FC<{...}>` (with the optional props), NOT bare `React.FC` (no props). The `<Composition>`'s `defaultProps` are runtime-checked against the component's inferred prop shape in Remotion 4.x; a bare `React.FC` (inferred props = `{}`) plus `defaultProps` with extra keys throws during composition registration and breaks the entire `RemotionRoot` mount → blank Studio page. The fix is to make the local wrapper actually accept the props it forwards.
2. The component file (`src/Foo.tsx`) does NOT export a `FooTestComposition` that returns a `<Composition>` element. That pattern was a dead-code artefact from an earlier iteration. The component file exports only the component itself; the test composition lives in `Root.tsx`. **Do not reintroduce `export const FooTestComposition: React.FC = () => <Composition ... />` in the component file.** It is never imported and the `<Composition>` element inside it is never registered, so it's pure dead code that confuses future readers.

---

## 8. The smoke test is the unit of truth

`./scripts/render-smoke.sh` is the single command that gates every change:

1. Runs `npm test` (the 143-test suite in `src/beats/registry.test.ts`). This is fast (~7s) and catches schema regressions before the render step. If it fails, the script prints `==> FAIL: registry unit tests failed. Fix before re-running smoke test.` and exits 1.
2. Computes the SHA-256 of `public/beats.json` + `public/timestamps.json` in bash, compares it to `out/last-render.json`. If they match AND `--skip-if-unchanged` is passed, exits 0 in <1s without re-rendering. The cache key is `v1:<hash>` prefixed so a future schema bump invalidates every old cache in one place.
3. Otherwise, runs `npx remotion still MotionGraphicsVideo out/smoke.png --frame=0` (or a configured representative frame) at 0.2× scale and asserts the output is non-trivial in size (the canonical 46314-byte `smoke.png`).
4. Writes `out/last-render.json` via `writeLastRenderHash` (non-fatal: a failed cache write prints `==> WARN: …` and the render still exits 0).

**The smoke test's `*Test` PNGs are the visual baseline.** A refactor of a component must keep the `*Test` PNGs visually identical to the pre-refactor versions. If a refactor changes the PNG output, the refactor changed visible behavior and is wrong, even if `npm test` still passes.

**Mode A note:** `./scripts/render-smoke.sh` runs `npx remotion still` which uses Chromium headless. On the phone, this is slow (~2 minutes). The 0.2× scale + the 143-test pre-step keep it under 2.5 minutes total.

---

## 9. What's deliberately NOT in this codebase

- **Stock-photo APIs.** `image_card` is deferred to Horizon 4.x (which itself needs a GPU). Use the curated `assets/hero/` fallback (4.1) or render without a hero image.
- **Mapbox / MapTiler paid tier.** The current `Map3D` uses 3D voxel renderers that don't need map tiles.
- **Lottie.** Removed in 2.1.x. Use Lucide icons via `src/IconText.tsx`.
- **`@remotion/transition`.** Removed. Cross-fades are owned by the orchestrator's `<SceneTransition>` wrapper, not a TransitionSeries.
- **Per-mount audio observability.** Cancelled (1.4). If you need it, use a wrapper-component pattern, not a side-channel log.
- **Lifted `*TestComposition` exports from component files.** Dead-code artefact from an earlier iteration. The test composition lives in `Root.tsx`, not in the component file.

---

## 10. Open questions

See `ROADMAP.md` "Open Questions" section. The load-bearing ones:

1. LLM cost ceiling (default: stay on `gpt-4o-mini`, < $0.01/day).
2. Brand identity (`S-NEWS` placeholder or permanent?).
3. YouTube Data API approval (start the application process now if you haven't).
4. Content rights (confirm news sources allow derivative video content).
5. Local GPU available? (Drives Mode A vs Mode B for Horizons 1, 4.1, 6, 7.)

---

## 11. Summary

- **Money lens:** no paid APIs / hosting / managed services in the first 3 horizons. Anything that costs money goes in a later horizon in `ROADMAP.md` with the cost model spelled out.
- **Render mode:** Mode A (phone, browser render) is current. Mode B (laptop, CLI render) is the future.
- **Components are templates:** every beat type is a copy-paste of `src/HeadlineCard.tsx` or `src/ChartCounter.tsx` on the design-system primitives. New layouts / fonts / palettes belong in a separate horizon, not in the per-type component.
- **`useIdleMotion` is the shared idle-animation hook** (Horizon 2.3). It returns `{ transform, translateY, rotateX, scale }` with per-primitive toggles. Every card component uses it; the 4 components updated in 2.3 Pass 1 are `HeadlineCard`, `KeyStatement`, `BeforeAfter`, `ChartCounter`. The 16 remaining components (Passes 2-4) are still to be done.
- **Smoke test is the unit of truth:** `./scripts/render-smoke.sh` runs `npm test` (143 tests) + a 0.2×-scale `npx remotion still` + writes the `out/last-render.json` cache. Green smoke + identical `*Test` PNGs = correct refactor.
- **Composition wiring in `Root.tsx`:** local `React.FC<{...}>` wrapper that consumes `defaultProps` + a single `<Composition>` entry. Component files do NOT export `*TestComposition`; the test composition lives in `Root.tsx`.
- **The 0.5 hash helper is in `scripts/`, not `src/lib/`.** Webpack's directory walk would discover it in `src/lib/` and try to resolve `node:fs` / `node:crypto` for the browser bundle. The `remotion.config.ts` webpack fallback is a defense-in-depth against the same class of bug.
- **Don't run commands or edit files yourself.** I can only suggest changes as code blocks.
