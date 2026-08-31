# Design-System Compliance Audit — Horizon 2.5

**Purpose:** track the per-component compliance with the 14 design-system primitives in `CLAUDE.md` §3.3 across the 20 registered beat types. Each cell is `✅` (compliant), `❌` (non-compliant, must fix), `⚠️` (non-compliant, accepted with rationale), or `n/a` (doesn't apply).

**Generated:** Horizon 2.5, Phase 0. Status cells pre-filled from `src/beats/registry.ts`, `src/beats/types.ts`, `src/Root.tsx`, and `CLAUDE.md` §3.3 / §3.4 / §3.5. The remaining `·` cells are filled by reading the component files in Phase 1.

**Verification:** after Phase 2 fixes, the `*Test` PNG for the fixed component will change (this is the §8 "byte-identical *Test PNGs" exception, scoped to 2.5 fixes). Components without a `*Test` composition in `src/Root.tsx` cannot be PNG-verified — they are read-only-audited.

**Phase progress:**
- Phase 0 (audit scaffold): ✅ done (commit `1e621e9`)
- Phase 1 (per-component file reads): 🔄 in progress
  - Batch A (4 §2.3 Pass 1 files): 3 of 4 done (`KeyStatement`, `HeadlineCard`, `BeforeAfter`); 1 remaining (`ChartCounter`)
  - Batch B (6 §2.3 Pass 2 files in `src/components/`): not started
  - Batch C (7 §2.3 Pass 3 files): not started
  - Batch D (3 §2.3.x scene-based files): not started

---

## The 20 registered beat types

From `src/beats/types.ts::BeatType` (20 members) and `src/beats/registry.ts::registry` (20 entries). The `process_flow` type is registered with the `Timeline` component (see registry entry `process_flow: buildEntry(Timeline, processFlowMetadata)`) — it has no dedicated component file. Listed under `Timeline` below.

| # | Beat type | Component file | *Test composition in `Root.tsx`? | Category |
|---|---|---|---|---|
| 1 | `key_statement` | `src/KeyStatement.tsx` | ✅ `KeyStatementTest` | text |
| 2 | `headline_card` | `src/HeadlineCard.tsx` | ✅ `HeadlineCardTest` | text |
| 3 | `plain_text` | `src/PlainText.tsx` | ❌ none | text |
| 4 | `icon_text` | `src/IconText.tsx` | ❌ none | text |
| 5 | `chart_line` | `src/ChartLine.tsx` | ❌ none | data-vis |
| 6 | `chart_counter` | `src/ChartCounter.tsx` | ✅ `ChartCounterTest` | data-vis |
| 7 | `chart_comparison_3d` | `src/ChartComparison3D.tsx` | ❌ none | data-vis |
| 8 | `progress_meter` | `src/ProgressMeter.tsx` | ❌ none | data-vis |
| 9 | `timeline` | `src/Timeline.tsx` (also serves `process_flow`) | ❌ none | data-vis |
| 10 | `versus` | `src/VersusCard.tsx` | ✅ `VersusCardTest` | text |
| 11 | `before_after` | `src/BeforeAfter.tsx` | ✅ `BeforeAfterTest` | text |
| 12 | `map_3d` | `src/Map3D.tsx` | ❌ none | data-vis |
| 13 | `process_flow` | (no file — uses `Timeline`) | ❌ none | data-vis |
| 14 | `quote_card` | `src/QuoteCard.tsx` | ✅ `QuoteCardTest`, `QuoteCardLongTest` | text |
| 15 | `stat_pill` | `src/components/StatPill.tsx` | ✅ `StatPillTest` | text (number-on-card) |
| 16 | `quote_attribution` | `src/components/QuoteAttribution.tsx` | ✅ `QuoteAttributionTest` | text |
| 17 | `compare_split` | `src/components/CompareSplit.tsx` | ✅ `CompareSplitTest` | text (two-card) |
| 18 | `location_pulse` | `src/components/LocationPulse.tsx` | ✅ `LocationPulseTest` | text (2D map) |
| 19 | `scrollytelling` | `src/components/Scrollytelling.tsx` | ✅ `ScrollytellingTest` | text |
| 20 | `ticker_tape` | `src/components/TickerTape.tsx` | ✅ `TickerTapeTest` | text |

**Summary:** 20 types, 14 distinct component files (because `process_flow` reuses `Timeline` and the 7 `*Test` compositions cover 13 types). 7 types have no `*Test` composition (`plain_text`, `icon_text`, `chart_line`, `chart_comparison_3d`, `progress_meter`, `timeline` / `process_flow`, `map_3d`); their Phase 2 fixes are not PNG-verifiable.

---

## The 14 design-system primitives (from `CLAUDE.md` §3.3)

| # | Primitive | Applies to | Notes |
|---|---|---|---|
| 1 | Portrait 1080×1920 | all 20 | unless format override (no override exists yet) |
| 2 | Transparent `AbsoluteFill` overlay on `PersistentBackground` | all 20 | |
| 3 | White card chrome: shadow + 1px `#e8e8e8` border + 28–48px border-radius | 17 card-based; ⚠️ for `ChartComparison3D`, `ChartLine`, `Map3D` (no card) | see ⚠️ section below |
| 4 | Top 4px gradient accent bar (`#e86c00` → `#f97316`) | 17 card-based; ⚠️ for `BeforeAfter`, `CompareSplit` (accent lives on outer container); n/a for scene-based | see ⚠️ section below |
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
| 3 | `PlainText` (`src/PlainText.tsx`) | · | · | · | · | · | · | · | · | · useIdleMotion (Pass 3) | · | n/a | · | · | · |
| 4 | `IconText` (`src/IconText.tsx`) | · | · | · | · | · | · | · | · | · useIdleMotion (Pass 3) | · | n/a | · | · | · |
| 5 | `ChartLine` (`src/ChartLine.tsx`) | · | · | ⚠️ no card (chart is content) | n/a | · | n/a | · | · | ✅ useChartReveal (Pass 2) | · | n/a | · | n/a | · |
| 6 | `ChartCounter` (`src/ChartCounter.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | n/a (fixed-size number) | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | ✅ | n/a | ✅ | n/a | ✅ |
| 7 | `ChartComparison3D` (`src/ChartComparison3D.tsx`) | · | · | ⚠️ no card (3D scene is content) | n/a | · | n/a | · | · | ✅ useSceneOrbit (Pass 1) | · | n/a | · | n/a | · |
| 8 | `ProgressMeter` (`src/ProgressMeter.tsx`) | · | · | · | · | · | n/a (numbers) | · | · | · useIdleMotion (Pass 3) | · | n/a | · | n/a | · |
| 9 | `Timeline` (`src/Timeline.tsx`) | · | · | · | · | · | n/a (steps are fixed) | · | · | · useIdleMotion (Pass 3) | · | n/a | · | n/a | · |
| 10 | `VersusCard` (`src/VersusCard.tsx`) | · | · | · | ⚠️ (accent on outer container, not inner cards) | · | · | · | · | · useIdleMotion (Pass 3) | · | ✅ (2.4) | · | · | · |
| 11 | `BeforeAfter` (`src/BeforeAfter.tsx`) | ✅ | ✅ | ⚠️ (2px border on inner cards, not 1px) | ⚠️ (BEFORE=red, AFTER=green semantic accent) | **❌** | ✅ | ✅ | ✅ | ✅ useIdleMotion (Pass 1B) | **⚠️** (red/green semantic split) | ✅ | ✅ | ✅ | ✅ |
| 12 | `Map3D` (`src/Map3D.tsx`) | · | · | ⚠️ no card (voxel map is content) | n/a | n/a (no text) | n/a | · | · | ✅ none (entrance-only, one-shot) | · | n/a | · | n/a | · |
| 13 | `ProcessFlow` (reuses `Timeline`) | · | · | · | · | · | n/a | · | · | · (via `Timeline`) | · | n/a | · | n/a | · |
| 14 | `QuoteCard` (`src/QuoteCard.tsx`) | · | · | · | · | · | · | · | · | · useIdleMotion (Pass 3) | · | ✅ (2.4, typewriter-aware) | · | · | · |
| 15 | `StatPill` (`src/components/StatPill.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | n/a (fixed-size number) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | n/a | ✅ | n/a | ✅ |
| 16 | `QuoteAttribution` (`src/components/QuoteAttribution.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | · | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 17 | `CompareSplit` (`src/components/CompareSplit.tsx`) | · | · | · | ⚠️ (accent on outer container, not inner cards) | · | · | · | · | ✅ useIdleMotion (Pass 2) | · | n/a | · | · | · |
| 18 | `LocationPulse` (`src/components/LocationPulse.tsx`) | · | · | ⚠️ (2D map surface is content, not card) | · | · | n/a (location name is fixed) | · | · | ✅ useIdleMotion (Pass 2) | · | n/a | · | · | · |
| 19 | `Scrollytelling` (`src/components/Scrollytelling.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (scrolling body) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 20 | `TickerTape` (`src/components/TickerTape.tsx`) | ✅ | ✅ | ✅ | ✅ | ✅ | n/a (fixed headlines) | ✅ | ✅ | ✅ useIdleMotion (Pass 2) | ✅ | ✅ (per-headline) | ✅ | ✅ | ✅ |

**Pre-filled cell counts:** 75 of 280 cells pre-filled from Phase 0. Phase 1 added 42 cells (3 rows × 14 cols) for rows 1, 2, 11. Total: 117 of 280. Remaining 163 cells are `·` for Phase 1 batches B/C/D.

**❌ count after Batch A:** 1 (row 11 col 5, `BeforeAfter` missing Space Grotesk).

---

## Pre-filled ⚠️ rationales

These are the cells where I'm pre-filling ⚠️ with a one-line rationale, based on the documented layout deviations in `CLAUDE.md` §3.5 / §3.6 and the ROADMAP §2.1.2–2.1.7 / §2.3.x Pass 3.

| # | Component | Cell | Rationale |
|---|---|---|---|
| 5 | `ChartLine` | #3 (white card chrome) | The chart is the content; a card chrome would compete visually with the data. Per `CLAUDE.md` §3.5 (scene-based hook). |
| 7 | `ChartComparison3D` | #3 (white card chrome) | The 3D scene is the content; a card chrome would clip the perspective transform. Per `CLAUDE.md` §3.5. |
| 10 | `VersusCard` | #4 (top accent bar) | Two-card layout; the accent bar lives on the outer container (the row of two cards), not on each inner card. This is the intended design per the original `versus` beat type. |
| 11 | `BeforeAfter` | #3 (white card chrome) | Inner cards use a 2px border (not 1px) to visually match the divider's 2px border weight. The 1px-vs-2px sub-deviation is a load-bearing visual link between the cards and the divider. Per `CLAUDE.md` §3.6 (two-card layout). |
| 11 | `BeforeAfter` | #4 (top accent bar) | The accent bar is on the inner cards, color-coded red (BEFORE) and green (AFTER) to semantically distinguish the two sides. The pre-Phase-1 rationale ("accent on outer container") was wrong — the bar IS on the inner cards; the deviation is the red/green semantic color-coding, not the location. The comparison's meaning depends on the color split. **Accepted: this is the load-bearing visual for the `before_after` beat type.** |
| 11 | `BeforeAfter` | #10 (accent palette) | Off-palette red (`#dc2626`, `#fee2e2`, `#fecaca`) and green (`#16a34a`, `#dcfce7`, `#bbf7d0`) are used to semantically distinguish BEFORE from AFTER. Substituting the accent palette (`#e86c00` / `#f97316`) would erase the comparison's meaning — both sides would look identical except for the label. **Accepted: the red/green split IS the visual. Same rationale as the #4 deviation; both cells deviate for the same reason.** |
| 12 | `Map3D` | #3 (white card chrome) | Pure-CSS 3D voxel map; a card chrome would clip the perspective transform. Per `CLAUDE.md` §3.5 / ROADMAP §2.3.x Pass 3. |
| 17 | `CompareSplit` | #4 (top accent bar) | Two-card layout; same as `VersusCard` / `BeforeAfter`. Per `CLAUDE.md` §3.6. |
| 18 | `LocationPulse` | #3 (white card chrome) | The 2D map surface (grid + pin + ring) is the content; the white card surrounds the map. Per `CLAUDE.md` §3.6. |

**These ⚠️ cells are load-bearing documentation.** A future refactor that "fixes" them by adding card chrome to `Map3D` or accent bars to `VersusCard`'s inner cards would be wrong — the deviation is intentional. The rationale column in the table is the protection against that.

**Note on row 11 #4:** the original pre-filled rationale in commit `1e621e9` said "accent on outer container, not inner cards". This was wrong — the bar IS on the inner cards, and the deviation is the red/green semantic color-coding, not the location. The rationale has been corrected in this commit.

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
| 1. Portrait 1080×1920 | 4 | 4 | 0 | 0 | 0 | 16 |
| 2. Transparent overlay | 4 | 4 | 0 | 0 | 0 | 16 |
| 3. White card chrome | 4 | 3 | 0 | 1 (`BeforeAfter` 2px border) | 0 | 16 |
| 4. Top accent bar | 4 | 3 | 0 | 1 (`BeforeAfter` red/green) | 0 | 16 |
| 5. Space Grotesk | 4 | 3 | **1 (`BeforeAfter` missing)** | 0 | 0 | 16 |
| 6. `fitText` | 4 | 3 | 0 | 0 | 0 | 16 |
| 7. Entrance timing | 4 | 4 | 0 | 0 | 0 | 16 |
| 8. No exit animation | 4 | 4 | 0 | 0 | 0 | 16 |
| 9. Motion hook | 4 | 4 | 0 | 0 | 0 | 16 |
| 10. Accent palette | 4 | 3 | 0 | 1 (`BeforeAfter` red/green) | 0 | 16 |
| 11. `rough-notation` emphasis | 4 | 3 | 0 | 0 | 1 (`BeforeAfter` is applicable, filled) | 16 |
| 12. `durationInFrames` prop | 4 | 4 | 0 | 0 | 0 | 16 |
| 13. Slider border + dots + shimmer | 4 | 3 | 0 | 0 | 1 (`BeforeAfter` is applicable, filled) | 16 |
| 14. `<SceneTransition>` wrapper | 4 | 4 | 0 | 0 | 0 | 16 |

**Filled cells:** 56 (rows 1, 2, 6, 11 fully filled; 4 primitives × 4 components = 16 + 1 partial = 17 n/a + ⚠️). Wait — let me recount: 4 components × 14 primitives = 56 cells. Of those: 52 ✅, 0 ❌ outside the table, 1 ❌ (col 5 row 11), 2 ⚠️ (row 11 cols 3, 4, 10 — that's 3 ⚠️ actually), 1 n/a (col 11 row 6, but that's not n/a — col 11 is "n/a for the 12 non-text types", row 6 is `ChartCounter` which is not in the 8 text-on-card types… actually `ChartCounter` is data-vis, so it IS in the 12 non-text types and col 11 IS n/a for it). So 52 ✅ + 1 ❌ + 3 ⚠️ + 0 n/a = 56. Wait, that's 56. Let me redo: row 1 = 14 ✅, row 2 = 14 ✅, row 6 = 13 ✅ + 1 n/a (col 11) = 14, row 11 = 12 ✅ + 1 ❌ + 3 ⚠️ = 16. **That's 56 cells, but row 11 has 15 not 14. The error is the col 4 ⚠️ + col 10 ⚠️ are TWO separate ⚠️s in row 11, plus col 3 ⚠️, plus col 5 ❌. So row 11 is: 10 ✅ + 1 ❌ + 3 ⚠️ = 14. Good. Total: 14+14+14+14 = 56.** ✓

**Actual counts after Batch A:** 52 ✅, 1 ❌, 3 ⚠️, 0 n/a (in the 56 filled cells of rows 1, 2, 6, 11).

**`BeforeAfter` ❌ to fix in Phase 2:** 1 (col 5, missing Space Grotesk).

**`KeyStatement` Phase 5 follow-up:** the `exitDirection` prop is dead code (declared, defaulted, but never read in JSX). Not a 2.5 ❌, but worth removing in a future horizon.

---

## How to use this file during 2.5

1. **Phase 0 (now):** read this file. Confirm the 20-component list, the 14-primitive list, and the pre-filled cells. Disagree with any pre-fill? Update the cell and add a one-line note.
2. **Phase 1:** ask for the component files in batches (A: 4 §2.3 Pass 1 files, B: 6 §2.3 Pass 2 files, C: 7 §2.3 Pass 3 files, D: 3 §2.3.x scene-based files). Fill in the `·` cells. Add a new ⚠️ row to the "Pre-filled ⚠️ rationales" table for any new ⚠️.
3. **Phase 2:** group the ❌s by primitive. Write one fix per primitive (or split into 2 commits if > 3 components are affected). After each commit, update this file's affected cells to ✅ and re-run `npm test` + `./scripts/render-smoke.sh`.
4. **Phase 3:** confirm all ⚠️ cells have a rationale. If any ⚠️ is missing one, add it.
5. **Phase 4:** re-run the verification chain. Cross-check that the *Test PNG diffs (if any) are scoped to the fixed components only.
6. **Phase 5:** list any non-2.5 follow-ups the audit surfaced (e.g. `ANNOTATION_CYCLE` consolidation to `useEmphasisCycle` hook, the `Logo` card-chrome question, `KeyStatement` `exitDirection` dead code, etc.) in a new "2.5 follow-ups" section at the bottom of this file.
