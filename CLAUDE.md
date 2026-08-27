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
- `startFrame`: Frame number where the beat begins
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
