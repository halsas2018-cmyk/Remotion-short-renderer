import { z, ZodTypeAny } from "zod";
import React from "react";
import { KeyStatement } from "../KeyStatement";
import { HeadlineCard } from "../HeadlineCard";
import { PlainText } from "../PlainText";
import { IconText } from "../IconText";
import { ChartLine } from "../ChartLine";
import { ChartCounter } from "../ChartCounter";
import { ChartComparison3D } from "../ChartComparison3D";
import { ProgressMeter } from "../ProgressMeter";
import { Timeline } from "../Timeline";
import { VersusCard } from "../VersusCard";
import { BeforeAfter } from "../BeforeAfter";
import { Map3D } from "../Map3D";
import { QuoteCard } from "../QuoteCard";
import { StatPill } from "../components/StatPill";
import { QuoteAttribution } from "../components/QuoteAttribution";
import { CompareSplit } from "../components/CompareSplit";
import { LocationPulse } from "../components/LocationPulse";
import { Scrollytelling } from "../components/Scrollytelling";
import { TickerTape } from "../components/TickerTape";
import { BeatType } from "./types";

/* ------------------------------------------------------------------ */
/*  Per-type Zod schemas.                                            */
/*  Each schema validates the WHOLE beat (top-level) shape.          */
/*  The Python pipeline emits per-type fields at the top level,      */
/*  not under a `metadata` wrapper, so the schema is built from     */
/*  the base shape plus the per-type fields.                         */
/* ------------------------------------------------------------------ */

const beatBase = {
  type: z.string(),
  startFrame: z.number().nonnegative(),
  endFrame: z.number().nonnegative().optional(),
  durationInFrames: z.number().positive(),
} as const;

const keyStatementMetadata = z
  .object({
    ...beatBase,
    type: z.literal("key_statement"),
    text: z.string(),
    emphasisWords: z.array(z.string()).optional(),
  })
  .passthrough();

const headlineCardMetadata = z
  .object({
    ...beatBase,
    type: z.literal("headline_card"),
    text: z.string(),
    emphasisWords: z.array(z.string()).optional(),
    backgroundColor: z.string().optional(),
    accentColor: z.string().optional(),
    textColor: z.string().optional(),
  })
  .passthrough();

const plainTextMetadata = z
  .object({
    ...beatBase,
    type: z.literal("plain_text"),
    text: z.string(),
  })
  .passthrough();

const iconTextMetadata = z
  .object({
    ...beatBase,
    type: z.literal("icon_text"),
    text: z.string(),
    icon: z.string(),
    emphasisWords: z.array(z.string()).optional(),
  })
  .passthrough();

const chartLineMetadata = z
  .object({
    ...beatBase,
    type: z.literal("chart_line"),
    text: z.string().optional(),
    points: z.array(
      z.object({
        label: z.string(),
        value: z.number(),
      }),
    ),
    exitDirection: z.string().optional(),
  })
  .passthrough();

const chartCounterMetadata = z
  .object({
    ...beatBase,
    type: z.literal("chart_counter"),
    text: z.string().optional(),
    value: z.union([z.string(), z.number()]),
    label: z.string(),
  })
  .passthrough();

const chartComparison3DMetadata = z
  .object({
    ...beatBase,
    type: z.literal("chart_comparison_3d"),
    text: z.string().optional(),
    items: z.array(
      z.object({
        label: z.string(),
        value: z.number(),
      }),
    ),
  })
  .passthrough();

const progressMeterMetadata = z
  .object({
    ...beatBase,
    type: z.literal("progress_meter"),
    text: z.string().optional(),
    value: z.number(),
    maxValue: z.number(),
    label: z.string(),
  })
  .passthrough();

const timelineMetadata = z
  .object({
    ...beatBase,
    type: z.literal("timeline"),
    text: z.string().optional(),
    events: z.array(z.string()),
  })
  .passthrough();

const versusMetadata = z
  .object({
    ...beatBase,
    type: z.literal("versus"),
    text: z.string().optional(),
    left: z.union([z.string(), z.object({ label: z.string() })]),
    right: z.union([z.string(), z.object({ label: z.string() })]),
  })
  .passthrough();

const beforeAfterMetadata = z
  .object({
    ...beatBase,
    type: z.literal("before_after"),
    text: z.string().optional(),
    beforeLabel: z.string(),
    afterLabel: z.string(),
  })
  .passthrough();

const map3DMetadata = z
  .object({
    ...beatBase,
    type: z.literal("map_3d"),
    text: z.string().optional(),
    locationName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    buildings: z.array(z.any()).optional(),
  })
  .passthrough();

const processFlowMetadata = z
  .object({
    ...beatBase,
    type: z.literal("process_flow"),
    text: z.string().optional(),
    steps: z.array(z.string()),
  })
  .passthrough();

const quoteCardMetadata = z
  .object({
    ...beatBase,
    type: z.literal("quote_card"),
    text: z.string().optional(),
    quote: z.string(),
    attribution: z.string().optional(),
    author: z.string().optional(),
  })
  .passthrough();

const statPillMetadata = z
  .object({
    ...beatBase,
    type: z.literal("stat_pill"),
    value: z.union([z.string(), z.number()]),
    label: z.string(),
    prefix: z.string().optional(),
    suffix: z.string().optional(),
  })
  .passthrough();

const quoteAttributionMetadata = z
  .object({
    ...beatBase,
    type: z.literal("quote_attribution"),
    quote: z.string(),
    attribution: z.string(),
    emphasisWords: z.array(z.string()).optional(),
  })
  .passthrough();

const compareSplitMetadata = z
  .object({
    ...beatBase,
    type: z.literal("compare_split"),
    left: z.string(),
    right: z.string(),
    leftLabel: z.string().optional(),
    rightLabel: z.string().optional(),
  })
  .passthrough();

const locationPulseMetadata = z
  .object({
    ...beatBase,
    type: z.literal("location_pulse"),
    locationName: z.string(),
    latitude: z.number(),
    longitude: z.number(),
  })
  .passthrough();

const scrollytellingMetadata = z
  .object({
    ...beatBase,
    type: z.literal("scrollytelling"),
    title: z.string(),
    body: z.string(),
    emphasisWords: z.array(z.string()).optional(),
  })
  .passthrough();

const tickerTapeMetadata = z
  .object({
    ...beatBase,
    type: z.literal("ticker_tape"),
    stories: z.array(z.string()),
    label: z.string().optional(),
  })
  .passthrough();

/* ------------------------------------------------------------------ */
/*  Registry entry.                                                  */
/*  `beatSchema` is the per-type top-level Zod schema.               */
/*  `component` is the React component that renders the beat.        */
/*  `validateBeatMetadata` is a runtime helper that runs the schema  */
/*  against a parsed beat and returns a typed metadata object.      */
/* ------------------------------------------------------------------ */

interface RegistryEntry {
  component: React.ComponentType<any>;
  beatSchema: ZodTypeAny;
  validateBeatMetadata: (beat: unknown) => any;
}

const buildEntry = (
  component: React.ComponentType<any>,
  beatSchema: ZodTypeAny,
): RegistryEntry => ({
  component,
  beatSchema,
  validateBeatMetadata: (beat: unknown) => beatSchema.parse(beat),
});

export const registry: Record<BeatType, RegistryEntry> = {
  key_statement: buildEntry(KeyStatement, keyStatementMetadata),
  headline_card: buildEntry(HeadlineCard, headlineCardMetadata),
  plain_text: buildEntry(PlainText, plainTextMetadata),
  icon_text: buildEntry(IconText, iconTextMetadata),
  chart_line: buildEntry(ChartLine, chartLineMetadata),
  chart_counter: buildEntry(ChartCounter, chartCounterMetadata),
  chart_comparison_3d: buildEntry(ChartComparison3D, chartComparison3DMetadata),
  progress_meter: buildEntry(ProgressMeter, progressMeterMetadata),
  timeline: buildEntry(Timeline, timelineMetadata),
  versus: buildEntry(VersusCard, versusMetadata),
  before_after: buildEntry(BeforeAfter, beforeAfterMetadata),
  map_3d: buildEntry(Map3D, map3DMetadata),
  // process_flow reuses the Timeline component until a dedicated variant
  // is built. The schema validates steps[] as a string array.
  process_flow: buildEntry(Timeline, processFlowMetadata),
  // quote_card has a dedicated component (QuoteCard) registered as
  // the primary renderer. See CLAUDE.md §2.1.1 and 2.1 (quote_attribution
  // is the next copy-paste of HeadlineCard.tsx).
  quote_card: buildEntry(QuoteCard, quoteCardMetadata),
  stat_pill: buildEntry(StatPill, statPillMetadata),
  quote_attribution: buildEntry(QuoteAttribution, quoteAttributionMetadata),
  compare_split: buildEntry(CompareSplit, compareSplitMetadata),
  location_pulse: buildEntry(LocationPulse, locationPulseMetadata),
  scrollytelling: buildEntry(Scrollytelling, scrollytellingMetadata),
  ticker_tape: buildEntry(TickerTape, tickerTapeMetadata),
};

export const getBeatComponent = (type: string): React.ComponentType<any> | null => {
  if (type in registry) {
    return registry[type as BeatType].component;
  }
  return null;
};

export const getBeatSchemas = (type: string): { beatSchema: ZodTypeAny | null } => {
  if (type in registry) {
    return { beatSchema: registry[type as BeatType].beatSchema };
  }
  return { beatSchema: null };
};

export const validateBeatMetadata = (type: string, beat: unknown): any => {
  if (!(type in registry)) {
    throw new Error(`Unknown beat type "${type}". Add a registry entry in src/beats/registry.ts.`);
  }
  return registry[type as BeatType].validateBeatMetadata(beat);
};

export const isBeatTypeSupported = (type: string): boolean => type in registry;

/* ------------------------------------------------------------------ */
/*  Barrel re-export of `adaptMetadata` from `./adaptMetadata`.       */
/*                                                                     */
/*  `adaptMetadata` is defined in its own leaf file (no imports from  */
/*  the registry or the orchestrator) so this re-export doesn't      */
/*  create a circular import with `renderBeat.tsx` (which itself     */
/*  imports from the registry). The previous `from "./renderBeat"`   */
/*  re-export hit a TDZ error under Remotion's React Refresh path.  */
/*                                                                     */
/*  The test file imports from `./registry` to keep its import       */
/*  surface narrow; the orchestrator imports directly from           */
/*  `./adaptMetadata`. Both go through the same function.            */
/* ------------------------------------------------------------------ */

export { adaptMetadata } from "./adaptMetadata";
