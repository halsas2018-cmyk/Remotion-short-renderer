# Kinetic Typo Vid — Roadmap & Next-Phase Plan

This document outlines what to build after the renderer successfully produces a single video end-to-end. It is organized into 7 horizons, each independently shippable, so you can stop after any horizon and still have a useful system.

---

## Horizon 0 — Renderer Hardening (next, ~1–2 days)

The render pipeline is now functioning but fragile. Lock in stability before adding new features.

### 0.1 Replace stale fallback with a proper `Composition`-level `defaultProps` story
- `Root.tsx::renderDataCalculateMetadata` returns `durationInFrames: 1` when the fetch fails. The render proceeds, so the user gets a useless 1-frame MP4 with no error.
- Replace the silent fallback with: throw an `Error` in the fetch path that contains the HTTP status + filename, surface it via Remotion's render log, and document the failure mode in `CLAUDE.md`.
- Add a smoke-test render command (`scripts/render-smoke.sh`) that runs `npx remotion render MotionGraphicsVideo` and asserts the output is `>= 60 frames`.

### 0.2 Validate `beats.json` schema at fetch time
- `Root.tsx` currently only checks three top-level fields (`fps`, `totalDurationInFrames`, `beats`).
- Define a full Zod schema for `TimedBeats` in `src/beats/types.ts` and validate the parsed JSON in `renderDataCalculateMetadata` before injecting into props.
- On Zod failure, throw with the path of the first invalid field so the Python pipeline logs point to the exact problem.

### 0.3 Validate `timestamps.json` schema
- `Word[]` is currently cast to `Word[]` with no runtime check.
- Add a Zod schema, validate at fetch time, and dedupe overlapping/zero-duration word entries (WhisperX sometimes produces them).

### 0.4 Add render-time logs around the new audio streams
- Each `<Audio>` in the orchestrator should emit a one-line log on mount with the resolved URL, volume, and (for typing clicks) the word's start frame. This makes it trivial to correlate render output with frame ranges when debugging.
- Remove the `console.warn` "props.beats is empty" branch in `MotionGraphicsVideo::calculateMetadata` once the upstream fetch becomes a hard error (0.1).

### 0.5 Persist the last-rendered composition hash
- Write the SHA-256 of `beats.json` + `timestamps.json` to `out/last-render.json` after a successful render. The next render compares it and skips work if nothing changed (saves ~5 min of ffmpeg time on duplicate renders).

---

## Horizon 1 — Batch Renderer + Web UI (1–2 weeks)

A single video takes ~2 minutes to render locally. To actually produce a daily YouTube Shorts feed, you need a batch loop and a way to monitor it.

### 1.1 Python batch driver (`render_batch.py`)
- Reads a list of story IDs from `output/DD_MM_short_vids/_queue.json` (the pipeline already produces this).
- For each story: copy `narration.mp3` / `beats.json` / `timestamps.json` / `sfx-ambient.mp3` into `my-video/public/`, run `npx remotion render MotionGraphicsVideo out/{story_id}.mp4`, then move the output to `output/DD_MM_short_vids/{story_id}.mp4`.
- Concurrency: render N videos in parallel where N = `min(stories_remaining, cpu_count - 1)`. Use `subprocess.Popen` + a `multiprocessing.Pool` of watchers.
- Retry: up to 2 retries per story on transient failure (ffmpeg OOM, mediabunny chunk error).

### 1.2 Render dashboard (Next.js + WebSocket, `apps/dashboard/`)
- Two pages: **Queue** (shows pending / in-progress / completed) and **Renders** (shows each video with a thumbnail + duration + error log).
- Backend: FastAPI on `:8000`, reading from `output/DD_MM_short_vids/_render_log.jsonl` (one JSON line per render).
- Live status: WebSocket pushes each new log line to the dashboard. The renderer batch driver appends to the log file as it goes.
- Thumbnail generation: spawn `npx remotion still MotionGraphicsVideo out/thumb.png --frame=60` after each successful render and upload to S3 / local `out/thumbs/`.

### 1.3 Cost ceiling
- 4 concurrent renders × 2 min = 30 videos/hour.
- Daily target: 6 videos → 12 minutes of wall time. Within budget.

---

## Horizon 2 — Component Coverage (2–3 weeks)

The 13 beat types in the registry are mostly cosmetic variants of three primitives: text-over-card, bar/number, and 3D scene. The next round of components adds the visual vocabulary needed for news stories that aren't finance / tech.

### 2.1 New beat types (in priority order)
| Type | When to use it | Component |
|---|---|---|
| `headline_card` | Big-text intro beat (story hook) | `src/components/HeadlineCard.tsx` |
| `stat_pill` | Single big number with label | reuse `ChartCounter`, add `StatPill` variant |
| `quote_attribution` | Multi-line quote with author avatar | `src/components/QuoteAttribution.tsx` |
| `compare_split` | Side-by-side comparison without versus framing | reuse `BeforeAfter` with horizontal split |
| `location_pulse` | Generic 2D location callout (cheaper than `Map3D`) | `src/components/LocationPulse.tsx` |
| `image_card` | AI-generated or news-photo with caption | `src/components/ImageCard.tsx` |
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

---

## Horizon 3 — Asset Pipeline (1–2 weeks)

Right now every video is rendered with the same 3D voxel logo and the same ambient track. The next round produces per-story assets.

### 3.1 Stock-photo fetcher (`image_fetcher.py`)
- For each story, query Pexels API for 2–3 photos matching the headline.
- Store as `output/DD_MM_short_vids/{story_id}/images/{0,1,2}.jpg`.
- Reference from `beats.json` via the new `image_card` beat type (2.1).

### 3.2 Per-story ambient track
- The current `sfx-ambient.mp3` is a single generic bed. Replace with per-story variants:
  - `ambient_tech.mp3` (synth pad, hi-tech)
  - `ambient_calm.mp3` (soft piano)
  - `ambient_urgent.mp3` (drone + ticking)
- Python pipeline picks the variant based on the story's `category` (from `news_fetcher.py::score_story`).
- Add `AMBIENT_SFX_URL` to be parameterized via `defaultProps` rather than hard-coded in `sceneSfx.ts`.

### 3.3 Logo variants
- `S-NEWS` is the placeholder brand. Add a generic `Logo` system that takes a `name` + `theme` prop:
  - `name="Bloomberg"` → orange + black, "BBG"
  - `name="Wired"` → magenta + white, "WIRED"
- This requires a font loader for the brand font; use `@remotion/google-fonts` to load it per render.

### 3.4 Localized SFX library
- Add 3–4 whoosh variants (short, long, rising, falling) so cross-fades don't all sound the same.
- Pick the variant per-beat-pair based on the beat types (`map_3d` → rising, `chart_line` → short, etc.).

---

## Horizon 4 — Smart Beat Generation (2–3 weeks)

The current `beat_generator.py` uses a single LLM call to assign beat types to word chunks. This produces monotonous sequences ("key_statement, icon_text, key_statement, icon_text, ..."). The next round introduces:

### 4.1 Story-level visual planning
- Before per-beat generation, run a second LLM pass that produces a **story arc** — 1 intro beat, 1–2 explanation beats, 1 climax beat, 1 outro beat.
- Pass this arc to the per-beat generator as a constraint, so the output is structured rather than homogeneous.

### 4.2 Beat type diversity budget
- The per-beat prompt should be told: "this story must include at least one of each: `chart_line`, `map_3d`, `quote_attribution`". This forces visual variety.

### 4.3 Beat length auto-tuning
- Currently the Python script produces ~1.5–4s beats. Some stories (long quotes) need 6s beats; others (rapid stat callouts) need 0.8s beats.
- Compute target `durationInFrames` per-beat based on the word count: `frames = max(45, min(180, wordCount * 4.5))` (≈ 1.5–6s at 30fps).
- The orchestrator's `computeTransitionFrames` already handles the cross-fade math, so the only change is in Python.

### 4.4 Auto-pacing based on word density
- A "rapid-fire" beat sequence (e.g. 5 short stat callouts) should use shorter durations than a single long quote. The Python pipeline should output a per-beat `pacing` hint ("slow" / "normal" / "fast") and the orchestrator should adjust `durationInFrames` accordingly.

### 4.5 Visual reference images for the LLM
- When generating beats for a `map_3d` beat, include 1–2 reference screenshots of the existing `Map3D` component so the LLM understands what the rendered output looks like and produces appropriate `locationName` + `latitude`/`longitude` + `buildings` metadata.

---

## Horizon 5 — Interaction, Player, and Analytics (1–2 weeks)

The current system produces static MP4s. Adding interactivity makes the pipeline more useful for in-app previews and for measuring which beats work.

### 5.1 `<Player />` integration in the dashboard
- Use `@remotion/player` to embed the live composition in the dashboard.
- Each beat type becomes a button — clicking a button shows a single-beat preview with the metadata editor.
- This also serves as the **Studio replacement** for the current `*Test` compositions in `Root.tsx`.

### 5.2 Per-beat heatmap
- Render each beat as a separate composition (`MotionGraphicsBeat`) with its own `<Player />`.
- Add a "most-watched beat" tracker: a small `<Video>` from `@remotion/media` records user dwell time per beat and writes to the dashboard backend.

### 5.3 A/B testing the captions gate
- Currently the `CAPTION_VISIBLE_BEAT_TYPES` set is hard-coded. Add a `defaultProps` flag `showAllCaptions: boolean` and an A/B test that renders both variants for 10% of stories, then measures watch-through rate.
- The flag should be controlled via `defaultProps` so it can be flipped from Studio without code changes.

### 5.4 Component-level analytics
- Add a `useComponentTelemetry(name)` hook that reports which components are mounted at which frames. Useful for finding under-used beat types.

---

## Horizon 6 — Multi-Story Compositions (1 week)

The current `MotionGraphicsVideo` is one story. YouTube Shorts channels often combine 2–3 stories into a single video.

### 6.1 `<TransitionSeries>` of `<MotionGraphicsVideo>`-s
- Each story becomes a sub-composition (`<Composition id="StoryA" component={MotionGraphicsVideo} />`).
- The orchestrator renders an outer `<TransitionSeries>` of story-level `<TransitionSeries.Sequence>`s with a 1-second `wipe` transition between them.
- Add a `TickerTape` overlay (from 2.1) at the bottom of every story beat that lists the upcoming stories.

### 6.2 Intro / outro cards
- The first `<Sequence>` is a `<HeadlineCard>` introducing the channel.
- The last `<Sequence>` is a `<QuoteAttribution>` asking for subscribers.
- Both are zero-cost additions — just more beat types.

### 6.3 Per-story vertical-format switch
- YouTube Shorts (1080×1920), TikTok (1080×1920), Instagram Reels (1080×1920) — same. But X / Twitter prefers 1080×1350 (4:5) and YouTube long-form prefers 1920×1080 (16:9).
- Add a `format` prop to the composition that re-scales the layout (caption position, logo size, padding) for the target aspect ratio.

---

## Horizon 7 — Production Hardening (ongoing)

### 7.1 CI / CD
- GitHub Actions workflow: on every PR, run `npx remotion render MotionGraphicsVideo` against a sample `beats.json` and check the output duration is > 60 frames.
- On merge to `main`, build a `my-video` Docker image with the same Chromium headless shell Remotion uses.

### 7.2 Cost monitoring
- Track ffmpeg wall time per render. Alert if p95 exceeds 5 minutes (the ffmpeg pipeline should be sub-3-minute on a 6-core machine).
- Track LLM token usage from `llm_ranker.py` and `beat_generator.py`. Alert if daily spend exceeds $5.

### 7.3 Content moderation
- The news fetcher returns stories from RSS / Reddit. Add a pre-render moderation step that filters out:
  - Stories with banned keywords (configurable list in `config/moderation.txt`)
  - Stories where the LLM-rated `is_political` probability > 0.7
- Add a `dry_run` mode to `render_batch.py` that produces a list of pending renders without actually rendering, so a human can review before committing compute.

### 7.4 Auto-publish to YouTube
- After a successful render, upload the MP4 to YouTube via the YouTube Data API v3.
- Title format: `{headline} | S-NEWS Shorts`
- Tags: derived from the story's `category` + `source_name`
- Schedule for 9am ET daily. Add the upload to a `out/upload_log.jsonl` so it can be retried.

### 7.5 Failure-mode playbook
Write `docs/FAILURE_MODES.md` covering:
- "ffmpeg out of memory" → reduce `concurrency`, retry
- "Zod validation failed" → check the Python output for that story
- "mediabunny Cannot write to a closing writable stream" → see the typing-click fix in commit bca9134; if it recurs, also widen the whoosh sequence to 4 frames
- "404 on /public/beats.json" → check `public/` has the file; the orchestrator does not auto-recover

### 7.6 End-to-end test
- A single script `scripts/e2e.sh` that:
  1. Runs `python -m run_pipeline` with a fixture story
  2. Copies the outputs into `my-video/public/`
  3. Runs `npx remotion render MotionGraphicsVideo out/e2e.mp4`
  4. Asserts the output is > 60 frames
  5. Uploads to a test S3 bucket
- Runs in CI on every release branch.

---

## Open Questions (resolve before Horizon 4)

1. **LLM cost ceiling**: How much are you willing to spend per story? This determines whether you can run the multi-pass story-arc planning (4.1) at scale.
2. **Brand identity**: Is `S-NEWS` the permanent brand, or a placeholder? If placeholder, the logo variants in 3.3 are higher priority.
3. **Hosting**: Self-host the dashboard (FastAPI + SQLite) or use a managed service (Vercel + Supabase)? Affects how 1.2 is implemented.
4. **YouTube API approval**: YouTube Data API requires OAuth approval for production upload. Start the application process now if you haven't.
5. **Content rights**: Confirm that the news sources you're aggregating allow derivative video content. RSS feeds are usually fine; Reddit posts need attribution.

---

## Summary

| Horizon | Effort | Output |
|---|---|---|
| 0 — Renderer Hardening | 1–2 days | Stable, observable, deterministic renders |
| 1 — Batch Renderer + Web UI | 1–2 weeks | 6 videos/day, dashboard, monitoring |
| 2 — Component Coverage | 2–3 weeks | 13 beat types, idle motion library, emphasis text |
| 3 — Asset Pipeline | 1–2 weeks | Per-story photos, ambient tracks, logo variants |
| 4 — Smart Beat Generation | 2–3 weeks | Story-arc planning, diversity budget, auto-pacing |
| 5 — Interaction, Player, Analytics | 1–2 weeks | Live player, A/B testing, heatmap |
| 6 — Multi-Story Compositions | 1 week | 3-story Shorts, format switching |
| 7 — Production Hardening | ongoing | CI/CD, moderation, auto-publish, e2e tests |

The critical path is **Horizon 0 → 1 → 4 → 7** (in that order). Everything else is parallelizable or deferrable.
