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
/*  These mirror the shape Python's beat_generator.py currently emits. */
/* ------------------------------------------------------------------ */

const emphasisWordsSchema = z.array(z.string()).optional();

const baseTextSchema = z.object({
  text: z.string(),
});

const keyStatementMetadata = baseTextSchema.extend({
  emphasisWords: emphasisWordsSchema,
});

const plainTextMetadata = baseTextSchema;

const iconTextMetadata = baseTextSchema.extend({
  icon: z.string(),
  emphasisWords: emphasisWordsSchema,
});

const chartLineMetadata = z.object({
  points: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
      }),
    )
    .min(2),
  durationInFrames: z.number().optional(),
  exitDirection: z.enum(["up", "down", "left", "right"]).optional(),
});

const chartCounterMetadata = z.object({
  value: z.number(),
  label: z.string(),
  durationInFrames: z.number().optional(),
});

const chartComparison3DMetadata = z.object({
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
  value: z.number(),
  maxValue: z.number(),
  label: z.string(),
});

const timelineMetadata = z.object({
  events: z
    .array(
      z.object({
        marker: z.string(),
        label: z.string(),
      }),
    )
    .min(1),
});

const versusMetadata = z.object({
  left: z.string(),
  right: z.string(),
});

const beforeAfterMetadata = z.object({
  beforeLabel: z.string(),
  afterLabel: z.string(),
});

const map3DMetadata = z.object({
  locationName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  buildings: z.number().optional(),
});

const processFlowMetadata = z.object({
  steps: z.array(z.string()).min(1),
});

const quoteCardMetadata = z.object({
  quote: z.string(),
  author: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Registry entry shape                                              */
/* ------------------------------------------------------------------ */

type RegistryEntry = {
  component: React.ComponentType<any>;
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
    // Same shape as the 3D variant; we still default to the 3D component
    // so chart_comparison is supported end-to-end.
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
    // map_location falls back to Map3D until a dedicated 2D map component exists.
    component: Map3D,
    metadataSchema: map3DMetadata,
  },
  map_3d: {
    component: Map3D,
    metadataSchema: map3DMetadata,
  },
  process_flow: {
    // process_flow falls back to Timeline until a dedicated process flow component exists.
    component: Timeline,
    metadataSchema: processFlowMetadata,
  },
  quote_card: {
    // quote_card falls back to KeyStatement until a dedicated quote card component exists.
    component: KeyStatement,
    metadataSchema: quoteCardMetadata,
  },
};

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

export type BeatProps = {
  /** Per-beat narration text, lifted from the top level of each beat object. */
  text: string;
  /** Per-beat timing, forwarded to inner components. */
  durationInFrames: number;
  /** Component-specific metadata, already validated by Zod. */
  metadata: Record<string, unknown>;
};

/**
 * Look up the React component for a given beat type, or `null` if unsupported.
 */
export const getBeatComponent = (
  type: BeatType,
): React.ComponentType<any> | null => {
  return registry[type]?.component ?? null;
};

/**
 * Validate a beat's metadata against its Zod schema.
 * Throws a descriptive error if validation fails.
 */
export const validateBeatMetadata = (type: BeatType, metadata: unknown) => {
  const entry = registry[type];
  if (!entry) {
    throw new Error(
      `No registry entry for beat type "${type}". Add one in src/beats/registry.ts.`,
    );
  }
  return entry.metadataSchema.parse(metadata);
};

/**
 * Check whether a beat type has a registered component (some types may be
 * known but not yet implemented in the registry).
 */
export const isBeatTypeSupported = (type: BeatType): boolean => {
  return registry[type] != null;
};
