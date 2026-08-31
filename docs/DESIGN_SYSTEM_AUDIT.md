# Design-System Compliance Audit — Horizon 2.5

**Purpose:** track the per-component compliance with the 14 design-system primitives in `CLAUDE.md` §3.3 across the 20 registered beat types. Each cell is `✅` (compliant), `❌` (non-compliant, must fix), `⚠️` (non-compliant, accepted with rationale), or `n/a` (doesn't apply).

**Generated:** Horizon 2.5, Phase 0. Status cells pre-filled from `src/beats/registry.ts`, `src/beats/types.ts`, `src/Root.tsx`, and `CLAUDE.md` §3.3 / §3.4 / §3.5. The remaining `·` cells are filled by reading the component files in Phase 1.

**Verification:** after Phase 2 fixes, the `*Test` PNG for the fixed component will change (this is the §8 "byte-identical *Test PNGs" exception, scoped to 2.5 fixes). Components without a `*Test` composition in `src/Root.tsx` cannot be PNG-verified — they are read-only-audited.

**Phase progress:**
- Phase 0 (audit scaffold): ✅ done (commit `1e621e9`)
- Phase 1 (per-component file reads): 🔄 in progress
  - Batch A (4 §2.3 Pass 1 files): ✅ done (`KeyStatement`, `HeadlineCard`, `BeforeAfter`, `ChartCounter`)
  - Batch B (6 §2.3 Pass 2 files in `src/components/`): 🔄 5 of 6 done (`StatPill`, `QuoteAttribution`, `CompareSplit`, `LocationPulse`, `Scrollytelling`); 1 remaining (`TickerTape`)
  - Batch C (7 §2.3 Pass 3 files): 🔄 3 of 7 done (`VersusCard`, `QuoteCard`, `PlainText`); 4 remaining (`IconText`, `ProgressMeter`, `Timeline`, `Logo`)
  - Batch D (3 §2.3.x scene-based files): not started

---

## The 20 registered beat types

From `src/beats/types.ts::BeatType` (20 members) and `src/beats/registry.ts::registry` (20 entries). The `process_flow` type is registered with the `Timeline` component (see registry entry `process_flow: buildEntry(Timeline, processFlowMetadata)`) — it has no dedicated component file. Listed under `Timeline` below.

| # | Beat type | Component file | *Test composition in `Root.tsx`? | Category |
|---|---|---|---|---|
| 1 | `key_statement` | `src/KeyStatement.tsx` | ✅ `KeyStatementTest` | text |
| 2 | `headline_card` | `src/HeadlineCard.tsx` | ✅ `HeadlineCardTest` | text |
| 3 | `plain_text` | `src/PlainText.tsx` | ✅ `PlainTextTest`, `PlainTextLongTest`, `PlainTextShortTest` | text (paragraph) |
| 4 | `icon_text` | `src/IconText.tsx` | ❌ none | text |
| 5 | `chart_line` | `src/ChartLine.tsx` | ❌ none | data-vis |
| 6 | `chart_counter` | `src/ChartCounter.tsx` | ✅ `ChartCounterTest` | data-vis |
| 7 | `chart_comparison_3d` | `src/ChartComparison3D.tsx` | ❌ none | data-vis |
| 8 | `progress_meter` | `src/ProgressMeter.tsx` | ❌ none | data-vis |
| 9 | `timeline` | `src/Timeline.tsx` (also serves `process_flow`) | ❌ none | data-vis |
| 10 | `versus` | `src/VersusCard.tsx` | ✅ `VersusCardTest` | text (two-card) |
| 11 | `before_after` | `src/BeforeAfter.tsx` | ✅ `BeforeAfterTest` | text (two-card) |
| 12 | `map_3d` | `src/Map3D.tsx` | ❌ none | data-vis |
| 13 | `process_flow` | (no file — uses `Timeline`) | ❌ none | data-vis |
| 14 | `quote_card` | `src/QuoteCard.tsx` | ✅ `QuoteCardTest`, `QuoteCardLongTest` | text (typewriter) |
| 15 | `stat_pill` | `src/components/StatPill.tsx` | ✅ `StatPillTest` | text (number-on-card) |
| 16 | `quote_attribution` | `src/components/QuoteAttribution.tsx` | ✅ `QuoteAttributionTest` | text |
| 17 | `compare_split` | `src/components/CompareSplit.tsx` | ✅ `CompareSplitTest` | text (two-card) |
| 18 | `location_pulse` | `src/components/LocationPulse.tsx` | ✅ `LocationPulseTest` | text (2D map) |
| 19 | `scrollytelling` | `src/components/Scrollytelling.tsx` | ✅ `ScrollytellingTest` | text |
| 20 | `ticker_tape` | `src/components/TickerTape.tsx` | ✅ `TickerTapeTest` | text |

**Summary:** 20 types, 14 distinct component files (because `process_flow` reuses `Timeline`). 16 types have at least one `*Test` composition; 4 types have none (`icon_text`, `chart_line`, `chart_comparison_3d`, `progress_meter`, `timeline` / `process_flow`, `map_3d` — actually that's 6, not 4; the tracker was wrong). Their Phase 2 fixes are not PNG-verifiable. **Correction: 6 types have no `*Test` composition, not 7.** The 6 are: `icon_text`, `chart_line`, `chart_comparison_3d`, `progress_meter`, `timeline` / `process_flow`, `map_3d`. (`plain_text` has 3 *Test compositions, so it's covered.)

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
| 7a | Entrance ≤ 40% of `durationInFrames` (text beats) | 14 text types | per §3.3 text-beat timing |
| 7b | Entrance ≤ 30% of `durationInFrames` (data-vis beats) | 6 data-vis types | per §3.3 non-text timing, see `ChartCounter` |
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

**Primitive count is actually 17** (7a/7b split, 9a/9b/9c/9d split). For the table below I'll fold 7a/7b into a single "Entrance" column with a "≤40% text / ≤30% data-vis" header note, and fold 9a/9b/9c/9d into a single "Motion hook" column with a per-row "expected hook" sub-cell. The "applies to" qualifier is in the row header.

---

## Main audit table — 20 components × 14 primitives

**Status legend:** `✅` compliant · `❌` non-compliant, must fix · `⚠️` non-compliant, accepted (rationale below) · `n/a` doesn't apply · `·` to be filled in Phase 1.

| # | Component (file) | 1. Portrait 1080×1920 | 2. Transparent overlay | 3. White card chrome | 4. Top accent bar | 5. Space Grotesk | 6. `fitText` (where apt) | 7. Entrance ≤40% text / ≤30% data-vis | 8. No exit animation | 9. Motion hook (useIdleMotion / useSceneOrbit / useChartReveal / none) | 10. Accent palette | 11. `rough-notation` emphasis (8 text-on-card types) | 12. `durationInFrames` prop | 13. Slider border + dots + shimmer (text) | 14. `<SceneTransition>` wrapper |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `KeyStatement` (`src/KeyStatement.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | `HeadlineCard` (`src/HeadlineCard.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 3 | `PlainText` (`src/PlainText.tsx`) | ✅ | ✅ | ✅ | ✅ | **❌** | n/a (lines pre-wrapped) | ✅ | ✅ | ✅ useIdleMotion (Pass 3) | ✅ | ✅ (per-line, paragraph pattern) | ✅ | ✅ (stars, not dots) | ✅ |
| 4 | `IconText` (`src/IconText.tsx`) | · | · | · | · | · | · | · | · | · useIdleMotion (Pass 3) | · | n/a | · | · | · |
| 5 | `ChartLine` (`src/ChartLine.tsx`) | · | · | ⚠️ no card (chart is content) | n/a | · | n/a | · | · | ✅ useChartReveal (Pass 2) | · | n/a | · | n/a | · |
| 6 | `ChartCounter` (`src/ChartCounter.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | n/a (fixed-size number) | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | n/a | ✅ | n/a | ✅ |
| 7 | `ChartComparison3D` (`src/ChartComparison3D.tsx`) | · | · | ⚠️ no card (3D scene is content) | n/a | · | n/a | · | · | ✅ useSceneOrbit (Pass 1) | · | n/a | · | n/a | · |
| 8 | `ProgressMeter` (`src/ProgressMeter.tsx`) | · | · | · | · | · | n/a (numbers) | · | · | · useIdleMotion (Pass 3) | · | n/a | · | n/a | · |
| 9 | `Timeline` (`src/Timeline.tsx`) | · | · | · | · | · | n/a (steps are fixed) | · | · | · useIdleMotion (Pass 3) | · | n/a | · | n/a | · |
| 10 | `VersusCard` (`src/VersusCard.tsx`) | ✅ | ✅ | ⚠️ (1.5px border `#e2e8f0`, 24-31px radius) | ⚠️ (indigo/orange semantic split) | **❌** | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 3) | **⚠️** (indigo for Option A) | ✅ | ✅ | ✅ (corner ribbon) | ✅ |
| 11 | `BeforeAfter` (`src/BeforeAfter.tsx`) | ✅ | ✅ | ⚠️ (2px border on inner cards, not 1px) | ⚠️ (BEFORE=red, AFTER=green semantic accent) | **❌** | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | **⚠️** (red/green semantic split) | ✅ | ✅ | ✅ | ✅ |
| 12 | `Map3D` (`src/Map3D.tsx`) | · | · | ⚠️ no card (voxel map is content) | n/a | n/a (no text) | n/a | · | · | ✅ none (entrance-only, one-shot) | · | n/a | · | n/a | · |
| 13 | `ProcessFlow` (reuses `Timeline`) | · | · | · | · | · | n/a | · | · | · (via `Timeline`) | · | n/a | · | n/a | · |
| 14 | `QuoteCard` (`src/QuoteCard.tsx`) | ✅ | ✅ | ✅ | ✅ | **❌** | n/a (typewriter effect) | **❌** (marksEnd=63% > 40% text limit) | ✅ | ✅ useIdleMotion (Pass 3) | ✅ | ✅ (typewriter-aware) | ✅ | ✅ (animated underline) | ✅ |
| 15 | `StatPill` (`src/components/StatPill.tsx`) | ✅ | ✅ | ⚠️ (pill radius 48–54px, above §3.3 baseline 28–48px) | ✅ | ✅ | n/a (fixed-size number) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a (§2.1.4 "optional") | ✅ | n/a | ✅ |
| 16 | `QuoteAttribution` (`src/components/QuoteAttribution.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17 | `CompareSplit` (`src/components/CompareSplit.tsx`) | ✅ | ✅ | ⚠️ (radius 28–32px, at §3.3 lower bound) | ⚠️ (accent replicated on each inner card) | ✅ | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a (not in 8 text-on-card types) | ✅ | ✅ (simpler per-card dots) | ✅ |
| 18 | `LocationPulse` (`src/components/LocationPulse.tsx`) | ✅ | ✅ | ⚠️ (2D map wrapped in 16-px sub-card, below §3.3 baseline) | ✅ | ✅ | ✅ | **❌** (labelEnd=35% > 30% data-vis limit) | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a (not in 8 text-on-card types) | ✅ | ✅ | ✅ |
| 19 | `Scrollytelling` (`src/components/Scrollytelling.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (title) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ (progress=1, scroll-driven) | ✅ | ✅ | ✅ |
| 20 | `TickerTape` (`src/components/TickerTape.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | n/a (fixed headlines) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ (per-headline) | ✅ | ✅ | ✅ |

**Pre-filled cell counts:** 75 of 280 cells pre-filled from Phase 0. Phase 1 added 182 cells (13 rows × 14 cols) for rows 1, 2, 3, 6, 10, 11, 14, 15, 16, 17, 18, 19. Total: 257 of 280. Remaining 23 cells are `·` for Phase 1 Batch B close (`TickerTape`), Batch C (`IconText`, `ProgressMeter`, `Timeline`, `Logo`), Batch D (`ChartLine`, `ChartComparison3D`, `Map3D`).

**❌ count after 13 components audited:** 6 (row 3 col 5 `PlainText` Space Grotesk; row 10 col 5 `VersusCard` Space Grotesk; row 11 col 5 `BeforeAfter` Space Grotesk; row 14 col 5 `QuoteCard` Space Grotesk; row 14 col 7 `QuoteCard` entrance 63% > 40%; row 18 col 7 `LocationPulse` entrance 35% > 30%).

---

## Pre-filled ⚠️ rationales

These are the cells where I'm pre-filling ⚠️ with a one-line rationale, based on the documented layout deviations in `CLAUDE.md` §3.5 / §3.6 and the ROADMAP §2.1.2–2.1.7 / §2.3.x Pass 3.

| # | Component | Cell | Rationale |
|---|---|---|---|
| 5 | `ChartLine` | #3 (white card chrome) | The chart is the content; a card chrome would compete visually with the data. Per `CLAUDE.md` §3.5 (scene-based hook). |
| 7 | `ChartComparison3D` | #3 (white card chrome) | The 3D scene is the content; a card chrome would clip the perspective transform. Per `CLAUDE.md` §3.5. |
| 10 | `VersusCard` | #3 (white card chrome) | Three sub-deviations: (a) 1.5px border (not 1px), (b) `#e2e8f0` border color (not `#e8e8e8` — slate, not neutral), (c) 24-31px radius (at §3.3 lower bound). The 1.5px + slate border is the two-card Pass 3 sub-deviation family (Pass 3 uses a slightly heavier, slightly cooler border than Pass 1/2). The 24-31px radius is at the lower bound for two-card balance. |
| 10 | `VersusCard` | #4 (top accent bar) | Two-card layout; the accent bar is replicated on each inner card with an **indigo/orange semantic split** (left = Option A indigo, right = Option B orange). The indigo is off-palette but the split is the load-bearing visual for the `versus` beat type (you must see at a glance which side is which). Same family as `BeforeAfter`'s red/green split. |
| 10 | `VersusCard` | #10 (accent palette) | Off-palette indigo (`#6366f1`, `#818cf8`, `#c7d2fe`, `#4338ca`) for Option A. Substituting the accent palette would erase the Option A/B semantic distinction. **Accepted: the indigo/orange split IS the visual.** |
| 11 | `BeforeAfter` | #3 (white card chrome) | Inner cards use a 2px border (not 1px) to visually match the divider's 2px border weight. The 1px-vs-2px sub-deviation is a load-bearing visual link between the cards and the divider. Per `CLAUDE.md` §3.6 (two-card layout). |
| 11 | `BeforeAfter` | #4 (top accent bar) | The accent bar is on the inner cards, color-coded red (BEFORE) and green (AFTER) to semantically distinguish the two sides. The pre-Phase-1 rationale ("accent on outer container") was wrong — the bar IS on the inner cards; the deviation is the red/green semantic color-coding, not the location. The comparison's meaning depends on the color split. **Accepted: this is the load-bearing visual for the `before_after` beat type.** |
| 11 | `BeforeAfter` | #10 (accent palette) | Off-palette red (`#dc2626`, `#fee2e2`, `#fecaca`) and green (`#16a34a`, `#dcfce7`, `#bbf7d0`) are used to semantically distinguish BEFORE from AFTER. Substituting the accent palette (`#e86c00` / `#f97316`) would erase the comparison's meaning — both sides would look identical except for the label. **Accepted: the red/green split IS the visual. Same rationale as the #4 deviation; both cells deviate for the same reason.** |
| 12 | `Map3D` | #3 (white card chrome) | Pure-CSS 3D voxel map; a card chrome would clip the perspective transform. Per `CLAUDE.md` §3.5 / ROADMAP §2.3.x Pass 3. |
| 15 | `StatPill` | #3 (white card chrome) | Pill-style component uses a 48–54px border-radius (vs. the §3.3 baseline 28–48px). The "pill = more rounded" deviation is intentional and documented in the component's in-file comment (`borderRadius: max(48, width*0.05) // Pill = more rounded`). The deviation is within the spirit of §3.3 (a pill is a card with a larger radius, not a separate primitive). |
| 17 | `CompareSplit` | #3 (white card chrome) | Inner cards use a 28–32px border-radius (vs. the §3.3 baseline 28–48px). The two-card Pass 2 family uses the tighter radius for visual balance between the two cards and the slider border. |
| 17 | `CompareSplit` | #4 (top accent bar) | Two-card layout; the accent bar is replicated on each inner card (2× accent bars on a two-card layout, vs. 1× on a single-card layout). The pre-Phase-1 rationale ("accent on outer container, not inner cards") was wrong — the bar IS on the inner cards; the deviation is the replication, not the location. The replication is the same pattern as `VersusCard` and is load-bearing (each card is visually a "card" primitive). |
| 17 | `CompareSplit` | #13 (slider dots) | Two-card layout uses simpler per-card dots (3 dots per card, no `float` or `glow`) vs. the full Pass 1 dot pattern (6+3 with `float` and `glow`). The sub-deviation keeps visual weight balanced across the two cards. |
| 18 | `LocationPulse` | #3 (white card chrome) | The 2D map surface is wrapped in a 16-px-radius sub-card inside the top-level white card. The 16-px radius is below the §3.3 baseline 28–48px because it's a sub-component inside a card, not a top-level card itself. |

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

## Per-primitive summary (filled in after Phase 1)

**This section is populated after Phase 1** by counting `✅` / `❌` / `⚠️` / `n/a` per column.

| Primitive | Filled cells | ✅ | ❌ | ⚠️ | n/a | · (pending) |
|---|---|---|---|---|---|---|
| 1. Portrait 1080×1920 | 13 | 13 | 0 | 0 | 0 | 7 |
| 2. Transparent overlay | 13 | 13 | 0 | 0 | 0 | 7 |
| 3. White card chrome | 13 | 8 | 0 | 5 (`BeforeAfter` 2px, `StatPill` pill, `CompareSplit` 28-32px, `LocationPulse` 16-px sub-card, `VersusCard` 1.5px+slate+24-31px) | 0 | 7 |
| 4. Top accent bar | 13 | 10 | 0 | 3 (`BeforeAfter` red/green, `CompareSplit` 2× replication, `VersusCard` indigo/orange) | 0 | 7 |
| 5. Space Grotesk | 13 | 9 | **4 (`BeforeAfter`, `VersusCard`, `QuoteCard`, `PlainText`)** | 0 | 0 | 7 |
| 6. `fitText` | 13 | 9 | 0 | 0 | 4 (`ChartCounter`, `StatPill` fixed numbers, `QuoteCard` typewriter, `PlainText` pre-wrapped) | 7 |
| 7. Entrance timing | 13 | 11 | **2 (`LocationPulse` 35% > 30%, `QuoteCard` 63% > 40%)** | 0 | 0 | 7 |
| 8. No exit animation | 13 | 13 | 0 | 0 | 0 | 7 |
| 9. Motion hook | 13 | 13 | 0 | 0 | 0 | 7 |
| 10. Accent palette | 13 | 11 | 0 | 2 (`BeforeAfter` red/green, `VersusCard` indigo) | 0 | 7 |
| 11. `rough-notation` emphasis | 13 | 9 | 0 | 0 | 4 (`ChartCounter`, `StatPill` §2.1.4, `CompareSplit`, `LocationPulse` not in 8 types) | 7 |
| 12. `durationInFrames` prop | 13 | 13 | 0 | 0 | 0 | 7 |
| 13. Slider border + dots + shimmer | 13 | 11 | 0 | 1 (`CompareSplit` simpler per-card dots) | 1 (`StatPill` data-vis — wait, `StatPill` is text. The n/a was wrong. Let me recheck.) | 7 |
| 14. `<SceneTransition>` wrapper | 13 | 13 | 0 | 0 | 0 | 7 |

**Filled cells:** 182 (13 rows × 14 cols). Of those: 159 ✅, 6 ❌, 11 ⚠️, 6 n/a.

**`StatPill` col-13 n/a error:** `StatPill` is a number-on-card (a "stat_pill" beat type), which per the ROADMAP §2.1.4 description is "single-stat number-on-card" — this is **text** category (not data-vis), so col-13 (slider border + dots + shimmer for text) applies. The previous n/a was wrong. **Correction: `StatPill` col-13 should be ✅, not n/a.**

**❌s to fix in Phase 2 (6 total):**
1. Row 3 col 5: `PlainText` missing Space Grotesk font import.
2. Row 10 col 5: `VersusCard` missing Space Grotesk font import.
3. Row 11 col 5: `BeforeAfter` missing Space Grotesk font import.
4. Row 14 col 5: `QuoteCard` missing Space Grotesk font import.
5. Row 14 col 7: `QuoteCard` entrance timing violation (`marksEnd = 63% > 40% text limit`) AND in-file comment says "completes by ~70%" (wrong, should be ~40%).
6. Row 18 col 7: `LocationPulse` entrance timing violation (`labelEnd = 35% > 30% data-vis limit`) AND in-file comment says "30-40% entrance rule" (text rule, wrong category).

**❌s concentrated in 2 primitives:**
- **#5 (Space Grotesk): 4 ❌s** — `BeforeAfter`, `VersusCard`, `QuoteCard`, `PlainText`. **One systematic bug** — the §2.3 / §2.4 refactors didn't migrate these 4 components to Space Grotesk. All use `system-ui, sans-serif` instead. **One fix, 4 files.**
- **#7 (entrance timing): 2 ❌s** — `LocationPulse` (data-vis, 35% > 30%), `QuoteCard` (text, 63% > 40%). **Different bugs, different files.** **Two separate fixes.**

**Phase 5 follow-ups (out of scope for 2.5):**
- Row 1 col 8: `KeyStatement`'s `exitDirection` prop is dead code (declared, defaulted, but never read in JSX). Remove in a future horizon.
- Row 6 col 7: `ChartCounter`'s in-file comment says "entrance completes by ~25-30%" but the default `countDurPct = 0.20` is 20%. The audit rule (≤30%) is met either way, but the comment and default disagree. Reconcile in a future horizon.
- Row 16 col 11: `QuoteAttribution`'s emphasis per-word timing is hard-coded (`wordStart = i*2; wordEnd = wordStart+5`) instead of scaled to `durationInFrames`. The 3-step cycle is correctly wired, but on a short beat the emphasis extends into the slider-entrance window. Fix the timing scaling in a future horizon.
- Row 19 col 11: `Scrollytelling`'s emphasis `progress={1}` is hard-coded (no per-word progress animation). The cycle is correct, the lack of per-word progress is a sub-deviation accepted as the scroll-driven design.
- Row 19 test-data concern: `bodyLines` are split by `\n` (literal newlines), but the `*Test` composition's `body` prop is a single-line string with `\n` escape characters. Test-data concern, not a primitive violation.

---

## How to use this file during 2.5

1. **Phase 0 (now):** read this file. Confirm the 20-component list, the 14-primitive list, and the pre-filled cells. Disagree with any pre-fill? Update the cell and add a one-line note.
2. **Phase 1:** ask for the component files in batches (A: 4 §2.3 Pass 1 files, B: 6 §2.3 Pass 2 files, C: 7 §2.3 Pass 3 files, D: 3 §2.3.x scene-based files). Fill in the `·` cells. Add a new ⚠️ row to the "Pre-filled ⚠️ rationales" table for any new ⚠️.
3. **Phase 2:** group the ❌s by primitive. Write one fix per primitive (or split into 2 commits if > 3 components are affected). After each commit, update this file's affected cells to ✅ and re-run `npm test` + `./scripts/render-smoke.sh`.
4. **Phase 3:** confirm all ⚠️ cells have a rationale. If any ⚠️ is missing one, add it.
5. **Phase 4:** re-run the verification chain. Cross-check that the *Test PNG diffs (if any) are scoped to the fixed components only.
6. **Phase 5:** list any non-2.5 follow-ups the audit surfaced in a new "2.5 follow-ups" section at the bottom of this file.
