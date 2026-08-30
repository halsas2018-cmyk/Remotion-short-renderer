# Kinetic Typo Vid — Project Documentation

## Overview
Automated pipeline for creating YouTube Shorts from news stories.  
**Phase 1 (Python) — COMPLETE**: Discover → Research → Script → Voice → Word Timestamps → Beats (visual plan).  
**Phase 2 (Remotion) — COMPLETE**: Render beats + narration into final MP4.

---

## Render Mode (read this first)

The pipeline runs in one of two modes. **Pick the one that matches your current hardware.**

### Mode A — Phone (current, no GPU) ⭐ ACTIVE
You're building on a phone (e.g. Termux on Android). Chromium headless rendering is slow and there's no GPU. **Use the Remotion Studio web UI to render in the browser.**

The Python pipeline runs to completion and drops the four files in `public/`. Then you open the Studio in a browser and click "Render". The browser does the actual video encoding (Chrome's MediaRecorder / WebCodecs), which is GPU-accelerated and fast.

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

---

## Render Data (single-folder input)

The renderer reads **four** files at composition-mount time. Drop them in `public/` and render (in Studio or via CLI). No code change required.

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

To render a different story, copy the four files above into `public/` and render. The `*Test` compositions in Studio still use hard-coded `defaultProps` (no fetch needed).

---

## Design System Rules (read this — every new component must follow these)

**These rules are non-negotiable. They define what the library LOOKS LIKE and what is shared between all 13+ beat components. The current component library was audited and conforms; the new components built under Horizon 2 (HeadlineCard, QuoteAttribution, etc.) MUST conform too.**

1. **Output format: portrait 1080×1920.** Every composition is `width=1080 height=1920`. This is YouTube Shorts / TikTok / Reels format. `MotionGraphicsVideo` and every `*Test` composition in `Root.tsx` set these dimensions. Do not introduce 1920×1080 (16:9) compositions — they break the visual contract.
2. **Components are transparent overlays on `PersistentBackground`.** Every beat component's outer wrapper is `<AbsoluteFill style={{ backgroundColor: "transparent" }}>`. The orchestrator mounts `PersistentBackground` once at the root, so the background scrolls/animates continuously across all beats and through cross-fades. **Never** draw a solid background inside a beat component — it will cover `PersistentBackground` and break the design.
3. **Every component draws a white card.** The card is `backgroundColor: "white"`, with `box-shadow: 0 12px 40px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06)`, a 1px `#e8e8e8` border, and a 28–32px border radius. The card sits centered on the canvas and is the only place where the component's content (text, icons, charts) lives. Padded internally with `cardPadding = max(48, width * 0.044)`.
4. **Every card has a top accent bar.** A 4px gradient bar (`linear-gradient(90deg, #e86c00, #f97316)`) is positioned `top: 0, left: 0, right: 0` with the card's top corners rounded to match the border-radius. This is the visual "signature" of the library — without it, components feel like they belong to a different project.
5. **Decorative sliders, dots, and shimmer sit on the card.** Each card is wrapped in a `position: relative` parent that has a `position: absolute, inset: -sliderPadding` child with a 5px `#1a1a1a` border (`sliderBorderRadius = cardBorderRadius + 24`). The slider draws on at `sliderStart = textEndFrame` (so the beat's text lands first, the slider confirms it). Three accent dots (`<AccentDot size=6/8/6>`) sit at the top of the card, three at the bottom. A vertical shimmer gradient sweeps over the card during idle.
6. **Idle motion: bounce + 3D tilt + glow pulse.** When `frame > textEndFrame`, the card translates `sin(t) * 6px` (slow bounce) and rotates `sin(t * 0.05) * 2deg` around the X axis. The glow behind the card scales `1 + 0.15 * sin(t * 0.03)` and pulses opacity `0.6 + 0.2 * sin(t * 0.05)`. Emphasized words do a faster bounce (`sin(t) * 8px`) + slight float + idle scale pulse.
7. **No exit animation. `SceneTransition` owns entry + cross-fade.** Each beat's component draws its entrance animation (fade + spring pop) and then **holds** through the idle phase. The orchestrator's `<SceneTransition>` produces the entrance fade, the exit fade, and the cross-fade between adjacent beats. Components must NOT animate themselves out at the end of their beat — that double-fades and looks like a glitch. The last beat is the only exception (no outgoing transition, so the closing fade-out is `SceneTransition`'s alone).
8. **30–40% entrance rule.** All entrance animations (card pop, word-by-word reveal, accent dots, slider draw) MUST complete by 30–40% of the beat's `durationInFrames`. After that, the beat sits at rest in the idle phase. This is so the viewer has time to read the beat's content. The only motion during idle is the subtle bounce/tilt/glow described in rule 6.
9. **Space Grotesk via `@remotion/google-fonts/SpaceGrotesk`.** Every text component loads the same font with `weights: ["500", "700"]` and `subsets: ["latin"]`. Use `loadFont` (the `@remotion/google-fonts` API), not the `loadFont` exported from `remotion` (that one doesn't exist on this Remotion version). The Google Font package blocks rendering until the font is ready, so the layout doesn't jitter.
10. **Accent palette: `#e86c00` (dark) / `#f97316` (light) / `rgba(232, 108, 0, 0.4)` (glow).** Use `#e86c00` for the gradient stop, `#f97316` for emphasis rings, and the 0.4-alpha for glow halos. Emphasis-word gradient text uses `linear-gradient(120deg, #e86c00, #f97316)` with `WebkitBackgroundClip: "text"`.
11. **`rough-notation` from `@remotion/rough-notation`, not `rough-notation`.** The `Highlight` / `Circle` / `Underline` components live in `@remotion/rough-notation` (the Remotion wrapper) — they are React components, not classes you instantiate. Use them like `<Highlight color="…" strokeWidth={3} padding={6} progress={0..1}>{children}</Highlight>`. The `progress` prop is the new addition Remotion's wrapper has that the upstream `rough-notation` does not. Cycle `Highlight` → `Circle` → `Underline` per emphasized word so a list of emphasis words doesn't look uniform.
12. **Responsive sizing: `fitText` + `measureText` from `@remotion/layout-utils`.** Never hand-tune a font size. Use `fitText({ text, withinWidth, fontFamily, fontWeight }).fontSize` for the cap, then `Math.min(responsiveMax, fittedSize * 0.85)` for the base, and `fittedSize` directly for emphasis. `KeyStatement`, `VersusCard`, and `BeforeAfter` are the reference implementations.
13. **`durationInFrames` is forwarded as a prop.** Every beat component accepts `durationInFrames: number` as an optional prop override that falls back to `useVideoConfig().durationInFrames`. The orchestrator passes `beat.durationInFrames` so internal timing percentages scale with the beat's actual length. Components MUST NOT assume a fixed-duration composition.

**Why these rules exist:** the 13 beat types in the registry are mostly cosmetic variants of three primitives (text-over-card, bar/number, 3D scene). The visual contract above is what makes them feel like one design system instead of 13 different prototypes. Any component that diverges from it (wrong aspect ratio, solid background, hand-tuned font size, no card chrome, its own exit animation) breaks the library.

**Audit checklist for a new component** (tick before merging):
- [ ] `width=1080 height=1920` in the Composition
- [ ] Outer wrapper `<AbsoluteFill style={{ backgroundColor: "transparent" }}>`
- [ ] White card with shadow + border + border-radius
- [ ] Top 4px gradient accent bar
- [ ] `loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk`
- [ ] `fontSize = Math.min(maxSize, fitText(...).fontSize * factor)` for both base and emphasis
- [ ] All entrance animations complete by `Math.round(durationInFrames * 0.4)`
- [ ] NO exit animation inside the component
- [ ] `SceneTransition` is mounted by the ORCHESTRATOR (`BeatContent`), not the component itself
- [ ] Idle: bounce (`sin(t) * 6px`) + 3D tilt (`sin(t*0.05) * 2deg`) + glow pulse (`1 + 0.15 * sin(t*0.03)`)
- [ ] Accent palette: `#e86c00` / `#f97316` / `rgba(232, 108, 0, 0.4)`
- [ ] Emphasis words cycle `Highlight` → `Circle` → `Underline` from `@remotion/rough-notation`

---

## Phase 1 (Horizon 0) — Renderer Hardening — ✅ COMPLETE

Goal: lock in stability of the render pipeline before adding new features. Everything is local, no APIs, no hosting, no spend. **Horizon 0 is now complete** (commits a73dd19 for 1.1, 78e3f69 for 1.2, then a series of commits for 1.3, 1.4-cancelled, 1.5). Next up: Horizon 2 (component coverage + visuals).

### 1.1 — Hard error when a render data file is missing — ✅ DONE

**Before this change:** if `public/beats.json` was missing, `Root.tsx::renderDataCalculateMetadata` returned `durationInFrames: 1` and the user got a useless 1-frame MP4 with no error message.

**After this change:** if any of the two JSON files is missing, returns non-2xx, has invalid JSON, or fails top-level Zod validation, `renderDataCalculateMetadata` **throws** an `Error` whose message identifies the exact file and field that failed. Remotion surfaces the error in the render log and aborts the render. The orchestrator no longer produces a silent 1-frame video on missing data.

**What changed:**
- `src/Root.tsx`:
  - Added Zod schemas `TimedBeatsSchema` (top-level fields) and `WordSchema` (per-word fields). At this stage `beats` items inside the array are still `z.unknown()` — per-beat validation lands in 1.2.
  - Replaced the silent fallback with a `fetchRenderData` helper that THROWS on missing files, non-2xx responses, JSON parse errors, or top-level schema validation failures. The `AbortError` path (Studio prop change mid-fetch) still returns `null` so it doesn't spam the log.
  - The error helper `RenderDataError` prefixes the message with `[MotionGraphicsVideo]` and includes the HTTP status, the Zod issue path, or the underlying error message so the failure is self-explanatory in the render log.
- `scripts/render-smoke.sh` (new): a single-frame smoke test that renders frame 60 of `MotionGraphicsVideo` at 0.2× scale and asserts the output PNG exists and is non-trivial in size. If beats.json / timestamps.json are missing, the smoke test fails fast with the new error message in the render log.
- This doc entry (1.1) added.

**How to verify:**
```bash
./scripts/render-smoke.sh
# Should print "OK: smoke render produced NNN-byte PNG at out/smoke.png"
# If beats.json is missing, the script will print the [MotionGraphicsVideo]
# error and exit non-zero.
```

**Manual negative test (optional):**
```bash
mv public/beats.json public/beats.json.bak
./scripts/render-smoke.sh
# Should print something like:
#   [MotionGraphicsVideo] public/beats.json fetch failed: HTTP 404 Not Found.
#   Make sure the file exists in /public and is readable.
# and exit non-zero.
mv public/beats.json.bak public/beats.json
```

### 1.2 — Validate per-beat `metadata` shape with Zod — ✅ DONE

**Before this change:** `Root.tsx` checked the top-level fields (`fps`, `totalDurationInFrames`, `beats`) but each `beats[i]` was `z.unknown()`. If Python produced a beat with the wrong metadata shape (e.g. `key_statement.emphasisWords` was a number instead of a string array, or `icon_text.icon` was missing), the user got a render-time crash deep inside `KeyStatement` / `IconText` with no hint about which field was wrong.

**After this change:** each `beats[i]` is validated against its per-type Zod schema in `src/beats/registry.ts` BEFORE the orchestrator runs. Failures throw with a path like `beats[1].icon: Invalid input` or `beats[3] (type=key_statement) failed schema validation: emphasisWords must be an array, got number` so the user knows exactly which Python output line is wrong.

**What changed:**
- `src/beats/types.ts`:
  - Added `PerBeatSchema` (uses `z.object(beatBaseShape).passthrough().superRefine(...)`) that dispatches to the matching per-type Zod schema in `src/beats/registry.ts` and **forwards the underlying Zod issues into the parent validation context**, preserving the original field path (e.g. `["icon"]`) so the user-facing error reads `beats[1].icon: Invalid input` rather than `beats.1.metadata: [opaque message]`.
  - **`.passthrough()` is required** — without it, Zod's default `z.object` strips unknown keys, so the per-type schema never sees `icon`/`left`/`right`/`events`/`steps` and always fails on the first per-type field.
  - If `type` is unknown (no registry entry), the error is `beats[i].type: unknown beat type "foo". Add a registry entry in src/beats/registry.ts.`
  - `TimedBeatsSchema` (the top-level schema) now wraps `beats: z.array(PerBeatSchema).min(1)` so each beat is validated.
  - Added `WordSchema` (per-word: `word: z.string(), start/end: z.number().nonnegative()`) and `WordListSchema = z.array(WordSchema).nonempty()`. Used by `Root.tsx` for top-level `timestamps.json` validation. Per-word dedupe of overlapping / zero-duration words is NOT yet done — that's 1.3.
- `src/beats/registry.ts`:
  - Exposed `getBeatSchemas(type)` returning `{ beatSchema }` so `types.ts` can call `safeParse(beat)` inside its `superRefine` and inspect the per-issue `path`/`message` instead of relying on Zod's default opaque `custom` issue.
  - Each per-type schema (e.g. `iconTextMetadata`) now lives as a top-level `ZodTypeAny` in the registry entry, so the same schema is shared between runtime validation (this task) and the registry's `validateBeatMetadata()` helper used by `BeatContent` in the orchestrator.
  - The schema name was renamed from `*Metadata` (e.g. `iconTextMetadata`) to `beatSchema` in the registry entry to make it clear it validates the WHOLE beat (top-level), not just the metadata sub-object. The Python pipeline puts per-type fields at the top level (no `metadata` wrapper).
- `src/Root.tsx`:
  - `fetchRenderData` now imports `TimedBeatsSchema` and `WordListSchema` from `src/beats/types.ts` (not the local one in `Root.tsx`). The behavior is the same: a Zod failure throws with the first issue's `path` and `message`.
- `scripts/render-smoke.sh`: unchanged, still renders 1 frame at 0.2× scale.

**How to verify:**
```bash
./scripts/render-smoke.sh
# Should print "OK: smoke render produced NNN-byte PNG at out/smoke.png"

# Negative test: corrupt a per-beat field and confirm the error is clear
sed -i 's/"icon": "store"/"icon": 42/' public/beats.json
./scripts/render-smoke.sh
# Should print:
#   [MotionGraphicsVideo] public/beats.json failed schema validation
#   at "beats.1.icon": Invalid input: expected string, received number
# and exit non-zero.
git checkout public/beats.json
```

### 1.3 — Validate per-word shape + dedupe overlapping/zero-duration words — ✅ DONE

**Before this change:** `WordListSchema.safeParse` accepted any array of `{word, start, end}` objects, including ones with `end === start` (zero-duration) or `word[i+1].end <= word[i].end` (overlapping — WhisperX sometimes produces both). Both caused the kinetic-caption highlight to flicker or get stuck on the wrong word because `findCurrentWordIndex` could find two indices for the same local frame.

**After this change:** the parsed `words[]` is run through a new `dedupeOverlappingWords()` helper in `src/beats/words.ts` before being injected into `props.words`. Overlapping and zero-duration entries are dropped. A `console.warn` line lists how many words were dropped so the user knows the Python pipeline produced bad timestamps.

**What changed:**
- `src/beats/words.ts` (new helper):
  - `dedupeOverlappingWords(words): { words: Word[]; dropped: number }` — pure function (no side effects). Rule 1: drop if `end <= start`. Rule 2: drop if the previous kept word's `end >= this word's end` (later contained/duplicate entry).
  - Ties (when `word[i+1].end === word[i].end`): the LATER word is dropped. This matches what `KineticCaptions::findCurrentWordIndex` does anyway (it returns the FIRST matching word), so dropping the later one is the no-op-safe choice.
- `src/Root.tsx`:
  - `fetchRenderData` calls `dedupeOverlappingWords(wordsParsed.data as unknown as Word[])` after Zod parsing. If `dropped > 0`, it emits a `console.warn` of the form:
    ```
    [MotionGraphicsVideo] public/timestamps.json had N overlapping or zero-duration word(s); dropped them to keep the kinetic captions in sync. Original count: N, cleaned count: M. Check the WhisperX alignment step in the Python pipeline.
    ```
- `scripts/render-smoke.sh`: unchanged.

**How to verify:**
```bash
./scripts/render-smoke.sh
# Should print "OK: smoke render produced NNN-byte PNG at out/smoke.png".
# If the production timestamps.json has WhisperX junk, the warn line
# will appear above the render line in the studio/render log.

# Negative test: inject a synthetic overlapping + zero-duration word
# into public/timestamps.json and confirm the warning appears.
python3 -c '
import json, copy
data = json.load(open("public/timestamps.json"))
# Inject a zero-duration entry at index 10 and an overlap at index 20.
data.insert(10, {"word": "junk", "start": 5.0, "end": 5.0})
data[20]["end"] = data[19]["end"]  # make it overlap the previous
json.dump(data, open("public/timestamps.json.bak", "w"))
'
# (use whatever non-destructive copy/edit you prefer; the point is
# to confirm the warning is logged at render time)
```

### 1.4 — Audio plan log written to `out/audio-mounts.log` — ~~CANCELLED~~ (was also 0.4)

The original 1.4 spec called for a file-based audio plan log that the smoke test would assert on. After two implementation attempts and a deep dive into the failure modes, **both 1.4 and Horizon 0.4 (the per-mount `console.log` lines it was meant to replace) were cancelled**. The orchestration works fine without the side-channel log: the audio streams (narration, ambient, per-transition whoosh, per-word click) all mount correctly because they live in the React tree, not in a side-channel log. Full reasoning lives in `ROADMAP.md` ("What's already done" and "0.4" / "1.4" entries). The takeaway:

- **0.4 was unworkable from the start.** Every attempt to emit a per-mount `[audio] <label> src=… volume=… frames=[from, to) <meta>` `console.log` line on `<Audio>` mount failed during a `still` (single-frame) render. We tried four mechanisms: `onMount` on `<Audio>`, `useEffect(..., [])` in a sibling `<AudioMountLog>`, `useState(() => logAudioMount(...))` initializer, and `useRef(false)` + direct log in the function body. **All four produced zero output.** Remotion's `still` command uses a render-only code path that bypasses the React lifecycle entirely — it just reads the composition dimensions and renders a frame using the `calculateMetadata`-supplied data, without committing the tree. So the function body of the components isn't even invoked. There is no place inside the React tree from which to emit a per-mount log line during a `still`.
- **1.4 was the file-based replacement for 0.4.** We pivoted to computing the audio plan in `Root.tsx::renderDataCalculateMetadata` (whoosh slots + click count, mirroring the orchestrator's layout) and appending one JSON line per render to `out/audio-mounts.log` via `fs.appendFileSync`. The smoke test would read the file and assert one valid JSON line was present. The implementation shipped behind a `process.versions.node` guard, but that guard was unreliable: Remotion's render context shims `process` (so `process.env` etc. work) but `process.versions.node` is `undefined`. The cache file was never written in practice. The two `remotion.config.ts` workarounds (`resolve.fallback: { fs: false, ... }` and moving the helper to `scripts/`) were enough to keep the render working, but the actual `writeAudioPlanLog` call still failed at runtime.
- **Final fix:** drop the entire 1.4 surface area. `src/lib/sceneSfx.ts` no longer exports `writeAudioPlanLog` / `AudioPlanLog` / `WhooshSlot`; `Root.tsx` no longer computes or writes the audio plan; `scripts/render-smoke.sh` no longer asserts on `out/audio-mounts.log` (exit code 3 is gone). The orchestrator's audio streams are still observable through the React tree itself; per-mount observability would be a future horizon (likely tied to a real `npx remotion render` smoke test, not `still`).
- **Do not re-litigate 0.4 / 1.4.** If a future horizon (e.g. 9.x CI) needs per-mount audio observability, write the per-mount log lines from inside a wrapper that the orchestrator mounts unconditionally and gate the verification on a full `npx remotion render` smoke test, not on `npx remotion still`. The `still` path will never produce per-mount logs.

### 1.5 — Cache the last-render composition hash — ✅ DONE

**Before this change:** every `scripts/render-smoke.sh` invocation re-ran `npx remotion still` even if beats.json + timestamps.json were byte-for-byte identical to the previous run. That costs ~2 minutes per duplicate render.

**After this change:** `scripts/render-smoke.sh --skip-if-unchanged` computes a SHA-256 of the canonical input pair (beats bytes ‖ words bytes, no separator) and compares it to the hash stored in `out/last-render.json` from the previous successful render. If they match, it prints a SKIP message and exits 0 without re-running `remotion still`.

**What changed:**
- New pure helper `scripts/lastRenderHash.mjs` (NOT in `src/lib/` — see the move note below) exports `computeLastRenderHash(beatsJson, wordsJson)`, `readLastRenderHash(outDir)`, `writeLastRenderHash(outDir, hash, extras?)`, and a `LAST_RENDER_HASH_VERSION` constant. Uses `node:crypto`'s built-in `sha256` (no new dependency).
- Canonical input is the raw bytes of `public/beats.json` + `public/timestamps.json` concatenated with **NO separator** (matches what `cat beats.json timestamps.json | sha256sum` produces on the bash side). The hash is prefixed with `v<version>:` so future schema changes are backwards-incompatible by design — bump the version in one place to invalidate every old cache.
- `scripts/render-smoke.sh --skip-if-unchanged` now:
  1. Computes the SHA-256 of the input pair in bash and delegates the cache read to a Node one-liner that `import()`s the helper module. Schema parity is enforced by reusing the helper's `LAST_RENDER_HASH_VERSION` constant.
  2. If the cache matches, prints `==> SKIP: input hash matches v1:<hash> (rendered <ISO>)` and exits 0 without re-rendering.
  3. If the cache is missing, malformed, or stale-version, falls through to the render path (never fails on a missing cache — fresh checkouts just render).
  4. After a successful render, writes `out/last-render.json` via `writeLastRenderHash`. The write is non-fatal: a failed cache write prints `==> WARN: …` and the render still exits 0.
- **What is NOT in the cache key** (intentional): `public/narration.mp3` and `public/sfx-ambient.mp3`. The visible output is fully determined by beats + words, and MP3 mtime+size is not a useful content hash (TTS re-exports produce different mtimes for identical bytes). If you change a SFX mapping in `sceneSfx.ts` in a way that affects the visible render, bump `LAST_RENDER_HASH_VERSION` to invalidate all old caches automatically — the version prefix on the cached hash is compared on every read, and stale-version records are treated as "no cache" and fall through to a fresh render.
- **The helper lives under `scripts/`, not `src/lib/`** (commit 7be612b). Webpack's bundle input is rooted at `src/Root.tsx`; it walks every sibling `.ts` file in any imported directory. The first attempt put the helper in `src/lib/`, and webpack discovered it via the directory walk even though nothing imported it — and then tried to resolve `node:fs` / `node:crypto` in a browser context, failing with "Module not found: Error: Can't resolve 'fs'". Moving to `scripts/` puts the file outside the bundle's input graph entirely. As an additional safety net, `remotion.config.ts` sets `resolve.fallback: { fs: false, path: false, crypto: false, ... }` so any future accidental `node:*` import inside `src/` is silently dropped from the browser bundle instead of failing the build.
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

---

## Phase 2: Horizon 2 — Component Coverage + Better Visuals — ⭐ ACTIVE

Goal: extend the beat-type library with the visual vocabulary needed for news stories that aren't finance / tech. The work is structured as a priority-ordered list of new beat types in `ROADMAP.md` § 2.1, each one a copy-paste of the `KeyStatement` / `HeadlineCard` design pattern.

### 2.1 — `headline_card` (big-text intro beat for the story hook) — ✅ DONE

**Before this change:** stories opened with a `key_statement` beat — a smaller-text card on the white-card design system. The first 1.5–2s of every video felt like a regular beat instead of a story hook. There was no way to mark the opening of a story as a distinct visual moment.

**After this change:** a new `headline_card` beat type renders a much-larger headline on the same white-card chrome as the rest of the library, with cycling `Highlight` / `Circle` / `Underline` annotations on emphasis words, a 30–40% entrance rule, a slider border, shimmer, and the standard idle bounce / 3D-tilt / glow-pulse. The Python pipeline can now emit `{"type": "headline_card", ...}` for the story hook and the orchestrator picks the right component automatically.

**What changed:**
- `src/HeadlineCard.tsx` (new) — the component. Mirrors `KeyStatement.tsx` line-for-line on the design-system primitives (font, accent palette, card chrome, slider, shimmer, decorative dots, idle motion, 30–40% entrance rule) and only changes the headline sizing math (slightly larger `baseFontSize` / `emphasisFontSize` caps and no `exitDirection` prop).
- `src/beats/types.ts` — added `"headline_card"` to the `BeatType` union.
- `src/beats/registry.ts` — added a `headlineCardMetadata` Zod schema (`{type, text, startFrame, durationInFrames, endFrame?, emphasisWords?, backgroundColor?, accentColor?, textColor?}`) and a registry entry mapping `headline_card` → `HeadlineCard`. Colour fields are all optional so the Python pipeline can omit them and let the component fall back to the default palette.
- `src/Root.tsx`:
  - `HeadlineCardTest` test composition (portrait 1080×1920, 120 frames, default `text: "The gamble works while AI chips are scarce"`, `emphasisWords: ["gamble", "scarce"]`).
  - `KeyStatementTest` test composition added at the same time (same defaults) so the two components can be diffed side-by-side in Studio.
- `src/MotionGraphicsVideo.tsx` — unchanged. The orchestrator looks up the component by `beat.type` via `getBeatComponent(type)` from the registry, so adding a new beat type needs no orchestrator change.
- `src/SceneTransition.tsx` — unchanged. The new component is mounted by `BeatContent` inside the orchestrator's existing `<SceneTransition>` wrapper, so the per-beat entrance fade + cross-fade are inherited.
- `Root.tsx::renderDataCalculateMetadata` — unchanged. The Zod validation auto-discovers the new schema via `getBeatSchemas(type)` in the registry.

**Design-system compliance:**
- Portrait 1080×1920 ✅
- Transparent `AbsoluteFill` overlay on `PersistentBackground` ✅
- White card with shadow, border, border-radius ✅
- Top 4px gradient accent bar (`#e86c00 → #f97316`) ✅
- Space Grotesk via `@remotion/google-fonts/SpaceGrotesk` ✅
- `fitText` for headline sizing (longest word fits the text area, then `Math.min(maxSize, fittedSize * factor)`) ✅
- All entrance animations complete by `Math.round(durationInFrames * 0.4)` ✅
- No exit animation — `SceneTransition` (mounted by the orchestrator) owns entry + cross-fade ✅
- Idle: bounce (`sin(t) * 6px`) + 3D tilt (`sin(t*0.05) * 2deg`) + glow pulse (`1 + 0.15 * sin(t*0.03)`) ✅
- Accent palette: `#e86c00` / `#f97316` / `rgba(232, 108, 0, 0.4)` ✅
- Emphasis words cycle `Highlight` → `Circle` → `Underline` from `@remotion/rough-notation` ✅
- `durationInFrames` forwarded as a prop ✅

**How to verify:**
```bash
npx remotion studio --no-open
# Open http://localhost:3000/HeadlineCardTest in your browser
# Confirm: card with top accent bar, white chrome, large centered headline,
#           "gamble" and "scarce" cycle through Highlight → Circle → Underline
#           entrance animation completes by frame 48 (40% of 120),
#           idle motion is the gentle bounce + 3D tilt + glow pulse.

# Render the full video (uses Python pipeline's beats.json with a headline_card
# beat at index 0):
./scripts/render-smoke.sh
```

### 2.1.2–2.1.7 — `stat_pill` / `quote_attribution` / `compare_split` / `location_pulse` / `scrollytelling` / `ticker_tape` — ✅ DONE

**Why these were next:** after `headline_card` shipped, the 6 remaining 2.1 priorities are the visual vocabulary needed for news stories that aren't finance / tech. Each is a copy-paste of `HeadlineCard.tsx` / `KeyStatement.tsx` on the design-system primitives, with the per-type field set swapped out. `image_card` is deferred to 4.x (needs local image generation per Horizon 4.1, which itself needs a GPU / Mode B).

**What shipped (6 new components in `src/components/`):**
- `StatPill.tsx` (2.1.2) — pill-shaped white card with a single oversized number (`value: number | string`) above a `label: string`. Accepts optional `prefix` / `suffix`. Number uses the gradient text effect.
- `QuoteAttribution.tsx` (2.1.3) — multi-line quote (Space Grotesk) flanked by large `Georgia` opening/closing quote marks, a separator line, and an attribution line (`&mdash; {attribution}`). Supports `emphasisWords?` with the standard `Highlight` → `Circle` → `Underline` cycle. **Replaces the design-system non-conformant `QuoteCard.tsx` for new code; the existing `quote_card` beat type is unchanged and continues to render `QuoteCard`.**
- `CompareSplit.tsx` (2.1.4) — two equal cards side-by-side with neutral accent colors (no red/green framing, no decorative Legacy/Modern tags — that's `before_after`'s job). Optional `leftLabel` / `rightLabel` for category headers. Uses `fitText` + `measureText` for headline sizing (same as `BeforeAfter`).
- `LocationPulse.tsx` (2.1.5) — 2D location callout (cheaper than `Map3D` for "just point at a place" beats). White card with the location name, a 2D grid + pin + concentric pulse ring (idle animation), and the coordinates below.
- `Scrollytelling.tsx` (2.1.6) — long-form text with a fixed title (top) and a scrolling body (bottom). The body scrolls linearly across the idle phase, with top/bottom white fades for a soft mask. Supports `emphasisWords?`.
- `TickerTape.tsx` (2.1.7) — bottom-of-screen news ticker. Accent gradient label on the left (`"BREAKING"`, configurable), scrolling headlines on the right (joined with `   •   `, duplicated for a seamless loop). Scrolling is `Easing.linear` across the idle phase.

**Wiring (one-time, at the registry layer):**
- `src/beats/types.ts` — added 6 union members: `"stat_pill"`, `"quote_attribution"`, `"compare_split"`, `"location_pulse"`, `"scrollytelling"`, `"ticker_tape"`. The `BeatType` union is now 20 members.
- `src/beats/registry.ts` — added 6 imports, 6 Zod schemas (per-type top-level, `.passthrough()` so the per-type fields aren't stripped — see 0.2 / 1.2), and 6 registry entries. Zod validation errors now surface e.g. `beats[1].quote: Invalid input: expected string, received number` for the new types too.
- `src/beats/renderBeat.tsx` — **no change.** All 6 new types accept the Python shape directly (no `adaptMetadata` translation needed), and they're all text/card heavy so they're correctly excluded from `CAPTION_VISIBLE_BEAT_TYPES` (kinetic captions suppressed).
- `src/Root.tsx` — added 6 thin `*TestComposition` wrappers and 6 `<Composition>` registrations so each new component can be QA'd in Studio (`StatPillTest`, `QuoteAttributionTest`, `CompareSplitTest`, `LocationPulseTest`, `ScrollytellingTest`, `TickerTapeTest`). All are portrait 1080×1920.
- `src/SceneTransition.tsx` — unchanged. The new components sit inside the orchestrator's existing `<SceneTransition>` wrapper, inheriting entrance fade + cross-fade for free.

**Design-system compliance (all 6 components):** portrait 1080×1920 ✅ · transparent `AbsoluteFill` overlay on `PersistentBackground` ✅ · white card with shadow, 1px `#e8e8e8` border, 28–48px border-radius ✅ · top 4px gradient accent bar (`#e86c00` → `#f97316`) ✅ · `loadFont("normal", { weights: ["500", "700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk` ✅ · `fitText` for font sizing where appropriate ✅ · all entrance animations complete by ~30–40% of `durationInFrames` ✅ · no exit animation inside the component ✅ · idle: bounce (`sin(t) * 6px`) + 3D tilt (`sin(t*0.05) * 2deg`) + glow pulse (`1 + 0.15 * sin(t*0.03)`) ✅ · accent palette `#e86c00` / `#f97316` / `rgba(232, 108, 0, 0.4)` ✅ · `rough-notation` from `@remotion/rough-notation` for emphasis words (QuoteAttribution, Scrollytelling) ✅ · `durationInFrames` forwarded as a prop ✅ · slider border + decorative dots + shimmer ✅.

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

**Before this change:** the 20-beat registry (13 originals + `headline_card` + 6 new) was validated only at render time. A too-permissive Zod schema or a forgotten `adaptMetadata` branch would silently produce a broken render and we'd find out from the user.

**After this change:** `npm test` runs a Vitest unit-test suite with **143 tests** that guard the per-beat Zod schemas, the `adaptMetadata` adapter, the `getBeatComponent` / `isBeatTypeSupported` registry helpers, the kinetic-captions gate, and the `PerBeatSchema` / `TimedBeatsSchema` dispatcher. The smoke script (`scripts/render-smoke.sh`) runs the suite as its first step and exits 1 with a clear error if the tests fail — before paying for the ~2-minute `remotion still` render.

**What changed:**
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
- **`adaptMetadata` re-exported** from `src/beats/registry.ts` via `export { adaptMetadata } from "./renderBeat"` so the test file can `import { adaptMetadata } from "./registry"` without the orchestrator having to change its import path. The adapter is still defined and called in `renderBeat.tsx`; the registry barrel just re-exports it for test convenience.

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

**Next up in Horizon 2:** 2.3 (idle motion library in `src/lib/idleMotion/` — extract the `sin(t) * 6px` + 3D-tilt + glow-pulse into a `useIdleMotion()` hook so the 20+ components share one source of truth), 2.4 (beat-emphasis words → component-level highlights for `versus` / `before_after` / `quote_card`), and 2.5 (visual polish pass on existing components).

---

## Completed Work (Phase 1)

### Pipeline Stages
1. **News Discovery & Ranking** (`news_fetcher.py`, `llm_ranker.py`)
   - Fetches from multiple sources (Hacker News, Reddit, RSS, YouTube channels, Google News)
   - Daily log at `output/DD_MM_short_vids/_generated_log.json`
   - Fingerprint = normalized title (first 60 chars, alphanumeric only)
   - Output: ranked story list with metadata (score, source, category, rank_reason)
   - **Fixed**: Selection UI now shows ALL candidates with source + rank_reason (not capped at 6)

2. **Deduplication** (`run_pipeline.py`)
   - Daily log at `output/DD_MM_short_vids/_generated_log.json`
   - Fingerprint = normalized title (first 60 chars, alphanumeric only)
   - Output: ranked story list with metadata (score, source, category, rank_reason)

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

## Phase 2: Remotion Rendering (Complete)

### Component Library
Components are located in `src/` and follow these conventions:

**Every component conforms to the Design System Rules at the top of this document** (portrait 1080×1920, transparent overlay on `PersistentBackground`, white card with shadow + border + top accent bar, `SceneTransition`-owned entrance/exit, 30–40% entrance rule, Space Grotesk via `@remotion/google-fonts/SpaceGrotesk`, accent palette `#e86c00` / `#f97316`, emphasis cycling `Highlight` → `Circle` → `Underline` from `@remotion/rough-notation`, `fitText` + `measureText` from `@remotion/layout-utils` for headline sizing, `durationInFrames` forwarded as a prop). When you build a new component, tick every box on the audit checklist before merging.

#### KineticCaptions.tsx
- Displays word-by-word captions synced to narration
- **Local-frame rebasing**: words are converted from GLOBAL frames (`w.start * fps`) to LOCAL frames (relative to the current beat's `startFrame`) inside `useMemo`. The captions' `useCurrentFrame()` is local (0…`durationInFrames`) because the orchestrator wraps them in a per-beat `<Sequence>`, so both sides are now in the same unit. Without this rebasing, the highlight stayed stuck on word 0.
- Reads `beatStartFrame` + `beatDurationInFrames` from a `BeatContext` provided by `BeatKineticCaptions`. If no context (e.g. `*Test` composition), falls back to the prop-supplied `words`.
- Current word is highlighted with orange color and background
- **Card Style**: Current word is wrapped in a card with white background, orange border, and subtle shadow
- Past words fade to gray, future words are hidden
- Supports emphasis words with cycling annotations (Highlight, Circle, Underline) from `@remotion/rough-notation`
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
- Supports emphasis words with cycling annotations (Highlight, Circle, Underline) from `@remotion/rough-notation`
- Idle animations: card bounce, 3D tilt, glow pulse, shimmer
- Responsive sizing with `fitText` for optimal text scaling
- **Timing**: Internal animations complete by ~50% of duration, then holds idle state
- **No exit animation**: Designed to be wrapped by SceneTransition

#### HeadlineCard.tsx
- Big-text intro beat for the story hook (Horizon 2.1.1)
- Same design-system primitives as `KeyStatement` (white card, top accent bar, slider, shimmer, decorative dots, idle bounce / 3D-tilt / glow pulse, 30–40% entrance rule)
- Larger headline sizing math (slightly larger `baseFontSize` / `emphasisFontSize` caps)
- No `exitDirection` prop
- Emphasis words cycle `Highlight` → `Circle` → `Underline` from `@remotion/rough-notation`
- Mounted on a transparent `AbsoluteFill` overlay — `PersistentBackground` provides the canvas behind the card
- Test composition: `HeadlineCardTest` in `src/Root.tsx` (portrait 1080×1920, 120 frames, default `text: "The gamble works while AI chips are scarce"`, `emphasisWords: ["gamble", "scarce"]`)

#### ChartLine.tsx
- Renders line charts with animated drawing
- Supports value formatting (K, M, B, T suffixes)
- Grid lines, axis labels, and data point dots
- **Timing**: Internal animations complete by 30% of duration
- **No exit animation**: Designed to be wrapped by SceneTransition
- Uses `Interactive.Div` for Studio editability

#### BeforeAfter.tsx
- Two cards (BEFORE red, AFTER green) with a centered divider arrow
- **Headline sizing**: uses `fitText` + `fillTextBox` + `measureText` (per `measuring-text.md`) — labels wrap onto at most 2 lines, font size is dropped 4px at a time until both width AND a height budget fit
- **Decorative tags**: small pills (Legacy/Manual/Slow/Costly vs Modern/Automated/Fast/Efficient)
- **Slider border**: SVG `stroke-dashoffset` animation around the whole card group
- **Timing**: entrance by 28%, slider by 45–75%

#### VersusCard.tsx
- Two side cards (indigo/cool left, orange/warm right) with a glowing centered VS badge
- **Headline sizing**: `fitText` + `measureText` (per `measuring-text.md`)
- VS badge: dashed inner ring, expanding box-shadow during entrance, idle pulse
- Per-side `Option A` / `Option B` ribbon in the corner
- Optional `items[]` rendered as bulleted rows with a glow dot
- Grid background pattern + radial top-glow per side
- **Timing**: side cards 0–15%, divider 15–28%, slider 28–73%

#### IconText.tsx
- Lucide icon + text card (Lottie was removed in commit 8d99fe8 — Lucide is the only icon source)
- All 18 known icon names map to a Lucide component; unknown names fall back to `LucideIcons.Info`
- **Text wrapping**: `fitText` for font sizing + manual `measureText` line-break detection
- **Timing**: icon entrance by 15%, text by 25–40%, slider 40–85%

#### Timeline.tsx
- Horizontal timeline with circular markers + description cards
- Markers animate in left-to-right, each pulling a description card below
- The card with `events: string[]` (from the Python pipeline) is adapted in `renderBeat.tsx::adaptMetadata` to `events: {marker, label}[]`

### Best Practices
1. **Animation**: Use `useCurrentFrame()` + `interpolate()` with `Easing.bezier` / `Easing.spring` for timing — no CSS transitions
2. **Timing**: Keep `interpolate()` calls inline in style props for Studio interactivity
3. **Transforms**: Use individual CSS properties (`scale`, `translate`, `rotate`) over `transform` strings
4. **Fonts**: Load via `@remotion/google-fonts` for type-safe, blocking font loading
5. **Assets**: Place in `public/` folder, reference with `staticFile()`. For **runtime** JSON data, use `fetch(staticFile("…"))` inside `calculateMetadata` (see Step 8).
6. **Transitions**: Use plain `<Sequence from={…} durationInFrames={…}>` for per-beat positioning, and `SceneTransition` for per-beat entrance/exit. The previous `<TransitionSeries>` was removed because it only supports `durationInFrames` (not `from`), which desynced beats from the global word timestamps. Cross-fade is now driven by overlapping `<Sequence>`s whose exit/enter fades are produced by each beat's `SceneTransition`.
7. **SFX**: Use `<Audio>` from `@remotion/media` (works in both server-side render and `<Player>`). Centralize URLs and volumes in `src/lib/sceneSfx.ts`. There is no side-channel log for audio observability — see 1.4 for the cancelled audio-plan-log surface area and the reasoning for why a per-mount `console.log` was unworkable in the `still` render path.
8. **Ambient SFX**: A looping bed under the narration uses `<Audio loop loopVolumeCurveBehavior="extend" volume={(f) => interpolate(f, [0, FADE_FRAMES], [0, TARGET_VOLUME], {extrapolateRight: "clamp"})} />`. Mounted at the root, not per-beat, so it spans the whole composition. The ambient stream is included in the audio plan log as `ambient: "public/sfx-ambient.mp3"` (see 1.4).
9. **Text fitting**: Always use `fitText` + `measureText` from `@remotion/layout-utils` for headline sizing, and `fillTextBox` for multi-line wrapping (per `measuring-text.md`).
10. **Lucide-only icons**: No Lottie loading in `IconText.tsx` or `Timeline.tsx`. If you need animated icons, add a Lottie file at `public/icons/{name}.json` and re-enable the Lottie path in those components.

### Running the Renderer

**Phone (Mode A, current):** see the "Render Mode" section at the top of this doc.

**Laptop (Mode B, future):**
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

## Phase 2: Video Generator Plan (COMPLETE)

### Architecture
```
public/   (single source of render data)
  narration.mp3
  beats.json
  timestamps.json
  sfx-ambient.mp3
  ↓
Root.tsx::renderDataCalculateMetadata (async fetch via staticFile)
  ├─ Parses beats.json + timestamps.json via Zod
  ├─ Dedupe overlapping/zero-duration words (1.3)
  └─ Inject beats + deduped words into props
  ↓
MotionGraphicsVideo.tsx (orchestrator)  width=1080 height=1920 (portrait)
  ↓
calculateMetadata (sync; uses beats.totalDurationInFrames directly)
  ↓
For each beat:
  <Sequence from={beat.startFrame} durationInFrames=...>
    <BeatContent>
      adaptMetadata() (Python shape → component shape)
      validateBeatMetadata() (Zod)
      <SceneTransition>
        <BeatComponent {...adapted} durationInFrames=…>
    </BeatContent>
    {shouldShowKineticCaptions ? <BeatKineticCaptions> : null}
    {!isLast ? <Sequence from={whooshFrom} durationInFrames={tf}>
      <Audio src=whoosh />
    </Sequence> : null}
  </Sequence>
  ↓
PersistentBackground (root, behind everything, GLOBAL frame counter)
  ↓
Audio narration (root)
Audio ambient SFX (root, looping, fades in over 1s)
```

### Project Structure
```
src/
├── Root.tsx                          # Compositions registry + renderDataCalculateMetadata + audio plan log ✅ DONE
├── MotionGraphicsVideo.tsx           # Main orchestrator ✅ DONE
├── HeadlineCard.tsx                  # Horizon 2.1.1 — big-text intro beat ✅ DONE
├── beats/
│   ├── registry.ts                   # Maps beat.type → React component + Zod schema ✅ DONE
│   ├── renderBeat.tsx                # Renders a single beat ✅ DONE
│   ├── types.ts                      # Beat type definitions + per-beat Zod schema ✅ DONE
│   ├── words.ts                      # Word timestamp type + dedupeOverlappingWords ✅ DONE
│   └── registry.test.ts              # Horizon 2.2 — 143-test Vitest suite for the registry ✅ DONE
├── SceneTransition.tsx               # Per-beat entrance/exit with Easing.bezier ✅ DONE
├── PersistentBackground.tsx          # Background (logo + 2D scrolling grid) ✅ DONE
├── Logo.tsx                          # 3D S-NEWS voxel logo
├── components/
│   ├── KeyStatement.tsx
│   ├── PlainText.tsx
│   ├── IconText.tsx                  # Lucide-only icons (no Lottie) ✅ DONE
│   ├── ChartLine.tsx
│   ├── ChartCounter.tsx
│   ├── ChartComparison3D.tsx         # Only `chart_comparison_3d` is used
│   ├── ProgressMeter.tsx
│   ├── Timeline.tsx                  # Lucide + plain text, no Lottie ✅ DONE
│   ├── VersusCard.tsx                # fitText/measureText sizing + beautified VS badge ✅ DONE
│   ├── BeforeAfter.tsx               # fitText/measureText headline sizing ✅ DONE
│   ├── Map3D.tsx                     # Only `map_3d` is used
│   ├── StatPill.tsx                  # Horizon 2.1.2 ✅ DONE
│   ├── QuoteAttribution.tsx          # Horizon 2.1.3 ✅ DONE
│   ├── CompareSplit.tsx              # Horizon 2.1.4 ✅ DONE
│   ├── LocationPulse.tsx             # Horizon 2.1.5 ✅ DONE
│   ├── Scrollytelling.tsx            # Horizon 2.1.6 ✅ DONE
│   ├── TickerTape.tsx                # Horizon 2.1.7 ✅ DONE
│   └── KineticCaptions.tsx           # Local-frame word rebasing ✅ DONE
├── audio/
│   ├── BeatKineticCaptions.tsx       # Per-beat wrapper + typing SFX + local-context ✅ DONE
│   └── NarrationLayer.tsx            # <Audio> wrapper with word-sync
├── lib/
│   ├── totalDuration.ts              # Sums beat durations
│   ├── transitionDuration.ts         # Dynamic cross-fade frames ✅ DONE
│   └── sceneSfx.ts                   # SFX URLs + defaults (no audio-plan-log — see 1.4) ✅ DONE
├── calculateMetadata.ts              # Dynamic duration ✅ DONE (in MotionGraphicsVideo.tsx)
├── Composition.tsx                   # Template file (unused; placeholder)
└─…
public/                                # All render data lives here (single-folder input)
├── narration.mp3
├── beats.json
├── timestamps.json
└── sfx-ambient.mp3
```

### Step 1: Beat Type System (`src/beats/types.ts`) — ✅ DONE (commit 78e3f69)
- `BeatType` union of all 20 supported types (added `headline_card` under Horizon 2.1.1, then `stat_pill` / `quote_attribution` / `compare_split` / `location_pulse` / `scrollytelling` / `ticker_tape` under 2.1.2–2.1.7)
- `Beat` object: `{type, startFrame, durationInFrames, metadata}`
- `TimedBeats`: wraps beats with `fps` and `totalDurationInFrames`
- **1.2 update:** `PerBeatSchema` + `TimedBeatsSchema` validate each beat at the top level against the per-type Zod schema in the registry. See Phase 1 (Horizon 0) / 1.2 above.
- **1.1 / 1.3 update:** `WordSchema` and `WordListSchema` validate the shape of `public/timestamps.json`; the actual dedupe of overlapping / zero-duration entries is in `src/beats/words.ts::dedupeOverlappingWords` (used by `Root.tsx`).

### Step 2: Component Registry (`src/beats/registry.ts`) — ✅ DONE (commit ffebd7d)
Maps each `BeatType` to:
- The React component (`getBeatComponent(type)`)
- A Zod schema that validates the WHOLE beat (top-level) shape (`getBeatSchemas(type).beatSchema`)
- A Zod-based validator (`validateBeatMetadata(type, beat)`)
- A support check (`isBeatTypeSupported(type)`)

**Zod schemas** (per-beat-type top-level shape contracts):
- `key_statement` → `{type, text, startFrame, durationInFrames, endFrame?, emphasisWords?}`
- `headline_card` → `{type, text, startFrame, durationInFrames, endFrame?, emphasisWords?, backgroundColor?, accentColor?, textColor?}` (added under Horizon 2.1.1)
- `plain_text` → `{type, text, startFrame, durationInFrames, endFrame?}`
- `icon_text` → `{type, text, startFrame, durationInFrames, endFrame?, icon, emphasisWords?}`
- `chart_line` → `{…, points[{label,value}], exitDirection?}`
- `chart_counter` → `{…, value, label}`
- `chart_comparison_3d` → `{…, items[{label,value}]}`
- `progress_meter` → `{…, value, maxValue, label}`
- `timeline` → `{…, events[]}`
- `versus` → `{…, left, right}`
- `before_after` → `{…, beforeLabel, afterLabel}`
- `map_3d` → `{…, locationName, latitude, longitude, buildings?}`
- `process_flow` → `{…, steps[]}`
- `quote_card` → `{…, quote, author?}`
- 2.1.2–2.1.7 additions: `stat_pill` / `quote_attribution` / `compare_split` / `location_pulse` / `scrollytelling` / `ticker_tape` (all `.passthrough()` per the 1.2 fix; see `src/beats/registry.test.ts` for the per-type field contracts)

**Active beat types** (what the Python pipeline currently emits):
- `map_3d` (not `map_location`)
- `chart_comparison_3d` (not `chart_comparison`)

**Fallback mappings**:
- `process_flow` → `Timeline`
- `quote_card` → `KeyStatement`

### Step 3: Orchestrator (`src/MotionGraphicsVideo.tsx`) — ✅ DONE
- Root composition: `MotionGraphicsVideo`, dimensions **1080×1920** (portrait, YouTube Shorts)
- Renders the `narration.mp3` once at the root via `<Audio src={staticFile(narrationSrc)} />`
- Wraps `PersistentBackground` once at the root (so its frame counter is global)
- Lays out each beat at its absolute `startFrame` via `<Sequence from={startFrame} durationInFrames=...>`. The per-beat `<SceneTransition>` handles entrance/exit. Cross-fade is implicit: adjacent beats overlap by `computeTransitionFrames()` frames; during the overlap the outgoing beat's exit fade multiplies with the incoming beat's entrance fade to produce a cross-fade.
- Each outgoing beat's `<Sequence>` contains a `<Sequence from={whooshFrom} durationInFrames={transitionFrames}><Audio src=whoosh /></Sequence>` for UI feedback.
- Renders the `sfx-ambient.mp3` once at the root as a looping ambient bed (see Step 6d).
- `calculateMetadata` returns `beats.totalDurationInFrames` directly (Python pipeline already accounts for the cross-fade overlap)
- White background

### Step 4: Render a Single Beat (`src/beats/renderBeat.tsx`) — ✅ DONE
Each beat is wrapped in `<Sequence from={startFrame} durationInFrames={...}>` (mounted by the orchestrator). The cross-fade between adjacent sequences happens because the next beat's `<Sequence>` starts at its own `startFrame`, which is less than the outgoing beat's end frame; the overlap window is the cross-fade.

Inside each `<Sequence>`:
1. `<SceneTransition>` → `<BeatComponent {...validatedMetadata} durationInFrames={...} />` — the typed component from the registry
2. `<BeatKineticCaptions text={beat.text} words={beatWords} beatType={beat.type} fps={fps} startFrame={beat.startFrame} />` — per-beat word-sync caption overlay, **only rendered for data-vis beat types** (see below). The `fps` prop is forwarded so the click track is frame-accurate.

**Per-beat word slicing:** `BeatKineticCaptions` filters `allWords` to `[startFrame/fps, (startFrame + durationInFrames)/fps]` so captions stay in sync with the current beat.

**Failure handling:** If Zod validation fails OR no component is registered, the beat renders a labeled fallback message inside its sequence (red for invalid, blue for unsupported) — this keeps the timeline readable and makes Python pipeline bugs visible.

**Kinetic captions gate:** `BeatKineticCaptions` is rendered ONLY for these beat types (data-vis heavy — captions help the viewer follow numbers/visuals):
`map_3d`, `chart_line`, `chart_comparison_3d`, `chart_counter`, `progress_meter`, `timeline`.

It is suppressed for text/card heavy beat types (the on-screen text is already the caption):
`key_statement`, `plain_text`, `icon_text`, `versus`, `before_after`, `process_flow`, `quote_card`, `headline_card`,
plus all 2.1.2–2.1.7 text/card types: `stat_pill`, `quote_attribution`, `compare_split`, `location_pulse`, `scrollytelling`, `ticker_tape`.

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

…and used inside the orchestrator after word-slicing. `shouldShowKineticCaptions` is also re-exported as `shouldShowCaptions` (alias) for the orchestrator.

**Metadata adapter (`adaptMetadata`):** Python emits a *minimal* shape per beat (`versus.left` is a string, `timeline.events` is a string array) but the existing components expect a *rich* shape (`VersusCard` wants `{label, value, items}` objects; `Timeline` wants `{marker, label}` objects). `adaptMetadata(type, raw, text)` runs before Zod validation and converts the minimal shape into the rich shape. Adapters:
- `versus`: `{left: "..."}` → `{left: {label: "..."}}` (same for `right`)
- `timeline`: `["a", "b"]` → `[{marker: "Step 1", label: "a"}, ...]`
- `process_flow`: `["a", "b"]` → `[{marker: "1", label: "a"}, ...]` (Timeline fallback)
- `headline_card`: pass-through (Python emits top-level `text` + `emphasisWords?` which the component reads directly)
- `stat_pill`, `quote_attribution`, `compare_split`, `location_pulse`, `scrollytelling`, `ticker_tape`: pass-through (Python emits the per-type fields at the top level; the new components read them directly)
- all others: pass through

The adapter is re-exported from `src/beats/registry.ts` via `export { adaptMetadata } from "./renderBeat"` so the Phase 2.2 test file (`src/beats/registry.test.ts`) can `import { adaptMetadata } from "./registry"` without breaking the orchestrator's existing import path.

### Step 4b: Dynamic Cross-Fade Between Beats — ✅ DONE
Adjacent beats overlap by `computeTransitionFrames(out, in)` frames. The Python pipeline already knows this overlap and emits `totalDurationInFrames` accounting for it. The orchestrator does NOT subtract transition frames — it lays each beat at its absolute `startFrame` and lets the natural overlap produce the cross-fade.

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

The whoosh SFX lives inside the outgoing beat's `<Sequence>` for `transitionFrames` frames, starting at `whooshFrom = startFrame + durationInFrames - transitionFrames` (local-frame `whooshFrom - startFrame`).

### Step 5: Dynamic Duration (`calculateMetadata`) — ✅ DONE
Lives inside `src/MotionGraphicsVideo.tsx`. Returns `beats.totalDurationInFrames` directly. The Python pipeline pre-accounts for the cross-fade overlap, so the orchestrator just trusts that number. This keeps the orchestrator's declared duration in lock-step with the rendered timeline, which is what makes the audio and the components stay in sync.

### Step 6: Scene Transitions (`src/SceneTransition.tsx`) — ✅ DONE
- Wraps a beat's content in a `SceneTransitionContext` with `entranceProgress`, `exitProgress`, `idleProgress`, `overallProgress`, `isIdle`
- Phase budgets: 18% entrance / 64% idle / 18% exit (tuned for 1.5s–4s beats)
- **Easing**: `Easing.bezier(0.16, 1, 0.3, 1)` (Remotion skill default) on entrance; `Easing.bezier(0.7, 0, 0.84, 0)` on exit; same entrance easing on the default `translateY` slide-up
- Default wrapper behavior: gentle fade + slide-up entrance, fade exit
- Children can read context via `useSceneTransition()` to layer their own animations
- Default context (when used outside a `<SceneTransition>`) provides identity values so existing `*Test` compositions still work

### Step 6b: Scene Transition SFX — ✅ DONE
Each beat's outgoing `<Sequence>` contains a nested `<Sequence from={whooshFrom - startFrame} durationInFrames={transitionFrames}><Audio src={TRANSITION_SFX_URL} volume={TRANSITION_SFX_VOLUME} /></Sequence>` that plays a short whoosh at the start of the cross-fade. The nested sequence's local clock is bounded by `transitionFrames`, so the audio starts when the cross-fade starts and stops when it ends.

- **URL**: `https://remotion.media/whoosh.wav` (from the project's `sfx.md` skill).
- **Volume**: 0.5.
- **Behavior**: same whoosh for every transition; no loop; first beat has no outgoing transition so no SFX plays for it; the final beat has no outgoing transition so the closing fade-out is silent.
- **Centralized**: `src/lib/sceneSfx.ts` exports `TRANSITION_SFX_URL` and `TRANSITION_SFX_VOLUME` so tweaks happen in one place.
- **Observability**: whoosh count + per-whoosh frame range are recorded in the audio plan log (see 1.4) by `Root.tsx::renderDataCalculateMetadata` using the same `computeTransitionFrames` helper the orchestrator uses.
- **Compatibility**: `<Audio>` from `@remotion/media` works in both server-side render and `<Player>` (unlike `<Audio>` from `remotion` which becomes `<Html5Audio>`).

### Step 6c: Typing SFX on Kinetic Captions — ✅ DONE
Whenever `<BeatKineticCaptions>` renders (i.e. for data-vis beats), it also renders a click track — one short `<Audio>` per word, placed at the word's start frame inside the beat's local timeline. The click gives the typing a tactile feel without competing with the narration.

- **URL**: `https://remotion.media/mouse-click.wav` (from the project's `sfx.md` skill).
- **Volume**: 0.15 (intentionally quiet — doesn't fight the narration or the whoosh).
- **Gating**: same `CAPTION_VISIBLE_BEAT_TYPES` set as the visual captions. Text/card beats don't get the click track because they don't show words ticking through.
- **Implementation**: in `src/audio/BeatKineticCaptions.tsx`. For each `word` in the beat's word list, the wrapper renders a 4-frame `<Sequence from={localStartFrame} durationInFrames={4}>` containing the click. The parent `<Sequence>` bounds the whole track to the beat's `durationInFrames`. **The 1-frame variant caused mediabunny's MP4 muxer to throw `Cannot write to a closing writable stream` during chunk flush; 4 frames (~133ms at 30fps) is the smallest stable window.**
- **Local-frame conversion**: `localStartFrame = Math.round(w.start * fps) - startFrame`. Word timestamps are GLOBAL (relative to the start of the whole composition); clicks live inside a per-beat `<Sequence>` whose local counter starts at 0 at `startFrame`. Without the offset, the click would lag the narration by `startFrame` frames.
- **Observability**: the per-beat click count is recorded in the audio plan log (see 1.4) by `Root.tsx::renderDataCalculateMetadata` using the same window logic the orchestrator uses.

Code shape inside `BeatKineticCaptions`:

```tsx
{words.map((w, i) => {
  const localStartFrame = Math.max(0, Math.round(w.start * fps) - startFrame);
  return (
    <Sequence
      key={`type-${i}-${w.start}`}
      from={localStartFrame}
      durationInFrames={CLICK_HOLD_FRAMES}  // 4
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
- **Observability**: the ambient stream is recorded in the audio plan log as `ambient: "public/sfx-ambient.mp3"` (see 1.4).
- **Compatibility**: `<Audio>` from `@remotion/media` works in both server-side render and `<Player>` (unlike `<Audio>` from `remotion` which becomes `<Html5Audio>`).

### Step 7: Per-beat Captions Wrapper (`src/audio/BeatKineticCaptions.tsx`) — ✅ DONE
Per-beat wrapper around `KineticCaptions` that:
1. Slices the full word list to the current beat's window (`[startFrame/fps, (startFrame+durationInFrames)/fps]`) so captions don't bleed into adjacent beats.
2. Provides a `BeatContext` (currentBeatType, currentWords, beatStartFrame, beatDurationInFrames) so `KineticCaptions` can rebase GLOBAL word starts to LOCAL frames inside `useMemo`.
3. Renders the typing-click track (see Step 6c).
4. Exposes its own `useBeatContext()` for `KineticCaptions`. (The orchestrator's `useBeatContext` still exists for backward compatibility but `KineticCaptions` reads from this local one — same data shape, owned by the same file.)

### Step 8: Wire Up `Root.tsx` — ✅ DONE
- `renderDataCalculateMetadata` (in `Root.tsx`) is the **async** `calculateMetadata` for the `MotionGraphicsVideo` composition. It fetches `public/beats.json` and `public/timestamps.json` via `fetch(staticFile("…"))` in parallel, injects the parsed JSON into `props.beats` / `props.words`, and returns both the resolved `durationInFrames` (from `beats.totalDurationInFrames`) and the populated props.
- The **sync** `calculateMetadata` in `MotionGraphicsVideo.tsx` then runs on the now-populated `props.beats` and returns the same value (it just trusts the upstream number). This is the value Remotion actually uses to size the composition.
- `defaultProps` passes only placeholder values (`beats: empty, words: [], narrationSrc: "narration.mp3"`) because the real values come from the fetch.
- The four data files all live in `public/` — `narration.mp3`, `beats.json`, `timestamps.json`, `sfx-ambient.mp3`. Drop them in `public/` and render (in Studio or via CLI). No code change required.
- All existing `*Test` compositions are preserved in the same root file with their hard-coded `defaultProps` (they don't need the JSONs).
- **2.1.1 update:** added `HeadlineCardTest` and `KeyStatementTest` test compositions. Both are portrait 1080×1920, 120 frames, with the same default `text` and `emphasisWords` so the two components can be diffed side-by-side in Studio.
- **2.1.2–2.1.7 update:** added 6 more `*Test` compositions — `StatPillTest`, `QuoteAttributionTest`, `CompareSplitTest`, `LocationPulseTest`, `ScrollytellingTest`, `TickerTapeTest`. All portrait 1080×1920, 120 frames, with sensible defaults from the new components.
- **1.1 update:** the async `calculateMetadata` THROWS on missing files, non-2xx responses, JSON parse errors, or top-level Zod schema failures (instead of silently falling back to a 1-frame video). The error message includes the filename and either the HTTP status or the Zod issue path. The `AbortError` path (Studio prop change mid-fetch) still returns `null` so it doesn't spam the log.
- **1.2 update:** the Zod validation now also covers per-beat shape (delegates to `src/beats/registry.ts::getBeatSchemas` per beat). If a beat's `type` is unknown or the per-type fields don't match (e.g. `icon_text.icon` is missing, `key_statement.emphasisWords` is a number), the user gets a clear error like `beats[1].icon: Invalid input` and the render aborts.
- **1.3 update:** the parsed `words[]` is run through `src/beats/words.ts::dedupeOverlappingWords` to drop overlapping / zero-duration entries before being injected into `props.words`. A `console.warn` lists how many were dropped (and that the Python pipeline's WhisperX step is the likely culprit).
- **1.5 update:** the smoke script (`scripts/render-smoke.sh`) grew a `--skip-if-unchanged` flag that compares the SHA-256 of `public/beats.json` + `public/timestamps.json` to the hash in `out/last-render.json` and skips re-rendering if they match. See 1.5 above for the full reasoning and the `scripts/lastRenderHash.mjs` helper.
- **2.2 update:** the same smoke script now runs `npm test` as its first step. If the registry unit-test suite fails, the smoke script exits 1 with `==> FAIL: registry unit tests failed.` and the render is skipped. See 2.2 above for the full test inventory.

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
11. ~~Replace orchestrator's `<TransitionSeries>` with absolute-positioned `<Sequence from={…}>` per beat~~ ✅
12. ~~Add whoosh SFX to every outgoing beat's cross-fade window~~ ✅
13. ~~Add typing click SFX on every word in kinetic captions~~ ✅
14. ~~Add looping ambient SFX bed under narration~~ ✅ (commit 36433c8)
15. ~~Single-folder data input: read all 4 render files from `public/` via runtime fetch~~ ✅
16. ~~Widen typing-click sequences to 4 frames to stop mediabunny "Cannot write to a closing writable stream"~~ ✅
17. ~~Add `dividerBorderRadius` constant to `BeforeAfter` (commit dc384a7)~~ ✅
18. ~~Add `useMeasureText`/`fitText`/`fillTextBox` to `BeforeAfter` headlines (commit d2b85ab)~~ ✅
19. ~~Beautify `VersusCard` (corner ribbons, Option A/B tags, item rows, VS badge pulse, grid background)~~ ✅
20. ~~Remove Lottie loading from `IconText` and `Timeline`; use Lucide everywhere~~ ✅ (commit 8d99fe8)
21. ~~Fix kinetic captions: rebase words from global to local frames inside `KineticCaptions` so the highlight tracks the spoken word in the current beat~~ ✅ (commit c6f3b78)
22. **Horizon 0 — Renderer Hardening — ✅ COMPLETE**
    1. ✅ Replace silent fallback with hard error on missing render data (1.1)
    2. ✅ Validate per-beat `metadata` shape with Zod (1.2)
    3. ✅ Validate per-word shape + dedupe overlapping/zero-duration words (1.3)
    4. ✅ Per-mount `console.log` audio observability (0.4) — CANCELLED (see 1.4)
    5. ✅ File-based audio plan log (1.4) — CANCELLED (see 1.4)
    6. ✅ Cache the last-render composition hash (1.5)
23. **DEFERRED until laptop/GPU available (Mode B)**
    - ⏳ Local batch renderer (Horizon 1) — see Render Mode section at top
    - ⏳ Hosted dashboard (Horizon 6)
    - ⏳ Managed render farm (Horizon 7)
    - ⏳ YouTube auto-publish (Horizon 8) — manual upload from Studio for now
24. **IN PROGRESS — Horizon 2 — Component Coverage + Better Visuals**
    - ✅ **2.1.1 — `headline_card` beat type (priority 1 of 8) — DONE**
    - ✅ **2.1.2–2.1.7 — `stat_pill` / `quote_attribution` / `compare_split` / `location_pulse` / `scrollytelling` / `ticker_tape` (priorities 2–7 of 8) — DONE**
    - ✅ **2.2 — Per-type Zod schemas + Vitest unit-test suite (143 tests in `src/beats/registry.test.ts`, wired into `scripts/render-smoke.sh` as the first step) — DONE**
    - ⏳ Remaining: 2.3 (idle motion library in `src/lib/idleMotion/`), 2.4 (emphasis words → component-level highlights), 2.5 (visual polish)
25. **DEFERRED until laptop/GPU available (Mode B)**
    - ⏳ Local batch renderer (Horizon 1) — see Render Mode section at top
    - ⏳ Hosted dashboard (Horizon 6)
    - ⏳ Managed render farm (Horizon 7)
    - ⏳ YouTube auto-publish (Horizon 8) — manual upload from Studio for now

### Critical Decisions
1. **Absolute-positioned beats, not `<TransitionSeries>`.** `<TransitionSeries>` only supports `durationInFrames` (not `from`), which desynced beats from the global word timestamps in `public/timestamps.json`. We use plain `<Sequence from={beat.startFrame} durationInFrames=…>` per beat; the cross-fade is the natural overlap during which the outgoing beat's `SceneTransition` exit-fade multiplies with the incoming beat's `SceneTransition` entrance-fade.
2. **Where to load render data?** — Runtime fetch from `public/`. `Root.tsx::renderDataCalculateMetadata` fetches `public/beats.json` + `public/timestamps.json` via `fetch(staticFile("…"))`, injects them into `props`. `MotionGraphicsVideo` reads `public/narration.mp3` and `public/sfx-ambient.mp3` directly via `staticFile("…")`. No build-time imports. Trade-off: a small startup cost at composition mount (the JSONs need to fetch) and a single `MotionGraphicsVideo` `defaultProps` placeholder. Benefit: drop the four files in `public/` and render — no source edit.
3. **Keep `*Test` compositions in `Root.tsx`?** — Yes, in their own folder for Studio component preview.
4. **Zod for metadata validation** — Confirmed; install via `npx remotion add zod`.
5. **Fallback components** — Confirmed; `process_flow` and `quote_card` reuse existing components until dedicated variants are built.
6. **Top-level `text` vs `metadata.text`** — Orchestrator merges top-level `text` into `metadata` before Zod validation, then passes top-level `text` to `KineticCaptions` separately.
7. **Failure handling** — Bad Python output is shown in-place as a red/blue fallback message inside the offending beat's sequence, not as a render crash.
8. **BeatKineticCaptions wrapper** — Created to bridge the new orchestrator's per-beat word slicing to the existing `KineticCaptions` API without modifying that component. It also provides the per-beat `BeatContext` so `KineticCaptions` can rebase words to local frames.
9. **Metadata adapter (`adaptMetadata`)** — Converts Python's minimal beat shapes (string `left`/`right`, string `events[]`, string `steps[]`) into the rich object shapes the existing components expect, BEFORE Zod validation. Keeps the components untouched while accepting the Python pipeline's output format.
10. **Kinetic captions gate** — `BeatKineticCaptions` is rendered only for data-vis beat types (`map_3d`, `chart_line`, `chart_comparison_3d`, `chart_counter`, `progress_meter`, `timeline`). Suppressed for text/card heavy types where the on-screen text is the caption (now also includes `headline_card` + all 2.1.2–2.1.7 text/card types). The gate is centralized in `renderBeat.tsx` via `CAPTION_VISIBLE_BEAT_TYPES`.
11. **3D-only map and chart comparison** — The Python pipeline emits `map_3d` (not `map_location`) and `chart_comparison_3d` (not `chart_comparison`). The 2D variants are not currently in use.
12. **Easing on per-beat entrance/exit** — `SceneTransition` uses `Easing.bezier(0.16, 1, 0.3, 1)` (Remotion skill default) for entrance and `Easing.bezier(0.7, 0, 0.84, 0)` for exit. Same entrance easing on the default `translateY` slide-up.
13. **Dynamic cross-fade duration** — `computeTransitionFrames(out, in)` (in `src/lib/transitionDuration.ts`) returns `clamp(round(0.15 * min(out, in)), 4, 15)`. The Python pipeline pre-accounts for this overlap and emits `totalDurationInFrames` accordingly; the orchestrator uses that value directly without re-subtracting.
14. **Transition SFX** — A whoosh.wav from the Remotion CDN plays at the start of every cross-fade window, mounted inside the outgoing beat's nested `<Sequence from={whooshFrom - startFrame} durationInFrames={transitionFrames}>`. Volume 0.5. URL and volume centralized in `src/lib/sceneSfx.ts`. First beat has no outgoing transition, so no SFX plays for it; final beat's exit is silent.
15. **Typing SFX** — A mouse-click.wav from the Remotion CDN plays at the start of every word inside `<BeatKineticCaptions>`, gated to the same data-vis beat types as the visual captions. Volume 0.15. Each click lives inside a 4-frame `<Sequence from={localStartFrame} durationInFrames={4}>`; the parent beat's `<Sequence>` bounds the whole track. `fps` is forwarded from the orchestrator so the click track is frame-accurate. Word timestamps are converted to local frames via `Math.round(w.start * fps) - startFrame`.
16. **Single-folder render data** — All four data files (`public/narration.mp3`, `public/beats.json`, `public/timestamps.json`, `public/sfx-ambient.mp3`) are loaded at composition mount time. `Root.tsx` fetches the two JSONs in `renderDataCalculateMetadata` and injects them into `props`. The audio files are read directly by the orchestrator via `staticFile("…")`. This replaces the previous build-time import in `Root.tsx`. To render a different story, copy the four files into `public/` and render (in Studio or via CLI) — no source edits required.
17. **Ambient SFX** — A local `public/sfx-ambient.mp3` plays on `loop` with `loopVolumeCurveBehavior="extend"` underneath the narration. Volume is a callback `(f) => interpolate(f, [0, 30], [0, 0.15], {extrapolateRight: "clamp"})` so it fades in over the first second and then holds at 0.15 for the rest of the composition. Per `audio.md` best practices for ambient sound. Mounted at the root of `MotionGraphicsVideo` (not per-beat) so it spans the whole composition without restarting at every cross-fade. URL and volume centralized in `src/lib/sceneSfx.ts`.
18. **Local-frame rebasing for kinetic captions** — `KineticCaptions` reads `useCurrentFrame()` from inside the per-beat `<Sequence>`, so its value is LOCAL (0…`durationInFrames`). Word timestamps are GLOBAL (in seconds from the start of the whole composition). `KineticCaptions` rebases each word's `start`/`end` from seconds-then-multiplied-by-fps to local frames inside `useMemo`, so the highlight `findIndex` lookup can compare `frame` against `w.start` in matching units. Without this, the highlight is stuck on word 0 (or whatever the first word is) because `frame < w.start` for almost every word in the beat. The rebasing is gated on the presence of `beatStartFrame` in the `BeatContext` (so `*Test` compositions without a context still work — they pass pre-sliced local-frame words via props).
19. **Lucide-only icons** — `IconText.tsx` and `Timeline.tsx` no longer load Lottie files. All icon names map to a Lucide component; unknown names fall back to `LucideIcons.Info`. To restore Lottie, drop a `.json` file at `public/icons/{name}.json` and re-enable the Lottie path in those two components.
20. **Headline sizing via `@remotion/layout-utils`** — `BeforeAfter.tsx` and `VersusCard.tsx` use `fitText` + `measureText` (and `fillTextBox` for multi-line wrapping in `BeforeAfter`) to size headlines. The resolved font size is dropped 4px at a time until both the longest line's width AND a height budget fit. This stops the "Lease-Back" / "World Cup boost" overflow that was happening with the previous hand-tuned font sizes.
21. **VersusCard visual language** — Indigo-cool on the left, orange-warm on the right; per-side `Option A` / `Option B` ribbons; glowing centered VS badge with dashed inner ring; grid background pattern + radial top-glow per side; optional `items[]` rendered as bulleted rows with a glow dot. Card rotation during entrance (–2° / +2° → 0°) for depth.
22. **BeforeAfter visual language** — Red BEFORE / green AFTER color system, decorative tag pills (Legacy/Manual/Slow/Costly vs Modern/Automated/Fast/Efficient), top accent bars + side vertical strips, slider border that draws around the whole card group.
23. **Hard-error fetch for render data (1.1)** — `Root.tsx::renderDataCalculateMetadata` THROWS on missing files, non-2xx responses, JSON parse errors, or top-level Zod schema failures, instead of silently falling back to a 1-frame video. The error message includes `[MotionGraphicsVideo]` and identifies either the filename + HTTP status, the JSON parse error, or the Zod issue path. The `AbortError` path (Studio prop change mid-fetch) is the only benign case and still returns `null`. A new `scripts/render-smoke.sh` exercises the full render path and asserts the output is non-trivial in size.
24. **Per-beat Zod validation (1.2)** — `src/beats/types.ts::PerBeatSchema` uses `z.object(beatBaseShape).passthrough().superRefine(...)` to dispatch each beat to its per-type Zod schema in `src/beats/registry.ts` and forward the underlying Zod issues into the parent validation context. This preserves the original field path so the user-facing error reads `beats[1].icon: Invalid input` rather than `beats[1].metadata: [opaque message]`. **The `.passthrough()` is load-bearing** — without it, Zod strips unknown keys before the per-type schema sees them, and per-type fields (`icon`, `left`, `right`, `events`, `steps`, `points`, `items`, `beforeLabel`, `afterLabel`, `locationName`, `latitude`, `longitude`, `buildings`, `quote`, `author`) are silently missing.
25. **Per-word dedupe (1.3)** — `src/beats/words.ts::dedupeOverlappingWords` is a pure helper that drops WhisperX junk (zero-duration + overlapping entries) so the kinetic-caption highlight doesn't flicker or get stuck. `Root.tsx` calls it after `WordListSchema.safeParse` and logs a `console.warn` if any words were dropped, pointing the user at the Python pipeline's WhisperX alignment step. The dedupe rules are: (1) drop if `end <= start`; (2) drop if `end <= prevKept.end` (the later word is contained/duplicate of the previous kept one). On ties the LATER word is dropped, matching what `KineticCaptions::findCurrentWordIndex` does anyway (returns the first match). Logging lives in the caller so the helper stays pure and easy to unit test.
26. **Render mode is a deployment choice, not a code choice** — Mode A (phone, browser-render in Studio) and Mode B (laptop, CLI-render) consume the exact same Remotion source. The only thing that changes is the render invocation (Studio "Render" button vs. `npx remotion render`). This means we can build all the renderer features (Horizon 0, 2, 5) without a GPU, then later switch to Mode B by changing the render command — no source edits. The Python batch driver, managed render farm, and hosted dashboard (Horizons 1, 6, 7) only make sense in Mode B and are explicitly deferred until then.
27. **Audio observability is not a side-channel log (0.4 + 1.4 cancelled)** — The original Horizon 0.4 spec asked for a per-mount `[audio] <label> src=… volume=… frames=[from, to) <meta>` `console.log` line on every `<Audio>` mount. We tried four mechanisms (`onMount` on `<Audio>`, `useEffect(..., [])` in a sibling `<AudioMountLog>`, `useState(() => logAudioMount(...))` initializer, and `useRef(false)` + direct log in the function body). All four produced zero output during a `still` (single-frame) render. Remotion's `still` command uses a render-only code path that bypasses the React lifecycle entirely — it just reads the composition dimensions and renders a frame using the `calculateMetadata`-supplied data, without committing the tree. So the function body of the components isn't even invoked, and there is no place inside the React tree from which to emit a per-mount log line during a `still`. We then pivoted (Horizon 1.4) to a file-based audio plan log: `Root.tsx::renderDataCalculateMetadata` would compute the whoosh slot list + click count and append one JSON line to `out/audio-mounts.log`, and the smoke test would assert on that file. That implementation hit two unfixable problems: (a) `process.versions.node` is shimmed in Remotion's render context, so the "am I in real Node?" guard was unreliable, and (b) webpack's static analysis still tried to follow the dynamic `require("node:fs")` even after the `remotion.config.ts` fallback. **Final fix:** drop the entire 0.4 + 1.4 surface area. `src/lib/sceneSfx.ts` no longer exports `writeAudioPlanLog` / `AudioPlanLog` / `WhooshSlot`. `Root.tsx` no longer computes or writes the audio plan. `scripts/render-smoke.sh` no longer asserts on `out/audio-mounts.log` (exit code 3 is gone). The orchestrator's audio streams (narration, ambient, per-transition whoosh, per-word click) are still observable through the React tree itself; per-mount observability would be a future horizon, gated on a real `npx remotion render` smoke test (not `still`).
28. **Last-render hash cache lives under `scripts/`, not `src/lib/` (1.5)** — The hash helper (`scripts/lastRenderHash.mjs`) was originally placed in `src/lib/`, but Remotion's webpack bundler walks `src/Root.tsx`'s input graph and discovered the file even though nothing imported it, then tried to resolve `node:fs` / `node:crypto` in a browser context and failed with "Module not found: Error: Can't resolve 'fs'". Moving the helper to `scripts/` puts it outside the bundle's input graph entirely. As an additional safety net, `remotion.config.ts` sets `resolve.fallback: { fs: false, path: false, crypto: false, ... }` so any future accidental `node:*` import inside `src/` is silently dropped from the browser bundle instead of failing the build. The canonical hash input is the two file bodies concatenated byte-for-byte with **NO separator**; an earlier version inserted a single `0x0a` (LF) byte between them, which (a) `createHash().update(0x0a)` rejected as `ERR_INVALID_ARG_TYPE: data argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received type number (10)`, and (b) never matched the bash side of `cat beats.json timestamps.json | sha256sum`, which adds no separator. The smoke script's `--skip-if-unchanged` flag uses this hash to short-circuit duplicate renders in <1s; a non-`--skip-if-unchanged` invocation always re-renders and rewrites the cache.
29. **Cache key scope is beats + words only (1.5)** — The visible output is fully determined by `public/beats.json` and `public/timestamps.json`; changing `public/narration.mp3` or `public/sfx-ambient.mp3` does not change a single pixel. MP3 mtime+size is not a useful content hash (TTS re-exports produce different mtimes for identical bytes), so we deliberately exclude audio files from the cache key. If you change a SFX mapping in `src/lib/sceneSfx.ts` in a way that affects the visible render (e.g. a new whoosh SFX or a different default volume), bump `LAST_RENDER_HASH_VERSION` in `scripts/lastRenderHash.mjs` to invalidate all old caches automatically — the version prefix on the cached hash is compared on every read, and stale-version records are treated as "no cache" and fall through to a fresh render.
30. **Design system rules — portrait 1080×1920, white card on transparent overlay, `SceneTransition` owns entrance/exit, 30–40% entrance rule, Space Grotesk, accent palette, `rough-notation` from `@remotion/rough-notation`, `fitText` for headlines, `durationInFrames` forwarded as a prop.** The full 13-rule contract and the audit checklist live in the "Design System Rules" section near the top of this doc. Every component in `src/components/` conforms; new components MUST conform too. The next component you build (e.g. `quote_attribution`, `stat_pill`) should be a copy of `KeyStatement` with the per-type field set swapped out — do not invent a new layout. If a future component genuinely can't fit the contract, document the exception in this section before merging.
31. **`headline_card` is the canonical "copy-paste template" for new text-based beat types (2.1.1)** — `HeadlineCard.tsx` and `KeyStatement.tsx` are byte-for-byte identical on the design-system primitives (font, palette, card chrome, slider, shimmer, decorative dots, idle motion, 30–40% entrance rule). They differ only in: (a) headline sizing math (slightly larger `baseFontSize` / `emphasisFontSize` caps in `HeadlineCard`), and (b) `KeyStatement` has an `exitDirection` prop while `HeadlineCard` does not. Every text-based beat type added in 2.1 (`stat_pill`, `quote_attribution`, etc.) should start as a copy-paste of one of these two, swap in the per-type Zod schema in `src/beats/registry.ts`, and then iterate on the per-type visuals. Do not invent a new layout, font, or palette — the design system's whole point is that 16+ beat types look like one library.
32. **Registry unit tests are the type-system-equivalent guard, not a render guard (2.2)** — The 143-test Vitest suite in `src/beats/registry.test.ts` runs in `node` environment with no React, no jsdom, no visual regression. It catches schema regressions (`text: z.any()` replacing `text: z.string()`), registry/BeatType-union sync failures (a new type added without a registry entry or vice versa), `adaptMetadata` shape regressions (the Python pipeline's string `left`/`right` must be converted to `{label, value, items}` objects before reaching `VersusCard`), and `shouldShowKineticCaptions` gate drift. The suite runs in ~7s and is wired into `scripts/render-smoke.sh` as the first step, so a broken schema fails the smoke script before paying for the ~2-minute render. Tests are pure data — no file system, no network, no environment variables. The only non-trivial helper is `runTypeTests(config)`, which runs the same three-case pattern (valid / optional / invalid-path) for every registered beat type. Future test files (`src/lib/transitionDuration.test.ts`, `src/beats/words.test.ts`) should follow the same pattern: pure-data assertions against pure helpers, with the smoke script picking them up automatically via the `src/**/*.test.ts` glob in `vitest.config.ts`.

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

The Python pipeline emits `totalDurationInFrames: 1143` already accounting for the cross-fade overlap (`computeTransitionFrames` per pair). The orchestrator uses that value as-is, lays each beat at its `startFrame`, and lets the natural overlap produce the cross-fade. The first beat has no outgoing transition, so no whoosh plays for it; subsequent beats each play a whoosh in their last `transitionFrames` frames (≈4–15 frames, 0.13–0.5s at 30fps). Data-vis beats (`timeline` in this example) play a mouse-click per word in their captions via `BeatKineticCaptions`. The ambient track loops under everything for the full 1143 frames (~38 seconds). The audio streams (narration, ambient, per-transition whoosh, per-word click) all mount correctly because they live in the React tree, not in a side-channel log. There is no audio-plan-log file written; the Horizon 1.4 attempt to write one was cancelled (see 1.4 above for the reasoning). If you need per-mount audio observability in a future horizon, gate the verification on a full `npx remotion render` smoke test, not on `npx remotion still`.

**With Horizon 2.1.1 (`headline_card`) shipped**, the Python pipeline can now also emit:
```json
{ "type": "headline_card", "text": "Dick's just dropped 15% after missing its forecast", "emphasisWords": ["15%", "missing"], "startFrame": 0, "durationInFrames": 96 }
```
as the story hook for the first beat of the timeline. The orchestrator picks `HeadlineCard` from the registry, mounts it inside the existing `<SceneTransition>`, and renders the same white-card chrome / top accent bar / slider / shimmer / idle motion as `KeyStatement`, with the larger headline sizing that signals "this is the story's intro".

**With Horizon 2.1.2–2.1.7 shipped**, the Python pipeline can additionally emit the six new visual-vocabulary beat types — `stat_pill` (single big number with label), `quote_attribution` (multi-line quote with author), `compare_split` (two equal cards side-by-side), `location_pulse` (2D location callout cheaper than `map_3d`), `scrollytelling` (long-form text with scrolling body), and `ticker_tape` (bottom-of-screen news ticker). Each is a copy-paste of `HeadlineCard.tsx` on the design-system primitives with the per-type field set swapped out, and each is registered in `src/beats/registry.ts` with its own Zod schema. The orchestrator picks the right component automatically via `getBeatComponent(beat.type)`; no orchestrator change is needed to enable a new beat type, only the registry entry and the test composition in `Root.tsx`.

**With Horizon 2.2 shipped**, the same `npm test` (or `./scripts/render-smoke.sh`) invocation that you use to verify a render now also verifies the registry contract: per-type schemas accept valid fixtures, reject wrong-type values with the correct field path, and the 20-type `BeatType` union is in lock-step with the 20-entry registry. A test that takes 7s and runs on every commit is the new fastest way to catch a schema regression before it makes it to a render.
