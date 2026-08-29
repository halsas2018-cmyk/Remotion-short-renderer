import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { z } from "zod";
import { ChartCounter } from "./ChartCounter";
import { KeyStatement } from "./KeyStatement";
import { VersusCard } from "./VersusCard";
import { BeforeAfter } from "./BeforeAfter";
import { PlainText } from "./PlainText";
import { IconText } from "./IconText";
import { ProgressMeter } from "./ProgressMeter";
import { Timeline } from "./Timeline";
import { ChartComparison3D } from "./ChartComparison3D";
import { Map3D } from "./Map3D";
import { ChartLine } from "./ChartLine";
import { KineticCaptions } from "./KineticCaptions";
import { PersistentBackground } from "./PersistentBackground";
import {
  MotionGraphicsVideo,
  MotionGraphicsVideoProps,
  calculateMetadata,
} from "./MotionGraphicsVideo";
import type { Word } from "./beats/words";
import type { TimedBeats } from "./beats/types";

/* ------------------------------------------------------------------ */
/*  Render data                                                       */
/*                                                                     */
/*  The orchestrator reads four files from /public at composition     */
/*  mount time (via calculateMetadata + staticFile + fetch):           */
/*                                                                     */
/*    - public/narration.mp3         → narrationSrc                    */
/*    - public/beats.json            → beats (TimedBeats shape)        */
/*    - public/timestamps.json       → words (WhisperX shape)          */
/*    - public/sfx-ambient.mp3       → ambient SFX (read directly by   */
/*                                     the orchestrator via sceneSfx)  */
/*                                                                     */
/*  To render a different video, copy those four files into public/    */
/*  and run `npx remotion render MotionGraphicsVideo out/movie.mp4`.   */
/*  No code change required.                                           */
/* ------------------------------------------------------------------ */

// ------------------------------------------------------------------
// Zod schemas for the two JSON files (Horizon 0.2 / 0.3 — 1.1 ships
// the schema, the strict top-level validation, and the hard-error
// path; 1.2 / 1.3 will add per-beat and per-word validation in
// subsequent commits).
//
// For now we use a permissive schema (every beat is `unknown` and
// every word is a `z.unknown()` field) so we don't break on shapes
// we haven't yet learned to validate. The point of this commit is
// to replace the silent fallback with a hard error when the FILES
// are missing or the top-level shape is wrong — not to validate
// every field.
// ------------------------------------------------------------------

const TimedBeatsSchema = z.object({
  fps: z.number().int().positive(),
  totalDurationInFrames: z.number().int().nonnegative(),
  beats: z.array(z.unknown()),
});

const WordSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
});

const RenderDataError = (message: string, cause?: unknown): Error => {
  if (cause instanceof Error) {
    return new Error(`[MotionGraphicsVideo] ${message}: ${cause.message}`);
  }
  if (cause !== undefined) {
    return new Error(
      `[MotionGraphicsVideo] ${message}: ${JSON.stringify(cause)}`,
    );
  }
  return new Error(`[MotionGraphicsVideo] ${message}`);
};

interface RenderDataResult {
  beats: TimedBeats;
  words: Word[];
  narrationSrc: string;
  fps: number;
  totalDurationInFrames: number;
}

// ------------------------------------------------------------------
// Hard-error fetch (Horizon 0.1 — replaces silent fallback).
//
// Behavior changes from the previous commit:
//   - Missing JSON files now THROW. Previously we returned
//     `durationInFrames: 1` and the user got a 1-frame MP4 with no
//     explanation.
//   - Invalid top-level JSON shape (e.g. `beats.fps` is a string)
//     THROWS with the exact field path that failed Zod validation.
//   - Network errors (non-2xx, fetch rejected) THROW.
//   - AbortError is still treated as a benign cancellation (the
//     user changed props in Studio before the previous fetch
//     resolved). The orchestrator falls back to defaultProps in
//     that case because there's nothing meaningful to render
//     against.
// ------------------------------------------------------------------
const fetchRenderData = async (
  abortSignal: AbortSignal,
): Promise<RenderDataResult | null> => {
  let beatsResp: Response;
  let wordsResp: Response;
  try {
    [beatsResp, wordsResp] = await Promise.all([
      fetch(staticFile("beats.json"), { signal: abortSignal }),
      fetch(staticFile("timestamps.json"), { signal: abortSignal }),
    ]);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return null;
    }
    throw RenderDataError(
      `failed to fetch public/beats.json or public/timestamps.json`,
      err,
    );
  }

  if (!beatsResp.ok) {
    throw RenderDataError(
      `public/beats.json fetch failed: HTTP ${beatsResp.status} ` +
        `${beatsResp.statusText}. Make sure the file exists in /public ` +
        `and is readable.`,
    );
  }
  if (!wordsResp.ok) {
    throw RenderDataError(
      `public/timestamps.json fetch failed: HTTP ${wordsResp.status} ` +
        `${wordsResp.statusText}. Make sure the file exists in /public ` +
        `and is readable.`,
    );
  }

  let beatsRaw: unknown;
  let wordsRaw: unknown;
  try {
    [beatsRaw, wordsRaw] = await Promise.all([
      beatsResp.json(),
      wordsResp.json(),
    ]);
  } catch (err) {
    throw RenderDataError(
      `public/beats.json or public/timestamps.json is not valid JSON`,
      err,
    );
  }

  const beatsParsed = TimedBeatsSchema.safeParse(beatsRaw);
  if (!beatsParsed.success) {
    const issue = beatsParsed.error.issues[0];
    const path = issue?.path.join(".") || "(root)";
    throw RenderDataError(
      `public/beats.json failed schema validation at "${path}": ` +
        (issue?.message ?? "unknown error"),
    );
  }

  const wordsArraySchema = z.array(WordSchema).nonempty();
  const wordsParsed = wordsArraySchema.safeParse(wordsRaw);
  if (!wordsParsed.success) {
    const issue = wordsParsed.error.issues[0];
    const path = issue?.path.join(".") || "(root)";
    throw RenderDataError(
      `public/timestamps.json failed schema validation at "${path}": ` +
        (issue?.message ?? "unknown error"),
    );
  }

  return {
    beats: beatsParsed.data as unknown as TimedBeats,
    words: wordsParsed.data as unknown as Word[],
    narrationSrc: "narration.mp3",
    fps: beatsParsed.data.fps,
    totalDurationInFrames: beatsParsed.data.totalDurationInFrames,
  };
};

const renderDataCalculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = async ({ props, abortSignal }) => {
  const data = await fetchRenderData(abortSignal);
  if (!data) {
    // AbortError path: no useful data to inject, keep defaultProps.
    return {
      durationInFrames: 1,
      props,
    };
  }
  return {
    durationInFrames: data.totalDurationInFrames,
    props: {
      ...props,
      beats: data.beats,
      words: data.words,
      narrationSrc: data.narrationSrc,
    },
  };
};

// Root component - returns all compositions in a fragment
// This file should NOT call registerRoot()
export const RemotionRoot = () => (
  <>
    <Composition
      id="ChartCounterTest"
      component={ChartCounter}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        value: 70000000000,
        label: "in debt",
        durationInFrames: 90,
      }}
    />
    <Composition
      id="KeyStatementTest"
      component={KeyStatement}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The gamble works while AI chips are scarce",
        emphasisWords: ["scarce"],
        durationInFrames: 90,
      }}
    />
    <Composition
      id="KeyStatementLongTest"
      component={KeyStatement}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "People who are really serious about software should make their own hardware",
        emphasisWords: ["serious", "software", "hardware"],
      }}
    />
    <Composition
      id="KeyStatementShortTest"
      component={KeyStatement}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The future is already here",
        emphasisWords: ["future"],
      }}
    />
    <Composition
      id="VersusCardTest"
      component={VersusCard}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        left: {
          label: "Broadcom",
          value: "$70B debt",
          items: ["Chip design", "Software", "Infrastructure"],
        },
        right: {
          label: "Nvidia",
          value: "$500B market cap",
          items: ["GPU monopoly", "CUDA lock-in", "Data center"],
        },
      }}
    />
    <Composition
      id="BeforeAfterTest"
      component={BeforeAfter}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        beforeLabel: "Manual Chip Procurement",
        afterLabel: "Automated Lease-Back Model",
      }}
    />
    <Composition
      id="PlainTextTest"
      component={PlainText}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The gamble works while AI chips are scarce",
        durationInFrames: 120,
      }}
    />
    <Composition
      id="PlainTextLongTest"
      component={PlainText}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "People who are really serious about software should make their own hardware",
        durationInFrames: 180,
      }}
    />
    <Composition
      id="PlainTextShortTest"
      component={PlainText}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        text: "The future is already here",
        durationInFrames: 90,
      }}
    />
    <Composition
      id="IconTextTest"
      component={IconText}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        icon: "risk",
        text: "Broadcom only guarantees part of the loan",
        emphasisWords: ["guarantees", "part"],
        durationInFrames: 150,
      }}
    />
    <Composition
      id="ProgressMeterTest"
      component={ProgressMeter}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        value: 70000000000,
        maxValue: 100000000000,
        label: "Funding Secured",
      }}
    />
    <Composition
      id="ProgressMeterLongLabelTest"
      component={ProgressMeter}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        value: 50000000000,
        maxValue: 100000000000,
        label: "Quarterly Revenue Target",
      }}
    />
    <Composition
      id="TimelineTest"
      component={Timeline}
      durationInFrames={120}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2029", label: "Exposure could hit $370B" },
        ],
      }}
    />
    <Composition
      id="Timeline3EventsTest"
      component={Timeline}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
        ],
      }}
    />
    <Composition
      id="Timeline4EventsTest"
      component={Timeline}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
          { marker: "2032", label: "AI chip market matures" },
        ],
      }}
    />
    <Composition
      id="Timeline5EventsTest"
      component={Timeline}
      durationInFrames={210}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        events: [
          { marker: "2024", label: "Meta raised $27B" },
          { marker: "2025", label: "AI infrastructure boom begins" },
          { marker: "2026", label: "Broadcom acquires VMware" },
          { marker: "2029", label: "Exposure could hit $370B" },
          { marker: "2032", label: "AI chip market matures" },
        ],
      }}
    />
    <Composition
      id="ChartComparison3DTest"
      component={ChartComparison3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        items: [
          { label: "Broadcom", value: 70000000000 },
          { label: "Nvidia", value: 500000000000 },
        ],
      }}
    />
    <Composition
      id="ChartComparison3DThreeTest"
      component={ChartComparison3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        items: [
          { label: "Meta", value: 27000000000 },
          { label: "Google", value: 85000000000 },
          { label: "Microsoft", value: 310000000000 },
        ],
      }}
    />
    <Composition
      id="ChartComparison3DFourTest"
      component={ChartComparison3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        items: [
          { label: "Q1", value: 12000000000 },
          { label: "Q2", value: 18000000000 },
          { label: "Q3", value: 15000000000 },
          { label: "Q4", value: 27000000000 },
        ],
      }}
    />
    <Composition
      id="Map3DTest"
      component={Map3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        locationName: "San Francisco",
        latitude: 37.7749,
        longitude: -122.4194,
        buildings: 8,
      }}
    />
    <Composition
      id="Map3DTokyoTest"
      component={Map3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        locationName: "Tokyo",
        latitude: 35.6762,
        longitude: 139.6503,
        buildings: 12,
      }}
    />
    <Composition
      id="Map3DLondonTest"
      component={Map3D}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        locationName: "London",
        latitude: 51.5074,
        longitude: -0.1278,
        buildings: 6,
      }}
    />
    <Composition
      id="ChartLineTest"
      component={ChartLine}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        points: [
          { label: "Q1", value: 12000000000 },
          { label: "Q2", value: 18000000000 },
          { label: "Q3", value: 15000000000 },
          { label: "Q4", value: 27000000000 },
        ],
        durationInFrames: 90,
        exitDirection: "up",
      }}
    />
    <Composition
      id="KineticCaptionsTest"
      component={KineticCaptions}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        // Active data-vis beat types — must match the gate in
        // src/beats/renderBeat.tsx (CAPTION_VISIBLE_BEAT_TYPES).
        captionEnabledTypes: new Set([
          "map_3d",
          "chart_line",
          "chart_comparison_3d",
          "chart_counter",
          "progress_meter",
          "timeline",
        ]),
        beats: [],
        words: [],
      }}
    />
    <Composition
      id="PersistentBackgroundTest"
      component={PersistentBackground}
      durationInFrames={180}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
    {/*
      The full video. calculateMetadata (renderDataCalculateMetadata) fetches
      beats.json + timestamps.json from /public and overrides the static
      durationInFrames + populates beats/words/narrationSrc.

      The "1" duration is a placeholder; the async calculateMetadata runs
      before the composition is registered and supplies the real number.
      If the fetch fails (missing file, network error, bad JSON),
      renderDataCalculateMetadata THROWS — Remotion surfaces the error in
      the render log, the render aborts, and the user sees a clear
      "[MotionGraphicsVideo] public/beats.json fetch failed: HTTP 404"
      message instead of a 1-frame MP4.
    */}
    <Composition
      id="MotionGraphicsVideo"
      component={MotionGraphicsVideo}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{
        // `beats` and `words` are injected by calculateMetadata below.
        // `narrationSrc` is also injected by calculateMetadata; the
        // placeholder is only used in the brief window before the fetch
        // resolves (or permanently, if the fetch fails).
        beats: { fps: 30, totalDurationInFrames: 1, beats: [] } as TimedBeats,
        words: [] as Word[],
        narrationSrc: "narration.mp3",
      }}
      calculateMetadata={renderDataCalculateMetadata}
    />
  </>
);
