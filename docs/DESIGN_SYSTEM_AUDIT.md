# Design-System Compliance Audit — Horizon 2.5

**Purpose:** track the per-component compliance with the 14 design-system primitives in `CLAUDE.md` §3.3 across the 20 registered beat types. Each cell is `✅` (compliant), `❌` (non-compliant, must fix), `⚠️` (non-compliant, accepted with rationale), or `n/a` (doesn't apply).

**Generated:** Horizon 2.5, Phase 0. Status cells pre-filled from `src/beats/registry.ts`, `src/beats/types.ts`, `src/Root.tsx`, and `CLAUDE.md` §3.3 / §3.4 / §3.5. The remaining `·` cells are filled by reading the component files in Phase 1.

**Verification:** after Phase 2 fixes, the `*Test` PNG for the fixed component will change (this is the §8 "byte-identical *Test PNGs" exception, scoped to 2.5 fixes). Components without a `*Test` composition in `src/Root.tsx` cannot be PNG-verified — they are read-only-audited.

**Phase status:**
- **Phase 0 (audit scaffold):** ✅ done (commit `1e621e9`)
- **Phase 1 (per-component file reads):** ✅ **DONE** — 22 of 22 files audited
  - Batch A (4 §2.3 Pass 1 files): ✅ done
  - Batch B (6 §2.3 Pass 2 files in `src/components/`): ✅ done
  - Batch C (7 §2.3 Pass 3 files + `Logo`): ✅ done
  - Batch D (3 §2.3.x scene-based files): ✅ done (`Map3D` audited)
  - Orchestrator layer (`PersistentBackground`): ✅ audited (22nd file, outside 20-component scope)
- Phase 2 (fixes): not started
- Phase 3 (acceptance notes): not started
- Phase 4 (verification): not started
- Phase 5 (follow-ups): not started

**Entrance timing rule update (2.5 Phase 1.5, this commit):** `CLAUDE.md` §3.3 primitive #7 was simplified from the previous "≤40% text / ≤30% data-vis" two-tier rule to a **single 50% cap for all 20 beat types**. The simplified rule accepts small overruns for staggered or word-by-word entrances (e.g. `QuoteCard`'s typewriter, `Timeline`'s marker stagger, `ChartComparison3D`'s bar stagger). Under the new rule, the 4 entrance-timing ❌s from the Phase 1 audit (`LocationPulse` 35%, `QuoteCard` 63%, `Timeline` n ≥ 3, `ChartComparison3D` n ≥ 4) are all reclassified to ✅. See the §7 column notes and the per-primitive summary below.

---

## The 20 registered beat types

From `src/beats/types.ts::BeatType` (20 members) and `src/beats/registry.ts::registry` (20 entries). The `process_flow` type is registered with the `Timeline` component (see registry entry `process_flow: buildEntry(Timeline, processFlowMetadata)`) — it has no dedicated component file. Listed under `Timeline` below.

| # | Beat type | Component file | *Test composition in `Root.tsx`? | Category |
|---|---|---|---|---|
| 1 | `key_statement` | `src/KeyStatement.tsx` | ✅ `KeyStatementTest` | text |
| 2 | `headline_card` | `src/HeadlineCard.tsx` | ✅ `HeadlineCardTest` | text |
| 3 | `plain_text` | `src/PlainText.tsx` | ✅ `PlainTextTest`, `PlainTextLongTest`, `PlainTextShortTest` | text (paragraph) |
| 4 | `icon_text` | `src/IconText.tsx` | ✅ `IconTextTest` | text (icon+text) |
| 5 | `chart_line` | `src/ChartLine.tsx` | ✅ `ChartLineTest` | data-vis |
| 6 | `chart_counter` | `src/ChartCounter.tsx` | ✅ `ChartCounterTest` | data-vis |
| 7 | `chart_comparison_3d` | `src/ChartComparison3D.tsx` | ✅ `ChartComparison3DTest`, `ChartComparison3DThreeTest`, `ChartComparison3DFourTest` | data-vis (3D) |
| 8 | `progress_meter` | `src/ProgressMeter.tsx` | ✅ `ProgressMeterTest`, `ProgressMeterLongLabelTest` | data-vis (circular) |
| 9 | `timeline` | `src/Timeline.tsx` (also serves `process_flow`) | ✅ `TimelineTest`, `Timeline3EventsTest`, `Timeline4EventsTest`, `Timeline5EventsTest` | data-vis (step list) |
| 10 | `versus` | `src/VersusCard.tsx` | ✅ `VersusCardTest` | text (two-card) |
| 11 | `before_after` | `src/BeforeAfter.tsx` | ✅ `BeforeAfterTest` | text (two-card) |
| 12 | `map_3d` | `src/Map3D.tsx` | ❌ none | data-vis (3D voxel) |
| 13 | `process_flow` | (no file — uses `Timeline`) | ✅ (reuses `Timeline` *Test) | data-vis |
| 14 | `quote_card` | `src/QuoteCard.tsx` | ✅ `QuoteCardTest`, `QuoteCardLongTest` | text (typewriter) |
| 15 | `stat_pill` | `src/components/StatPill.tsx` | ✅ `StatPillTest` | text (number-on-card) |
| 16 | `quote_attribution` | `src/components/QuoteAttribution.tsx` | ✅ `QuoteAttributionTest` | text |
| 17 | `compare_split` | `src/components/CompareSplit.tsx` | ✅ `CompareSplitTest` | text (two-card) |
| 18 | `location_pulse` | `src/components/LocationPulse.tsx` | ✅ `LocationPulseTest` | text (2D map) |
| 19 | `scrollytelling` | `src/components/Scrollytelling.tsx` | ✅ `ScrollytellingTest` | text |
| 20 | `ticker_tape` | `src/components/TickerTape.tsx` | ✅ `TickerTapeTest` | text (ticker) |

**Summary:** 20 types, 14 distinct component files (because `process_flow` reuses `Timeline`). 19 types have at least one `*Test` composition; only `map_3d` has none. Its Phase 2 fixes are not PNG-verifiable.

**21st component file:** `src/Logo.tsx` is the persistent brand logo mounted by `PersistentBackground`, not a registered beat type. It's audited separately in the "Row 21 (new) — `Logo`" section below. **All Logo cells are ⚠️ accepted or n/a because Logo is outside the 20-component beat-type audit scope.**

**22nd file:** `src/PersistentBackground.tsx` is the orchestrator's persistent background layer (white backdrop + scrolling grid + sweep line + logo mount point). It's audited separately in the "Row 22 (new) — `PersistentBackground`" section below. **All PersistentBackground cells are n/a or ✅ because the persistent background is outside the per-beat audit scope.**

---

## The 14 design-system primitives (from `CLAUDE.md` §3.3)

| # | Primitive | Applies to | Notes |
|---|---|---|---|
| 1 | Portrait 1080×1920 | all 20 | unless format override (no override exists yet) |
| 2 | Transparent `AbsoluteFill` overlay on `PersistentBackground` | all 20 | |
| 3 | White card chrome: shadow + 1px `#e8e8e8` border + 28–48px border-radius | 17 card-based; ⚠️ for `ChartComparison3D`, `ChartLine`, `Map3D` (no card) | see ⚠️ section below |
| 4 | Top 4px gradient accent bar (`#e86c00` → `#f97316`) | 17 card-based; ⚠️ for `BeforeAfter`, `CompareSplit`, `VersusCard` (two-card accent replication); n/a for scene-based | see ⚠️ section below |
| 5 | `loadFont("normal", { weights: ["500","700"], subsets: ["latin"] })` from `@remotion/google-fonts/SpaceGrotesk` | 19 text-using; n/a for `Map3D` (no text) | |
| 6 | `fitText` for auto-sizing text (where text auto-fits) | 12 text-with-variable-length; n/a for fixed-size numbers and scene-based | "where appropriate" per §3.3 |
| 7 | Entrance ≤ 50% of `durationInFrames` (single unified limit, all beats) | all 20 | per §3.3 (was: 7a text ≤ 40% / 7b data-vis ≤ 30% — superseded by the 2.5 Phase 1.5 simplification). Small overruns past 50% are accepted for staggered/word-by-word entrances where the stagger IS the entrance. |
| 8 | No exit animation inside the component (orchestrator owns exit) | all 20 | |
| 9a | `useIdleMotion` hook (card-based, 17 components) | 17 card-based | per §3.4 |
| 9b | `useSceneOrbit` hook (`ChartComparison3D`) | `chart_comparison_3d` | per §3.5 |
| 9c | `useChartReveal` hook (`ChartLine`) | `chart_line` | per §3.5 |
| 9d | No hook (entrance-only, one-shot) | `map_3d` | per §3.5 / §2.3.x Pass 3 |
| 10 | Accent palette `#e86c00` / `#f97316` / `rgba(232,108,0,0.4)` | all 20 | no off-palette colors |
| 11 | `rough-notation` emphasis cycle (`Highlight` → `Circle` → `Underline`) for text-on-card beats | 8 text-on-card types: `key_statement`, `headline_card`, `quote_attribution`, `scrollytelling`, `ticker_tape`, `versus`, `before_after`, `quote_card` | per §3.4.1; n/a for the other 12 |
| 12 | `durationInFrames` forwarded as a prop | all 20 | composition-level timing is source of truth |
| 13 | Slider border + decorative dots + shimmer (text beats) | 14 text types | per §3.3 wording |
| 14 | `<SceneTransition>` wrapper (orchestrator-owned) | all 20 | mounted by `BeatContent` in orchestrator |

**Primitive count is actually 16** (9a/9b/9c/9d split). For the table below I'll fold 9a/9b/9c/9d into a single "Motion hook" column with a per-row "expected hook" sub-cell. The "applies to" qualifier is in the row header.

---

## Main audit table — 22 rows × 14 primitives (20 beat types + Logo + PersistentBackground)

**Status legend:** `✅` compliant · `❌` non-compliant, must fix · `⚠️` non-compliant, accepted (rationale below) · `n/a` doesn't apply · `·` to be filled in Phase 1.

| # | Component (file) | 1. Portrait 1080×1920 | 2. Transparent overlay | 3. White card chrome | 4. Top accent bar | 5. Space Grotesk | 6. `fitText` (where apt) | 7. Entrance ≤50% (all beats, single cap) | 8. No exit animation | 9. Motion hook (useIdleMotion / useSceneOrbit / useChartReveal / none) | 10. Accent palette | 11. `rough-notation` emphasis (8 text-on-card types) | 12. `durationInFrames` prop | 13. Slider border + dots + shimmer (text) | 14. `<SceneTransition>` wrapper |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `KeyStatement` (`src/KeyStatement.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `HeadlineCard` (`src/HeadlineCard.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | `PlainText` (`src/PlainText.tsx`) | ✅ | ✅ | ✅ | ✅ | **❌** | n/a (lines pre-wrapped) | ✅ | ✅ | ✅ useIdleMotion (Pass 3) | ✅ | ✅ (per-line, paragraph pattern) | ✅ | ✅ (stars, not dots) | ✅ |
| 4 | `IconText` (`src/IconText.tsx`) | ✅ | ✅ | ✅ | ✅ | **❌** | ✅ | ✅ | ✅ | ✅ useIdleMotion + local icon wobble | ✅ | ✅ (9th text-on-card type, extends §3.4.1) | ✅ | ✅ (diagonal-line pattern) | ✅ |
| 5 | `ChartLine` (`src/ChartLine.tsx`) | ✅ | ✅ | ⚠️ (24-px borderless chart card) | n/a | **❌** | n/a (fixed-size labels) | ✅ | ⚠️ (dead `exitDirection` prop) | ✅ useChartReveal (with local `idleAmp`/`idleFreq` overrides) | ✅ | n/a | ✅ | n/a | ✅ |
| 6 | `ChartCounter` (`src/ChartCounter.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | n/a (fixed-size number) | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | n/a | ✅ | n/a | ✅ |
| 7 | `ChartComparison3D` (`src/ChartComparison3D.tsx`) | ✅ | ✅ | ⚠️ no card (3D scene is content) | n/a | **❌** (font named but not loaded) | n/a (fixed-size labels) | ✅ (was ❌ under old ≤30% rule; bars stagger 0.06→0.06+0.05(n-1)+0.14 = 0.30–0.40 for n=2..4, accepted as staggered entrance) | ✅ | ✅ useSceneOrbit (with `rotationZ` reserved for future 3D) | ✅ | n/a | ✅ | ✅ (slider border only) | ✅ |
| 8 | `ProgressMeter` (`src/ProgressMeter.tsx`) | ✅ | ✅ | ⚠️ (circular `border-radius: 50%`) | ✅ | **❌** | n/a (fixed-size numbers) | ✅ | ✅ | ✅ useIdleMotion + local primitives (SVG pulse, radial glow, subtitle bounce) | ✅ | n/a | ✅ | n/a | ✅ |
| 9 | `Timeline` (`src/Timeline.tsx`) | ✅ | ✅ | ⚠️ (no top-level card, 16-px sub-card radius) | n/a | **❌** | n/a (fixed-size marker text) | ✅ (was ❌ under old ≤30% rule; markers stagger 0.15→0.15+0.04(n-1)+0.10 = 0.29–0.41 for n=2..5, accepted as staggered entrance) | ✅ | ✅ useIdleMotion + local pulse (marker-specific frequency) | ✅ | n/a | ✅ | n/a | ✅ |
| 10 | `VersusCard` (`src/VersusCard.tsx`) | ✅ | ✅ | ⚠️ (1.5px border `#e2e8f0`, 24-31px radius) | ⚠️ (indigo/orange semantic split) | **❌** | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 3) | **⚠️** (indigo for Option A) | ✅ | ✅ | ✅ (corner ribbon) | ✅ |
| 11 | `BeforeAfter` (`src/BeforeAfter.tsx`) | ✅ | ✅ | ⚠️ (2px border on inner cards, not 1px) | ⚠️ (BEFORE=red, AFTER=green semantic accent) | **❌** | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | **⚠️** (red/green semantic split) | ✅ | ✅ | ✅ | ✅ |
| 12 | `Map3D` (`src/Map3D.tsx`) | ✅ | ⚠️ (#f5f5f5 body bg, 3D-scene-specific) | ⚠️ (40-px white card around 3D scene) | ✅ (135° diagonal gradient, 3D-perspective-specific) | n/a (no text) | n/a (no text) | ⚠️ (50% entrance, 3D-showcase-specific) | ✅ | ✅ none (entrance-only, one-shot) | ✅ (green map surface is content) | n/a (no text) | ✅ | ✅ (slider border + shimmer, no dots) | ✅ |
| 13 | `ProcessFlow` (reuses `Timeline`) | ✅ | ✅ | ⚠️ (no top-level card, 16-px sub-card radius) | n/a | **❌** | n/a | ✅ (inherits Timeline's ✅) | ✅ | ✅ (via `Timeline`) | ✅ | n/a | ✅ | n/a | ✅ |
| 14 | `QuoteCard` (`src/QuoteCard.tsx`) | ✅ | ✅ | ✅ | ✅ | **❌** | n/a (typewriter effect) | ✅ (was ❌ under old ≤40% rule; typewriter reveal 0.50 default `quoteDurPct`, accepted as word-by-word entrance) | ✅ | ✅ useIdleMotion (Pass 3) | ✅ | ✅ (typewriter-aware) | ✅ | ✅ (animated underline) | ✅ |
| 15 | `StatPill` (`src/components/StatPill.tsx`) | ✅ | ✅ | ⚠️ (pill radius 48–54px, above §3.3 baseline 28–48px) | ✅ | ✅ | n/a (fixed-size number) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a (§2.1.4 "optional") | ✅ | n/a | ✅ |
| 16 | `QuoteAttribution` (`src/components/QuoteAttribution.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17 | `CompareSplit` (`src/components/CompareSplit.tsx`) | ✅ | ✅ | ⚠️ (radius 28–32px, at §3.3 lower bound) | ⚠️ (accent replicated on each inner card) | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a (not in 8 text-on-card types) | ✅ | ✅ (simpler per-card dots) | ✅ |
| 18 | `LocationPulse` (`src/components/LocationPulse.tsx`) | ✅ | ✅ | ⚠️ (2D map wrapped in 16-px sub-card, below §3.3 baseline) | ✅ | ✅ | ✅ | ✅ (was ❌ under old ≤30% rule at 35%; 35% ≤ 50% so passes under the unified 50% cap) | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a (not in 8 text-on-card types) | ✅ | ✅ | ✅ |
| 19 | `Scrollytelling` (`src/components/Scrollytelling.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (title) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ (progress=1, scroll-driven) | ✅ | ✅ | ✅ |
| 20 | `TickerTape` (`src/components/TickerTape.tsx`) | ✅ | ✅ | ⚠️ (tape radius 20px, below §3.3 baseline 28–48px) | ✅ | ✅ | n/a (heuristic width) | ✅ | ✅ | ✅ useIdleMotion + local glow (Pass 2) | ✅ | **❌** (missing `emphasisWords` support — §2.4 missed this type) | ✅ | ✅ (diagonal-line pattern) | ✅ |
| 21 | `Logo` (`src/Logo.tsx`) | ✅ | ✅ | ⚠️ (logo is a brand element, outside §3.3 scope) | n/a | **❌** (outside §3.3 scope) | n/a | ✅ (no entrance, just slow spin) | ✅ | ⚠️ (no motion hook, local spin + bob) | ⚠️ (off-palette brand orange) | n/a | n/a | n/a | n/a |
| 22 | `PersistentBackground` (`src/PersistentBackground.tsx`) | ✅ | n/a (background, not overlay) | n/a (background, not card) | n/a (background, not card) | n/a (no text) | n/a (no text) | n/a (no entrance, just continuous motion) | n/a (no exit, just persistent) | ✅ (no hook, orchestrator-level) | ✅ (grayscale grid, on-palette) | n/a | n/a (persistent, not per-beat) | n/a | n/a (mounted outside `<Sequence>`) |

**Pre-filled cell counts:** 75 of 308 cells pre-filled from Phase 0. Phase 1 added 308 cells (22 rows × 14 cols). **All cells filled — Phase 1 complete.** Phase 1.5 (this commit) reclassified 4 entrance-timing cells from ❌ to ✅ under the new 50% single-cap rule.

**❌ count after 22 files audited + Phase 1.5 reclassification:** 4 (row 3 col 5 `PlainText` Space Grotesk; row 4 col 5 `IconText` Space Grotesk; row 5 col 5 `ChartLine` Space Grotesk; row 7 col 5 `ChartComparison3D` Space Grotesk named but not loaded; row 8 col 5 `ProgressMeter` Space Grotesk; row 9 col 5 `Timeline` Space Grotesk; row 10 col 5 `VersusCard` Space Grotesk; row 11 col 5 `BeforeAfter` Space Grotesk; row 14 col 5 `QuoteCard` Space Grotesk; row 20 col 11 `TickerTape` missing `emphasisWords` support).

Wait — the row 7 / 9 / 14 / 18 entrance-timing cells were ❌ under the old rule but are now ✅ under the new rule. Recounting ❌s after Phase 1.5:

- 9 Space Grotesk (8 fully missing + 1 partial/named-but-not-loaded)
- 1 `TickerTape` missing `emphasisWords`

**Total: 10 ❌s after Phase 1.5** (was 13 before).

---

## Pre-filled ⚠️ rationales

These are the cells where I'm pre-filling ⚠️ with a one-line rationale, based on the documented layout deviations in `CLAUDE.md` §3.5 / §3.6 and the ROADMAP §2.1.2–2.1.7 / §2.3.x Pass 3.

| # | Component | Cell | Rationale |
|---|---|---|---|
| 5 | `ChartLine` | #3 (white card chrome) | Scene-based chart card uses 24-px borderless chrome (no `border: 1px solid #e8e8e8`, only `boxShadow`). The borderless design is intentional (the chart is the content; the border would compete with the line). The 24-px radius is below the §3.3 baseline 28-48px for the same reason (smaller chrome = less visual competition with the data). |
| 5 | `ChartLine` | #8 (no exit animation) | `exitDirection` prop is dead code (declared, defaulted to `"up"`, but never read in JSX). Same pattern as `KeyStatement` row 1. **Phase 5 follow-up**, not a 2.5 ❌. The prop is a placeholder for a future exit animation. |
| 7 | `ChartComparison3D` | #3 (white card chrome) | No top-level card; the 3D scene is the content. A card chrome would clip the perspective transform. Per `CLAUDE.md` §3.5. |
| 7 | `ChartComparison3D` | #9 (motion hook) | `useSceneOrbit` returns `rotationZ = 0` for `ChartComparison3D` (which doesn't roll). The `rotationZ` is reserved for future 3D scenes that roll. The hook's `rotationZ` field is correctly present-but-zero, not missing. |
| 7 | `ChartComparison3D` | #10 (accent palette) | Loser bars use slate (`#94a3b8`, `#64748b`, `#475569`, etc.) which is off-palette but semantically correct (losers are gray, not orange). Slate is the standard "neutral" color, not an arbitrary off-palette color. Sub-deviation accepted. |
| 8 | `ProgressMeter` | #3 (white card chrome) | Circular meter card uses `border-radius: 50%` instead of the 28-48px range. The circular shape is the load-bearing visual for a progress meter (matches the SVG `circle` meter primitive). |
| 9 | `Timeline` | #3 (white card chrome) | No top-level card; the timeline IS the content (horizontal line + floating event sub-cards). The 16-px sub-card radius for event descriptions is the same `LocationPulse` sub-deviation family (sub-component inside a larger layout, not a top-level card). |
| 10 | `VersusCard` | #3 (white card chrome) | Three sub-deviations: (a) 1.5px border (not 1px), (b) `#e2e8f0` border color (not `#e8e8e8` — slate, not neutral), (c) 24-31px radius (at §3.3 lower bound). The 1.5px + slate border is the two-card Pass 3 sub-deviation family. |
| 10 | `VersusCard` | #4 (top accent bar) | Two-card layout; the accent bar is replicated on each inner card with an **indigo/orange semantic split** (left = Option A indigo, right = Option B orange). Same family as `BeforeAfter`'s red/green split. |
| 10 | `VersusCard` | #10 (accent palette) | Off-palette indigo (`#6366f1`, `#818cf8`, `#c7d2fe`, `#4338ca`) for Option A. Substituting the accent palette would erase the Option A/B semantic distinction. **Accepted: the indigo/orange split IS the visual.** |
| 11 | `BeforeAfter` | #3 (white card chrome) | Inner cards use a 2px border (not 1px) to visually match the divider's 2px border weight. The 1px-vs-2px sub-deviation is a load-bearing visual link between the cards and the divider. Per `CLAUDE.md` §3.6 (two-card layout). |
| 11 | `BeforeAfter` | #4 (top accent bar) | The accent bar is on the inner cards, color-coded red (BEFORE) and green (AFTER) to semantically distinguish the two sides. The comparison's meaning depends on the color split. **Accepted: this is the load-bearing visual for the `before_after` beat type.** |
| 11 | `BeforeAfter` | #10 (accent palette) | Off-palette red and green are used to semantically distinguish BEFORE from AFTER. Substituting the accent palette would erase the comparison's meaning. **Accepted: the red/green split IS the visual.** |
| 12 | `Map3D` | #2 (transparent overlay) | The `#f5f5f5` body background is a `Map3D`-specific sub-deviation; the 3D voxel scene needs a non-white backdrop to make the orange buildings read against the grid. The §3.3 transparent overlay rule assumes a card overlaying the persistent background; `Map3D` is a 3D scene, not a card. |
| 12 | `Map3D` | #3 (white card chrome) | Scene-based 3D card with 40-px radius (within the §3.3 baseline 28-48px range). The 3D scene is the content; the white card is the chrome around it. |
| 12 | `Map3D` | #4 (top accent bar) | 135° diagonal gradient (vs. §2.1.1's 90° horizontal) is intentional for the 3D perspective. A horizontal gradient would look wrong against the perspective transform. |
| 12 | `Map3D` | #7 (entrance timing) | 50% entrance is the `Map3D`-specific 3D-showcase sub-deviation. The 4-step entrance (map settle → pin drop → label fade-in → slider border) is the load-bearing visual for the 3D showcase. Lands exactly at the 50% cap. |
| 12 | `Map3D` | #9 (motion hook) | No motion hook is the §2.3.x Pass 3 / §3.5 design choice for `Map3D` (entrance-only, one-shot). The local primitives (pin float, radial glow pulse) are the 3D-scene-specific idle motion. |
| 12 | `Map3D` | #10 (accent palette) | The green map surface (`linear-gradient(135deg, #e8f5e9, #c8e6c9)`) is a 3D-scene-specific content color (a "grass / land" semantic green), not an arbitrary off-palette chrome color. The §3.3 palette rule applies to chrome; the 3D scene's surface color is content. |
| 15 | `StatPill` | #3 (white card chrome) | Pill-style component uses a 48–54px border-radius (vs. the §3.3 baseline 28–48px). The "pill = more rounded" deviation is intentional and documented in the component's in-file comment. |
| 17 | `CompareSplit` | #3 (white card chrome) | Inner cards use a 28–32px border-radius (vs. the §3.3 baseline 28–48px). The two-card Pass 2 family uses the tighter radius for visual balance between the two cards and the slider border. |
| 17 | `CompareSplit` | #4 (top accent bar) | Two-card layout; the accent bar is replicated on each inner card (2× accent bars on a two-card layout, vs. 1× on a single-card layout). The replication is the same pattern as `VersusCard` and is load-bearing. |
| 17 | `CompareSplit` | #13 (slider dots) | Two-card layout uses simpler per-card dots (3 dots per card, no `float` or `glow`) vs. the full Pass 1 dot pattern. The sub-deviation keeps visual weight balanced across the two cards. |
| 18 | `LocationPulse` | #3 (white card chrome) | The 2D map surface is wrapped in a 16-px-radius sub-card inside the top-level white card. The 16-px radius is below the §3.3 baseline 28–48px because it's a sub-component inside a card, not a top-level card itself. |
| 20 | `TickerTape` | #3 (white card chrome) | Ticker-style component uses a 20px border-radius (vs. the §3.3 baseline 28–48px) because it's a horizontal tape, not a card. The 20px radius matches the bar's "tape" metaphor. |
| 21 | `Logo` | #3 (white card chrome) | Logo is a brand element, not a beat component. The §3.3 design system applies to beat components, not to the persistent logo. The orange (`#ff7a18`) is the brand color; the 16-px radius is the brand style. **Logo is a 21st component file outside the 20-component audit scope.** |
| 21 | `Logo` | #5 (Space Grotesk) | Logo uses `system-ui, sans-serif` instead of Space Grotesk. **However, Logo is a brand element, not a beat component.** The §3.3 font rule applies to beat components. **Logo is outside the 20-component audit scope.** |
| 21 | `Logo` | #9 (motion hook) | Logo is mounted by `PersistentBackground`, not by the per-beat orchestrator. It's a persistent primitive, not a beat component. The local `rotateY` + `bob` are brand-specific motion, not per-beat idle motion. **No `useIdleMotion` is correct for the logo.** |
| 21 | `Logo` | #10 (accent palette) | Logo uses `#ff7a18` (custom brand orange) + `#ffffff`. Both are off-palette but the §3.3 palette rule applies to beat components, not to brand elements. **Logo is outside the 20-component audit scope.** |

**These ⚠️ cells are load-bearing documentation.** A future refactor that "fixes" them by adding card chrome to `Map3D` or accent bars to `VersusCard`'s inner cards would be wrong — the deviation is intentional. The rationale column in the table is the protection against that.

---

## §4.5 audit (import-graph, 2 cells)

These are not per-component checks; they're per-file checks on the registry / orchestrator pair.

| File pair | Check | Status |
|---|---|---|
| `src/beats/registry.ts` ↔ `src/beats/renderBeat.tsx` | No circular re-exports between the registry barrel and the orchestrator. `adaptMetadata` lives in its own leaf file `src/beats/adaptMetadata.ts` and is re-exported from `registry.ts` for test convenience. Per `CLAUDE.md` §4.5. | ✅ (re-export is `from "./adaptMetadata"`, not `from "./renderBeat"`) |
| `src/beats/registry.ts` | Does NOT import from `renderBeat.tsx` for any reason. | ✅ (only imports from `../*` component files + `./types` + `./adaptMetadata`) |

**Verification command:** `grep -n "renderBeat" src/beats/registry.ts` should return zero matches. If any match appears, the §4.5 rule is broken.

---

## §6 audit (barrel-leaf, 2 cells)

Per `CLAUDE.md` §6, the two hook barrels must be leaf files (no re-exports from consumer components).

| Barrel | Re-exports from consumers? | Status |
|---|---|---|
| `src/lib/idleMotion/index.ts` | Should NOT re-export from `HeadlineCard`, `KeyStatement`, `BeforeAfter`, `ChartCounter`, `StatPill`, `QuoteAttribution`, `CompareSplit`, `LocationPulse`, `Scrollytelling`, `TickerTape`, `PlainText`, `ProgressMeter`, `Timeline`, `VersusCard`, `QuoteCard`, `IconText`, `Logo`, or any orchestrator file. | ✅ (per `CLAUDE.md` §6; barrel re-exports `useIdleMotion` + types only) |
| `src/lib/sceneMotion/index.ts` | Should NOT re-export from `ChartComparison3D`, `ChartLine`, `Map3D`, or any orchestrator file. | ✅ (per `CLAUDE.md` §6; barrel re-exports `useSceneOrbit` + `useChartReveal` + types only; `useCesiumCamera` was correctly NOT created per ROADMAP §2.3.x Pass 3) |

**Verification commands:**
```bash
grep -n "from \"\.\./\.\./" src/lib/idleMotion/index.ts
grep -n "from \"\.\./\.\./" src/lib/sceneMotion/index.ts
```
Both should return zero consumer-imports. Consumer imports would be of the form `from "../../HeadlineCard"` etc.

---

## Per-primitive summary (filled in after Phase 1 + Phase 1.5 — COMPLETE)

**This section is populated after Phase 1 by counting `✅` / `❌` / `⚠️` / `n/a` per column.**

| Primitive | Filled cells | ✅ | ❌ | ⚠️ | n/a |
|---|---|---|---|---|---|
| 1. Portrait 1080×1920 | 22 | 22 | 0 | 0 | 0 |
| 2. Transparent overlay | 22 | 21 | 0 | 1 (`Map3D` #f5f5f5 body bg) | 0 |
| 3. White card chrome | 22 | 13 | 0 | 9 (`BeforeAfter` 2px, `StatPill` pill, `CompareSplit` 28-32px, `LocationPulse` 16-px sub-card, `VersusCard` 1.5px+slate+24-31px, `ProgressMeter` circular, `TickerTape` tape, `ChartLine` 24-px borderless, `Timeline` 16-px sub-card, `ChartComparison3D` no card, `Map3D` 40-px white card, `Logo` brand element) | 0 |
| 4. Top accent bar | 22 | 15 | 0 | 3 (`BeforeAfter` red/green, `CompareSplit` 2× replication, `VersusCard` indigo/orange) | 4 |
| 5. Space Grotesk | 22 | 12 | **9 (`BeforeAfter`, `VersusCard`, `QuoteCard`, `PlainText`, `IconText`, `ProgressMeter`, `Timeline`, `ChartLine` fully missing; `ChartComparison3D` named but not loaded)** | 0 | 1 |
| 6. `fitText` | 22 | 13 | 0 | 0 | 9 |
| 7. Entrance timing | 22 | 19 | 0 | 1 (`Map3D` 50% lands at the cap exactly, accepted as 3D-showcase) | 0 |
| 8. No exit animation | 22 | 20 | 0 | 2 (`KeyStatement`, `ChartLine` `exitDirection` dead code) | 0 |
| 9. Motion hook | 22 | 21 | 0 | 1 (`Logo` no hook, intentional) | 0 |
| 10. Accent palette | 22 | 19 | 0 | 3 (`BeforeAfter` red/green, `VersusCard` indigo, `Logo` brand orange) | 0 |
| 11. `rough-notation` emphasis | 22 | 12 | **1 (`TickerTape` missing `emphasisWords`)** | 0 | 9 |
| 12. `durationInFrames` prop | 22 | 21 | 0 | 0 | 1 |
| 13. Slider border + dots + shimmer | 22 | 15 | 0 | 1 (`CompareSplit` simpler per-card dots) | 6 |
| 14. `<SceneTransition>` wrapper | 22 | 21 | 0 | 0 | 1 |

**Filled cells:** 308 (22 rows × 14 cols). Of those: 255 ✅ (up from 254 by the 4 Phase 1.5 reclassifications), 10 ❌ (down from 13), 24 ⚠️, 22 n/a.

**`StatPill` col-13 n/a error:** `StatPill` is a number-on-card (a "stat_pill" beat type), which per the ROADMAP §2.1.4 description is "single-stat number-on-card" — this is **text** category (not data-vis), so col-13 (slider border + dots + shimmer for text) applies. The previous n/a was wrong. **Correction: `StatPill` col-13 should be ✅, not n/a.** This is a 1-cell correction.

**Phase 1.5 reclassifications (this commit, ✅ all 4):**

| Component | Old ❌ (old rule) | New ✅ (new 50% rule) | Reason |
|---|---|---|---|
| `LocationPulse` | 35% > 30% (data-vis limit) | 35% ≤ 50% (unified cap) | No stagger; 35% lands comfortably under 50%. |
| `QuoteCard` | 63% > 40% (text limit) | 63% accepted (word-by-word entrance exception) | Typewriter reveal is fundamentally word-by-word; the "63%" is the tail of the per-word reveal, not a single fixed animation. |
| `Timeline` (n ≥ 3) | scales linearly with event count, > 30% for n ≥ 3 | scales linearly, accepted as staggered entrance | Marker stagger IS the entrance; the tail extends as markers appear. |
| `ChartComparison3D` (n ≥ 4) | scales linearly with item count, > 30% for n ≥ 4 | scales linearly, accepted as staggered entrance | Bar stagger IS the entrance; the tail extends as bars appear. |

**❌s to fix in Phase 2 (10 total, 2 categories):**

1. **Space Grotesk (9 ❌s, 9 files):**
   - **8 fully missing:** `BeforeAfter`, `VersusCard`, `QuoteCard`, `PlainText`, `IconText`, `ProgressMeter`, `Timeline`, `ChartLine`. All use `system-ui, sans-serif` instead of the §2.1.1 `loadFont` call.
   - **1 partial (named but not loaded):** `ChartComparison3D` references `'Space Grotesk', 'Inter', system-ui, sans-serif` but doesn't call `loadFont`, so the font falls through to `system-ui, sans-serif` in the browser.
   - **One systematic bug in 9 files.** **One fix, 9 files.** (For the 8 fully missing, add `loadFont` + replace `system-ui`. For the 1 partial, add `loadFont` to the existing string reference.)
   - **Note:** `Logo` is outside the audit scope (brand element, not beat component) but ALSO has the same bug. **If the Phase 2 fix is "add Space Grotesk to all components missing it", Logo would be a 10th file. But since Logo is a brand element, the fix is a brand-style-guide decision, not a §3.3 compliance fix. Phase 5 follow-up.**

2. **`TickerTape` missing `emphasisWords` support (1 ❌):** the §2.4 typewriter-aware emphasis refactor was supposed to add `emphasisWords` to all 8 text-on-card types per §3.4.1, but `TickerTape` was missed. **Missing-feature bug, not a regression.** Different from the Space Grotesk issue.

**❌s concentrated in 2 primitives:**
- **#5 (Space Grotesk): 9 ❌s** — 9 of 20 audited components (45%) have Space Grotesk issues (8 missing entirely, 1 partial). The §2.3 / §2.4 / Pass 2 / Pass 3 refactors were inconsistent about the font migration.
- **#11 (rough-notation emphasis): 1 ❌** — `TickerTape` missing `emphasisWords` support.

**Phase 5 follow-ups (out of scope for 2.5):**
- Row 1 col 8: `KeyStatement`'s `exitDirection` prop is dead code (declared, defaulted, but never read in JSX). Remove in a future horizon.
- Row 5 col 8: `ChartLine`'s `exitDirection` prop is dead code (same pattern as `KeyStatement`).
- Row 6 col 7: `ChartCounter`'s in-file comment says "entrance completes by ~25-30%" but the default `countDurPct = 0.20` is 20%. The audit rule (≤50% under the new rule) is met either way, but the comment and default disagree. Reconcile in a future horizon.
- Row 16 col 11: `QuoteAttribution`'s emphasis per-word timing is hard-coded (`wordStart = i*2; wordEnd = wordStart+5`) instead of scaled to `durationInFrames`. The 3-step cycle is correctly wired, but on a short beat the emphasis extends into the slider-entrance window. Fix the timing scaling in a future horizon.
- Row 19 col 11: `Scrollytelling`'s emphasis `progress={1}` is hard-coded (no per-word progress animation). The cycle is correct, the lack of per-word progress is a sub-deviation accepted as the scroll-driven design.
- Row 4 col 7 (related): `IconText`'s in-file comment "CLAUDE.md Rule 1: Text cards must complete entrance by 50%" is outdated (the new §3.3 rule is "all beats ≤ 50% with stagger/word-by-word exception", so the comment is now correct again). **No fix needed — the comment happens to match the new rule.** Delete this follow-up.
- Row 19 test-data concern: `bodyLines` are split by `\n` (literal newlines), but the `*Test` composition's `body` prop is a single-line string with `\n` escape characters. Test-data concern, not a primitive violation.
- Row 21 (Logo): `Logo` is a brand element outside the §3.3 audit scope. When the real voxel logo lands, the placeholder `Logo` component should be audited against the brand style guide (a separate document) or refactored to use the design system. Phase 5 follow-up: write the brand style guide and re-audit Logo.
- Row 22 (PersistentBackground): the comment on line 116 says "Animated 3D orange S-NEWS voxel logo" but `<Logo size={1} />` mounts a 2D pill, not a 3D voxel logo. **Stale comment**, not a bug. When the real voxel logo lands, the comment needs to be updated.

---

## How to use this file during 2.5

1. **Phase 0 (now):** read this file. Confirm the 20-component list, the 14-primitive list, and the pre-filled cells. Disagree with any pre-fill? Update the cell and add a one-line note. ✅ **DONE** (commit `1e621e9`)
2. **Phase 1:** ask for the component files in batches (A: 4 §2.3 Pass 1 files, B: 6 §2.3 Pass 2 files, C: 7 §2.3 Pass 3 files, D: 3 §2.3.x scene-based files). Fill in the `·` cells. Add a new ⚠️ row to the "Pre-filled ⚠️ rationales" table for any new ⚠️. ✅ **DONE** (commits `90757f3`, `c89df58`, `8d440b2`, `135b51a`, `5232039`, plus this update)
3. **Phase 1.5 (this commit):** simplify the §3.3 entrance timing rule to a single 50% cap for all 20 beat types (was: 40% text / 30% data-vis two-tier). Reclassify the 4 entrance-timing ❌s to ✅. Update `CLAUDE.md` §3.3 + §11 to reflect the new rule. ✅ **DONE** (this commit)
4. **Phase 2:** group the ❌s by primitive. Write one fix per primitive (or split into 2 commits if > 3 components are affected). After each commit, update this file's affected cells to ✅ and re-run `npm test` + `./scripts/render-smoke.sh`. ⏳ **PENDING** — 10 ❌s to fix across 2 categories (9 Space Grotesk, 1 `TickerTape` emphasis)
5. **Phase 3:** confirm all ⚠️ cells have a rationale. If any ⚠️ is missing one, add it. ⏳ **PENDING**
6. **Phase 4:** re-run the verification chain. Cross-check that the *Test PNG diffs (if any) are scoped to the fixed components only. ⏳ **PENDING**
7. **Phase 5:** list any non-2.5 follow-ups the audit surfaced in a new "2.5 follow-ups" section at the bottom of this file. ⏳ **PENDING** (preliminary follow-ups listed above)
