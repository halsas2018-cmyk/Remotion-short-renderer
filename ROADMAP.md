# Kinetic Typo Vid — Roadmap & Next-Phase Plan

This document outlines what to build after the renderer successfully produces a single video end-to-end. Each horizon is independently shippable, so you can stop after any horizon and still have a useful system.

**Money lens (read this first):** anything that touches a paid API, a hosted service, or compute you don't already own is **deferred to a later horizon** below. The first three horizons are pure-local, zero-cost, and can be done with the tools already in the repo. The later horizons call out the cost model explicitly so you can decide whether to fund them.

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
- **Horizon 0.1 — Hard-error fetch for render data** (replace silent fallback) — ✅ DONE

---

## Horizon 0 — Renderer Hardening (next, ~1–2 days, **$0**)

The render pipeline is now functioning but fragile. Lock in stability before adding new features. Everything here is local-only; no APIs, no hosting, no spend.

### 0.1 Replace silent fallback with a proper error — ✅ DONE
- `Root.tsx::renderDataCalculateMetadata` now THROWS on missing files, non-2xx responses, JSON parse errors, or top-level Zod schema failures. Error message includes `[MotionGraphicsVideo]` and the exact filename + HTTP status or Zod issue path.
- `scripts/render-smoke.sh` (new) renders a single frame at 0.2× scale and asserts the output is non-trivial in size. If the data files are missing, the smoke test fails fast with the new error message.
- `AbortingError` is still treated as benign (Studio prop change mid-fetch) and returns `null` so it doesn't spam the log.

### 0.2 Validate `beats.json` schema at fetch time
- `Root.tsx` currently only checks three top-level fields.
- Define a full Zod schema for `TimedBeats` in `src/beats/types.ts` and validate the parsed JSON in `renderDataCalculateMetadata` before injecting into props.
- On Zod failure, throw with the path of the first invalid field so the Python pipeline logs point to the exact problem.

### 0.3 Validate `timestamps.json` schema
- `Word[]` is currently cast with no runtime check.
- Add a Zod schema, validate at fetch time, and dedupe overlapping/zero-duration word entries (WhisperX sometimes produces them).

### 0.4 Add render-time logs around the new audio streams
- Each `<Audio>` in the orchestrator should emit a one-line log on mount with the resolved URL, volume, and (for typing clicks) the word's start frame. This makes it trivial to correlate render output with frame ranges when debugging.
- Remove the `console.warn` "props.beats is empty" branch in `MotionGraphicsVideo::calculateMetadata` once the upstream fetch becomes a hard error (0.1).

### 0.5 Cache the last-rendered composition hash
- Write the SHA-256 of `beats.json` + `timestamps.json` to `out/last-render.json` after a successful render. The next render compares it and skips work if nothing changed (saves ~5 min of ffmpeg time on duplicate renders).

---

## Horizon 1 — Local Batch Renderer (3–5 days, **$0**)

A single video takes ~2 minutes to render locally. You don't need a web UI to start producing a daily Shorts feed — a Python batch driver + `cron` is enough. The hosted dashboard is in Horizon 6.

### 1.1 Python batch driver (`render_batch.py`)
- Reads a list of story IDs from `output/DD_MM_short_vids/_queue.json` (the pipeline already produces this).
- For each story: copy `narration.mp3` / `beats.json` / `timestamps.json` / `sfx-ambient.mp3` into `my-video/public/`, run `npx remotion render MotionGraphicsVideo out/{story_id}.mp4`, then move the output to `output/DD_MM_short_vids/{story_id}.mp4`.
- Concurrency: render N videos in parallel where N = `min(stories_remaining, cpu_count - 1)`. Use `subprocess.Popen` + a `multiprocessing.Pool` of watchers.
- Retry: up to 2 retries per story on transient failure (ffmpeg OOM, mediabunny chunk error).

### 1.2 Local monitoring via plain log files
- Append one JSON line per render to `output/DD_MM_short_vids/_render_log.jsonl` (story_id, status, duration_seconds, error if any).
- `tail -f` + `jq` is the dashboard until Horizon 6.

### 1.3 `cron` schedule
- One daily cron entry runs `python -m run_pipeline && python -m render_batch`.
- The local machine is the render farm. If the queue grows faster than one machine can render in a day, that's a problem for Horizon 6 (managed runners).

### 1.4 Cost ceiling
- 4 concurrent renders × 2 min = 30 videos/hour on a single machine.
- Daily target: 6 videos → 12 minutes of wall time. Within budget on a laptop, no extra cost.

---

## Horizon 2 — Component Coverage + Better Visuals (1–2 weeks, **$0**)

The 13 beat types in the registry are mostly cosmetic variants of three primitives: text-over-card, bar/number, and 3D scene. The next round adds the visual vocabulary needed for news stories that aren't finance / tech. All components render with local assets (no stock-photo APIs, no Lottie CDN dependency).

### 2.1 New beat types (in priority order)
| Type | When to use it | Component |
|---|---|---|
| `headline_card` | Big-text intro beat (story hook) | `src/components/HeadlineCard.tsx` |
| `stat_pill` | Single big number with label | reuse `ChartCounter`, add `StatPill` variant |
| `quote_attribution` | Multi-line quote with author avatar | `src/components/QuoteAttribution.tsx` |
| `compare_split` | Side-by-side comparison without versus framing | reuse `BeforeAfter` with horizontal split |
| `location_pulse` | Generic 2D location callout (cheaper than `Map3D`) | `src/components/LocationPulse.tsx` |
| `image_card` | AI-generated or news-photo with caption | `src/components/ImageCard.tsx` (deferred until 4.x) |
| `scrollytelling` | Long-form beat with a scrolling text panel (for "explainers") | `src/components/Scrollytelling.tsx` |
| `ticker_tape` | Bottom-of-screen news ticker for multi-story intros | `src/components/TickerTape.tsx` |

### 2.2 Per-type metadata Zod schemas
- Each new component ships with a Zod schema in `src/beats/registry.ts` (already the pattern). Add unit tests in `src/beats/registry.test.ts` that feed in malformed metadata and assert the error message.
- Add round-trip tests: take a `Beat` from `output/.../_generated_log.json`, feed it through `validateBeatMetadata`, assert the parsed shape is what the component expects.

### 2.3 Idle motion library
- Many components currently sit still during the `idleProgress` phase (the middle 64% of a beat). Add a small set of reusable idle animations in `src/lib/idleMotion/`:
  - `breath` — gentle scale pulse
  - `drift` — small position oscillation
  - `shimmer` — highlight sweep across a card
- Components opt in by calling `useIdleMotion("breath")` inside a `<SceneTransition>`.

### 2.4 Beat-emphasis words → component-level highlights
- Currently the orchestrator passes `emphasisWords` to `KeyStatement` / `IconText` / `PlainText` for the "static" highlight rings.
- Extend the system: `versus`, `before_after`, `quote_card` should also accept `emphasisWords` and highlight the corresponding `value` / `label` / `quote` tokens.
- This requires the registry to add `emphasisWords` to each component's expected prop shape, and a small `<EmphasisText>` helper that draws the same Highlight / Circle / Underline annotation as `KineticCaptions` does.

### 2.5 Visual polish pass on existing components
- Walk through every `*Test` composition in `Root.tsx` and pick one beat type per day to improve visually. This is a "20% effort, 80% polish" loop that compounds.
- Track changes in a `components/CHANGELOG.md` so the visual language is consistent across the library.

---

## Horizon 3 — Smart Beat Generation (1–2 weeks, **$0–$5/day LLM spend**)

The current `beat_generator.py` uses a single LLM call to assign beat types to word chunks. This produces monotonous sequences ("key_statement, icon_text, key_statement, icon_text, ..."). The next round introduces story-level visual planning.

**Cost note:** every extra LLM call adds to your daily bill. Estimate before scaling: with `gpt-4o-mini` at ~$0.15/M input tokens, one extra pass over a 150-word script is ≈ $0.001 per story. Six stories/day = $0.006/day. Even with `gpt-4o` you're under $0.10/day. **Stay on `gpt-4o-mini` for everything in this horizon unless accuracy demands otherwise.**

### 3.1 Story-level visual planning
- Before per-beat generation, run a second LLM pass that produces a **story arc** — 1 intro beat, 1–2 explanation beats, 1 climax beat, 1 outro beat.
- Pass this arc to the per-beat generator as a constraint, so the output is structured rather than homogeneous.

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

## Horizon 4 — Local Asset Pipeline (1–2 weeks, **$0**)

Per-story assets, but generated locally so there are no API costs. **No stock-photo APIs in this horizon.**

### 4.1 Local image generator (`image_fetcher.py`)
- For each story, generate 2–3 AI images using a **local** Stable Diffusion install (e.g. `diffusers` + a quantized SDXL model, ~4 GB VRAM, ~30 s per image).
- OR pull a small set of pre-generated hero images from a local `assets/hero/` folder and pick by `category` (e.g. finance → "stock chart", tech → "circuit board").
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

## Horizon 6 — Hosted Web Dashboard & Multi-Story Compositions (1–2 weeks, **$10–$30/month**)

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

## Horizon 7 — Managed Render Farm (1 week, **$20–$100/month**)

Only do this if your local machine can't keep up. Most creators with one daily Short can stay on Horizon 1.

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

- **Stock-photo APIs (Pexels, Unsplash, Shutterstock):** either pay-per-call or rate-limited; replaced with local generation in 4.1.
- **Managed vector + raster map APIs (Mapbox, MapTiler paid tier):** the current `Map3D` uses 3D voxel renderers that don't need map tiles. The roadmap's `Map3D` is local-only.
- **ElevenLabs / paid TTS:** the current pipeline uses Microsoft Edge TTS (free). The voice quality is "good enough" for Shorts; revisit only if A/B testing shows paid TTS lifts retention.
- **WebGL/Three.js map effects:** the existing voxel `Map3D` is fast and free; a photorealistic 3D map would require a tile provider.
- **Real-time dashboard websocket fan-out (Pusher, Ably):** the local dashboard uses SSE in 6.1, which is free. Real-time fan-out to thousands of users is a problem for much later.
- **Cloud storage for renders (S3, GCS):** the current setup writes to local disk. If you outgrow that, the upload-to-YouTube flow in Horizon 8 already moves bytes off your machine.
- **Auto-publish to TikTok / Instagram:** those APIs are pay-walled and have stricter approval processes than YouTube. Deferred indefinitely.

---

## Open Questions (resolve before Horizon 3+)

1. **LLM cost ceiling**: How much are you willing to spend per story? This determines whether you can run the multi-pass story-arc planning (3.1) at scale. Default: stay on `gpt-4o-mini`, < $0.01/day.
2. **Brand identity**: Is `S-NEWS` the permanent brand, or a placeholder? If placeholder, the logo variants in 4.3 are higher priority.
3. **YouTube API approval**: YouTube Data API requires OAuth approval for production upload. Start the application process now if you haven't.
4. **Content rights**: Confirm that the news sources you're aggregating allow derivative video content. RSS feeds are usually fine; Reddit posts need attribution.
5. **Local GPU available?** A consumer GPU (≥ 6 GB VRAM) unlocks 4.1 (local SD). If you don't have one, 4.1 falls back to a curated `assets/hero/` folder.

---

## Summary

| Horizon | Effort | Cost | Output |
|---|---|---|---|
| 0 — Renderer Hardening | 1–2 days | $0 | Stable, observable, deterministic renders |
| 1 — Local Batch Renderer | 3–5 days | $0 | 6 videos/day on a laptop, log-file monitoring |
| 2 — Component Coverage | 1–2 weeks | $0 | 13 beat types, idle motion library, emphasis text |
| 3 — Smart Beat Generation | 1–2 weeks | $0–$5/day LLM | Story-arc planning, diversity budget, auto-pacing |
| 4 — Local Asset Pipeline | 1–2 weeks | $0 (needs local GPU for 4.1) | Local images, ambient tracks, logo variants |
| 5 — Interaction, Player, Analytics | 1–2 weeks | $0 | Local player, offline heatmap, file telemetry |
| 6 — Hosted Dashboard & Multi-Story | 1–2 weeks | $5–$30/month VPS | Web dashboard, intro/outro, format switch |
| 7 — Managed Render Farm | 1 week | $20–$100/month | Containerized renderer, push queue, alerts |
| 8 — YouTube Auto-Publish | 1 week | $0 (OAuth approval time) | Auto-upload + scheduling |
| 9 — E2E Tests, CI, Production Polish | ongoing | $0 (free CI minutes) | Visual regression, e2e script, release pipeline |

**The critical path is Horizon 0 → 1 → 2 → 3 → 4 → 5 → 8** (in that order). Horizons 6 and 7 are needed only when the local machine can't keep up with the daily queue.
