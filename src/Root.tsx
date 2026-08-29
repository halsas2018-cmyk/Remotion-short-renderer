import React from "react";
import { CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { MotionGraphicsVideo, MotionGraphicsVideoProps } from "./MotionGraphicsVideo";
import { HeadlineCard, HeadlineCardSchema } from "./HeadlineCard";
import { TimedBeatsSchema, WordListSchema } from "./beats/types";
import { dedupeOverlappingWords, type Word } from "./beats/words";

const PUBLIC_BEATS_URL = staticFile("beats.json");
const PUBLIC_TIMESTAMPS_URL = staticFile("timestamps.json");
const PUBLIC_NARRATION_URL = "narration.mp3";

/* ------------------------------------------------------------------ */
/*  Fetch + validate + dedupe.                                         */
/*                                                                     */
/*  This runs once per render (BEFORE the React tree mounts, which is  */
/*  why it works during a `still` (single-frame) render).             */
/*                                                                     */
/*  Note on audio observability: the Horizon 1.4 audio plan log used   */
/*  to be written here. It was dropped because (a) Remotion's render  */
/*  context shims `process` without `process.versions.node`, making   */
/*  the "am I in real Node?" guard unreliable, and (b) the audio      */
/*  streams are observable through the React tree itself, not a side- */
/*  channel log. See ROADMAP.md and CLAUDE.md 1.4 for the full         */
/*  reasoning. The audio plan computation block (whoosh slot list +   */
/*  click count) is gone from this file.                              */
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

  return {
    durationInFrames: beatsParsed.data.totalDurationInFrames,
    props: {
      ...props,
      beats: beatsParsed.data,
      words: cleanedWords,
      narrationSrc: PUBLIC_NARRATION_URL,
    },
  };
};

/* ------------------------------------------------------------------ */
/*  HeadlineCard test composition                                      */
/*                                                                     */
/*  Single-beat composition for visual QA of the new component.       */
/*  Portrait 1080×1920 to match the design system. The component      */
/*  itself is a transparent overlay on the persistent background.    */
/* ------------------------------------------------------------------ */

const HeadlineCardTestComposition: React.FC = () => {
  return (
    <HeadlineCard
      text="The gamble works while AI chips are scarce"
      emphasisWords={["gamble", "scarce"]}
    />
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionGraphicsVideo"
        component={MotionGraphicsVideo}
        durationInFrames={300}
        fps={30}
        width={1080}
        height={1920}
        calculateMetadata={renderDataCalculateMetadata}
        defaultProps={{
          beats: {
            fps: 30,
            totalDurationInFrames: 300,
            beats: [],
          },
          words: [],
          narrationSrc: PUBLIC_NARRATION_URL,
        }}
      />
      <Composition
        id="HeadlineCardTest"
        component={HeadlineCardTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          text: "The gamble works while AI chips are scarce",
          emphasisWords: ["gamble", "scarce"],
        }}
      />
    </>
  );
};
