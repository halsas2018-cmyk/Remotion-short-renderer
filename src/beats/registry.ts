import React from "react";
import { z } from "zod";
import { KeyStatement } from "../KeyStatement";
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
import { BeatType } from "./types";

/* ------------------------------------------------------------------ */
/*  Per-type Zod schemas                                               */
/*                                                                     */
/*  IMPORTANT: The Python pipeline (beat_generator.py) emits per-type  */
/*  fields (text, emphasisWords, icon, left, right, events, steps,    */
/*  beforeLabel, afterLabel, locationName, latitude, longitude,       */
/*  buildings, etc.) at the TOP LEVEL of each beat, NOT inside a      */
/*  nested `metadata` field. The orchestrator passes the whole beat   */
/*  object here and the schema below picks out the relevant fields.   */
/* ------------------------------------------------------------------ */

const emphasisWordsSchema = z.array(z.string()).optional();

/**
 * Common fields present on every beat.
 * Used as a base for every schema below.
 */
const beatBase = {
  type: z.string(),
  text: z.string(),
  startFrame: z.number(),
  durationInFrames: z.number(),
  endFrame: z.number().optional(),
};

const keyStatementMetadata = z.object({
  ...beatBase,
  emphasisWords: emphasisWordsSchema,
});

const plainTextMetadata = z.object({
  ...beatBase,
});

const iconTextMetadata = z.object({
  ...beatBase,
  icon: z.string(),
  emphasisWords: emphasisWordsSchema,
});

const chartLineMetadata = z.object({
  ...beatBase,
  points: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
      }),
    )
    .min(2),
  exitDirection: z.enum(["up", "down", "left", "right"]).optional(),
});

const chartCounterMetadata = z.object({
  ...beatBase,
  value: z.number(),
  label: z.string(),
});

const chartComparison3DMetadata = z.object({
  ...beatBase,
  items: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
      }),
    )
    .min(2),
});

const progressMeterMetadata = z.object({
  ...beatBase,
  value: z.number(),
  maxValue: z.number(),
  label: z.string(),
});

const timelineMetadata = z.object({
  ...beatBase,
  events: z.array(z.string()).min(1),
});

const versusMetadata = z.object({
  ...beatBase,
  left: z.string(),
  right: z.string(),
});

const beforeAfterMetadata = z.object({
  ...beatBase,
  beforeLabel: z.string(),
  afterLabel: z.string(),
});

const map3DMetadata = z.object({
  ...beatBase,
  locationName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  buildings: z.number().optional(),
});

const processFlowMetadata = z.object({
  ...beatBase,
  steps: z.array(z.string()).min(1),
});

const quoteCardMetadata = z.object({
  ...beatBase,
  quote: z.string(),
  author: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Registry entry shape                                              */
/* ------------------------------------------------------------------ */

type RegistryEntry = {
  component: React.ComponentType<any>;
  /**
   * Zod schema for the WHOLE beat (top-level fields), not just metadata.
   * The schema validates that the per-type fields required by this
   * beat type are present and well-typed.
   */
  metadataSchema: z.ZodTypeAny;
};

const registry: Record<BeatType, RegistryEntry | null> = {
  key_statement: {
    component: KeyStatement,
    metadataSchema: keyStatementMetadata,
  },
  plain_text: {
    component: PlainText,
    metadataSchema: plainTextMetadata,
  },
  icon_text: {
    component: IconText,
    metadataSchema: iconTextMetadata,
  },
  chart_line: {
    component: ChartLine,
    metadataSchema: chartLineMetadata,
  },
  chart_counter: {
    component: ChartCounter,
    metadataSchema: chartCounterMetadata,
  },
  chart_comparison: {
    component: ChartComparison3D,
    metadataSchema: chartComparison3DMetadata,
  },
  chart_comparison_3d: {
    component: ChartComparison3D,
    metadataSchema: chartComparison3DMetadata,
  },
  progress_meter: {
    component: ProgressMeter,
    metadataSchema: progressMeterMetadata,
  },
  timeline: {
    component: Timeline,
    metadataSchema: timelineMetadata,
  },
  versus: {
    component: VersusCard,
    metadataSchema: versusMetadata,
  },
  before_after: {
    component: BeforeAfter,
    metadataSchema: beforeAfterMetadata,
  },
  map_location: {
    component: Map3D,
    metadataSchema: map3DMetadata,
  },
  map_3d: {
    component: Map3D,
    metadataSchema: map3DMetadata,
  },
  process_flow: {
    component: Timeline,
    metadataSchema: processFlowMetadata,
  },
  quote_card: {
    component: KeyStatement,
    metadataSchema: quoteCardMetadata,
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Look up the React component for a given beat type, or `null` if unsupported.
 */
export const getBeatComponent = (
  type: BeatType,
): React.ComponentType<any> | null => {
  return registry[type]?.component ?? null;
};

/**
 * Validate a beat (the full top-level beat object) against its Zod schema.
 * Throws a descriptive error if validation fails.
 */
export const validateBeatMetadata = (type: BeatType, beat: unknown) => {
  const entry = registry[type];
  if (!entry) {
    throw new Error(
      `No registry entry for beat type "${type}". Add one in src/beats/registry.ts.`,
    );
  }
  return entry.metadataSchema.parse(beat);
};

/**
 * Check whether a beat type has a registered component.
 */
export const isBeatTypeSupported = (type: BeatType): boolean => {
  return registry[type] != null;
};
