import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
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

interface TimedBeatsData {
  fps: number;
  totalDurationInFrames: number;
  beats: unknown[];
}

interface TimestampsDataShape {
  word: string;
  start: number;
  end: number;
}

// Asynchronously fetch the two JSON files at composition mount. The
// `abortSignal` cancels stale requests when the user changes props in
// Studio before the previous fetch has resolved.
//
// IMPORTANT: this function is best-effort. If the fetch fails (file
// missing, network error, non-2xx status), it returns null and the
// caller falls back to whatever is already in `defaultProps`. This
// prevents a missing JSON from collapsing the entire video to a
// single frame.
const fetchRenderData = async (
  abortSignal: AbortSignal,
): Promise<{
  beats: TimedBeats;
  words: Word[];
  narrationSrc: string;
  fps: number;
  totalDurationInFrames: number;
} | null> => {
  try {
    const [beatsResp, wordsResp] = await Promise.all([
      fetch(staticFile("beats.json"), { signal: abortSignal }),
      fetch(staticFile("timestamps.json"), { signal: abortSignal }),
    ]);
    if (!beatsResp.ok || !wordsResp.ok) {
      // Surface a clear warning in render logs so the user can fix the
      // missing file without having to guess.
      // eslint-disable-next-line no-console
      console.warn(
        `[MotionGraphicsVideo] runtime data fetch failed — ` +
          `beats.json=${beatsResp.status}, timestamps.json=${wordsResp.status}. ` +
          `Make sure public/beats.json and public/timestamps.json exist. ` +
          `Falling back to defaultProps (which means the composition will be 1 frame).`,
      );
      return null;
    }
    const beats = (await beatsResp.json()) as TimedBeatsData;
    const words = (await wordsResp.json()) as TimestampsDataShape[];

    if (
      !beats ||
      typeof beats.fps !== "number" ||
      typeof beats.totalDurationInFrames !== "number" ||
      !Array.isArray(beats.beats)
    ) {
      // eslint-disable-next-line no-console
      console.warn(
        `[MotionGraphicsVideo] public/beats.json is missing required fields ` +
          `({ fps: number, totalDurationInFrames: number, beats: array }). ` +
          `Falling back to defaultProps.`,
      );
      return null;
    }

    return {
      beats: beats as unknown as TimedBeats,
      words: words as unknown as Word[],
      narrationSrc: "narration.mp3",
      fps: beats.fps,
      totalDurationInFrames: beats.totalDurationInFrames,
    };
  } catch (err) {
    // AbortError is normal when the user changes props in Studio mid-fetch;
    // we don't need to warn for that.
    if (err instanceof Error && err.name === "AbortError") {
      return null;
    }
    // eslint-disable-next-line no-console
    console.warn(
      `[MotionGraphicsVideo] runtime data fetch threw: ${err instanceof Error ? err.message : String(err)}. ` +
        `Falling back to defaultProps.`,
    );
    return null;
  }
};

const renderDataCalculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = async ({ props, abortSignal }) => {
  const data = await fetchRenderData(abortSignal);
  if (!data) {
    // Return the static duration. MotionGraphicsVideo's own
    // calculateMetadata will run afterwards and warn if the
    // beats prop is still empty.
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
      If the fetch fails (missing file, network error, bad JSON), the
      fetch falls back to defaultProps and warns to the render log — the
      render will still proceed, just as a 1-frame video.
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
