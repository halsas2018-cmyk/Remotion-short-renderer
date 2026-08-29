import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { MotionGraphicsVideo, MotionGraphicsVideoProps } from "./MotionGraphicsVideo";
import { TimedBeatsSchema, WordListSchema } from "./beats/types";
import { dedupeOverlappingWords, type Word } from "./beats/words";
import {
  AMBIENT_SFX_URL,
  TRANSITION_SFX_URL,
  TYPING_SFX_URL,
  writeAudioPlanLog,
  type AudioPlanLog,
} from "./lib/sceneSfx";
import { computeTransitionFrames } from "./lib/transitionDuration";

/* ------------------------------------------------------------------ */
/*  Beat types whose kinetic-captions wrapper emits typing clicks.     */
/*  Must match the orchestrator's CAPTION_VISIBLE_BEAT_TYPES set.      */
/* ------------------------------------------------------------------ */
const CAPTION_VISIBLE_BEAT_TYPES = new Set<string>([
  "map_3d",
  "chart_line",
  "chart_comparison_3d",
  "chart_counter",
  "progress_meter",
  "timeline",
]);

const PUBLIC_BEATS_URL = staticFile("beats.json");
const PUBLIC_TIMESTAMPS_URL = staticFile("timestamps.json");
const PUBLIC_NARRATION_URL = staticFile("narration.mp3");
const PUBLIC_AMBIENT_URL = `public/${AMBIENT_SFX_URL}`;

/* ------------------------------------------------------------------ */
/*  Fetch + validate + dedupe + compute audio plan.                    */
/*                                                                     */
/*  This runs once per render (BEFORE the React tree mounts, which is  */
/*  why it works during a `still` (single-frame) render — the audio   */
/*  observability story behind Horizon 0.4 / 1.4).                     */
/* ------------------------------------------------------------------ */
export const renderDataCalculateMetadata: CalculateMetadataFunction<
  MotionGraphicsVideoProps
> = async ({ props }) => {
  // Always trust the runtime-fetched beats/words (if they're already
  // populated via defaultProps from a *Test composition, we leave them
  // alone — that's how the existing Test compositions still work).
  if (props.beats && props.beats.beats && props.beats.beats.length > 0) {
    return {
      durationInFrames: props.beats.totalDurationInFrames,
      props,
    };
  }

  let beatsJson: unknown;
  let wordsJson: unknown;

  try {
    const [beatsRes, wordsRes] = await Promise.all([
      fetch(PUBLIC_BEATS_URL),
      fetch(PUBLIC_TIMESTAMPS_URL),
    ]);

    if (!beatsRes.ok) {
      throw new Error(
        `[MotionGraphicsVideo] public/beats.json fetch failed: HTTP ${beatsRes.status} ${beatsRes.statusText}. ` +
          `Make sure the file exists in /public and is readable.`,
      );
    }
    if (!wordsRes.ok) {
      throw new Error(
        `[MotionGraphicsVideo] public/timestamps.json fetch failed: HTTP ${wordsRes.status} ${wordsRes.statusText}. ` +
          `Make sure the file exists in /public and is readable.`,
      );
    }

    try {
      beatsJson = await beatsRes.json();
    } catch (e) {
      throw new Error(
        `[MotionGraphicsVideo] public/beats.json is not valid JSON: ${(e as Error).message}`,
      );
    }
    try {
      wordsJson = await wordsRes.json();
    } catch (e) {
      throw new Error(
        `[MotionGraphicsVideo] public/timestamps.json is not valid JSON: ${(e as Error).message}`,
      );
    }
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      // Benign: Studio prop change mid-fetch. Don't spam the log.
      return { durationInFrames: 1, props };
    }
    throw e;
  }

  const beatsParsed = TimedBeatsSchema.safeParse(beatsJson);
  if (!beatsParsed.success) {
    const issue = beatsParsed.error.issues[0];
    const path = issue.path.length ? `"${issue.path.join(".")}"` : "root";
    throw new Error(
      `[MotionGraphicsVideo] public/beats.json failed schema validation at ${path}: ${issue.message}`,
    );
  }

  const wordsParsed = WordListSchema.safeParse(wordsJson);
  if (!wordsParsed.success) {
    const issue = wordsParsed.error.issues[0];
    const path = issue.path.length ? `"${issue.path.join(".")}"` : "root";
    throw new Error(
      `[MotionGraphicsVideo] public/timestamps.json failed schema validation at ${path}: ${issue.message}`,
    );
  }

  const { words: cleanedWords, dropped } = dedupeOverlappingWords(
    wordsParsed.data as unknown as Word[],
  );
  if (dropped > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[MotionGraphicsVideo] public/timestamps.json had ${dropped} overlapping or zero-duration word(s); dropped them to keep the kinetic captions in sync. ` +
        `Original count: ${wordsParsed.data.length}, cleaned count: ${cleanedWords.length}. ` +
        `Check the WhisperX alignment step in the Python pipeline.`,
    );
  }

  // ------------------------------------------------------------------
  // Compute the audio plan (whoosh slots + click count) so the smoke
  // test can verify it before any <Audio> ever mounts. We mirror the
  // orchestrator's layout exactly: same `computeTransitionFrames`
  // helper, same CAPTION_VISIBLE_BEAT_TYPES set.
  // ------------------------------------------------------------------
  const beats = beatsParsed.data.beats;
  const whooshSlots: AudioPlanLog["whooshSlots"] = [];
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];
    const next = beats[i + 1];
    if (!next) break; // last beat has no outgoing transition
    const transitionFrames = computeTransitionFrames(
      beat.durationInFrames,
      next.durationInFrames,
    );
    if (transitionFrames <= 0) continue;
    const from = Math.max(
      0,
      beat.startFrame + beat.durationInFrames - transitionFrames,
    );
    whooshSlots.push({ from, to: from + transitionFrames, beatIndex: i });
  }

  const wordsInCaptions = beats
    .filter((b) => CAPTION_VISIBLE_BEAT_TYPES.has(b.type))
    .flatMap((b) => {
      const windowStart = b.startFrame / beatsParsed.data.fps;
      const windowEnd = (b.startFrame + b.durationInFrames) / beatsParsed.data.fps;
      return cleanedWords.filter(
        (w) => w.end > windowStart && w.start < windowEnd,
      );
    });
  const clickCount = wordsInCaptions.length;

  const plan: AudioPlanLog = {
    beatsCount: beats.length,
    wordsCount: cleanedWords.length,
    narration: PUBLIC_NARRATION_URL.replace(/^\//, "public/"),
    ambient: PUBLIC_AMBIENT_URL,
    whooshCount: whooshSlots.length,
    clickCount,
    whooshSlots,
  };

  // Write the plan to out/audio-mounts.log. Failures are warned, not
  // thrown — a broken log file shouldn't kill the render.
  //
  // We pass `projectRoot` explicitly so the helper doesn't have to
  // guess it. We use the same `process.cwd()`-or-`process.env.PWD`
  // strategy the smoke script uses (the bash script does
  // `cd "${PROJECT_ROOT}"` then runs `npx remotion still`, so the
  // cwd is the project root). If `process.cwd()` is unavailable
  // (it shouldn't be — Remotion runs `still` in a real Node
  // process), we fall back to `PWD` env var, then to the
  // helper's own auto-resolution (which walks up looking for
  // package.json).
  //
  // The fact that the helper's auto-resolution was sometimes
  // landing in the wrong place (e.g. inside node_modules/.cache
  // when webpack substituted __dirname) was the root cause of
  // the 1.4 audio plan log being empty in the smoke test. Passing
  // projectRoot explicitly removes the ambiguity.
  let projectRoot: string | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proc: any = typeof process !== "undefined" ? process : undefined;
    if (proc && typeof proc.cwd === "function") {
      projectRoot = proc.cwd();
    } else if (proc && typeof proc.env?.PWD === "string") {
      projectRoot = proc.env.PWD;
    }
  } catch {
    // ignore — let writeAudioPlanLog fall back to its own resolution
  }
  try {
    writeAudioPlanLog(plan, projectRoot);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      `[MotionGraphicsVideo] failed to write out/audio-mounts.log: ${(e as Error).message}`,
    );
  }

  // Reference the SFX URLs so the bundler doesn't tree-shake them if
  // they're otherwise unused in this file. Cheap, idempotent.
  void TRANSITION_SFX_URL;
  void TYPING_SFX_URL;

  return {
    durationInFrames: beatsParsed.data.totalDurationInFrames,
    props: {
      ...props,
      beats: beatsParsed.data,
      words: cleanedWords,
      narrationSrc: "narration.mp3",
    },
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionGraphicsVideo"
        component={MotionGraphicsVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        calculateMetadata={renderDataCalculateMetadata}
        defaultProps={{
          beats: {
            fps: 30,
            totalDurationInFrames: 300,
            beats: [],
          },
          words: [],
          narrationSrc: "narration.mp3",
        }}
      />
    </>
  );
};
