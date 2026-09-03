import React from "react";
import { AbsoluteFill, CalculateMetadataFunction, Composition, staticFile } from "remotion";
import { MotionGraphicsVideo, MotionGraphicsVideoProps } from "./MotionGraphicsVideo";
import { HeadlineCard } from "./HeadlineCard";
import { KeyStatement } from "./KeyStatement";
import { ChartCounter } from "./ChartCounter";
import { VersusCard } from "./VersusCard";
import { BeforeAfter } from "./BeforeAfter";
import { QuoteCard } from "./QuoteCard";
import { StatPill } from "./components/StatPill";
import { QuoteAttribution } from "./components/QuoteAttribution";
import { CompareSplit } from "./components/CompareSplit";
import { LocationPulse } from "./components/LocationPulse";
import { Scrollytelling } from "./components/Scrollytelling";
import { TickerTape } from "./components/TickerTape";
import { PlainText } from "./PlainText";
import { TimedBeatsSchema, WordListSchema } from "./beats/types";
import { dedupeOverlappingWords, type Word } from "./beats/words";
import { Logo } from "./Logo";
import { SourceBadge } from "./components/SourceBadge";

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

/* ------------------------------------------------------------------ */
/*  KeyStatement test composition                                      */
/*                                                                     */
/*  Single-beat composition for visual QA of the gold-standard         */
/*  text component. Same portrait dimensions; same default text so  */
/*  you can side-by-side HeadlineCardTest with KeyStatementTest.    */
/* ------------------------------------------------------------------ */

const KeyStatementTestComposition: React.FC = () => {
  return (
    <KeyStatement
      text="The gamble works while AI chips are scarce"
      emphasisWords={["gamble", "scarce"]}
    />
  );
};

const ChartCounterTestComposition: React.FC<{
  value?: number;
  label?: string;
  durationInFrames?: number;
}> = ({
  value = 70_000_000_000,
  label = "in debt",
  durationInFrames = 90,
}) => {
  return (
    <ChartCounter
      value={value}
      label={label}
      durationInFrames={durationInFrames}
    />
  );
};

const StatPillTestComposition: React.FC = () => {
  return (
    <StatPill
      value={70_000_000_000}
      label="in debt"
    />
  );
};

const QuoteAttributionTestComposition: React.FC = () => {
  return (
    <QuoteAttribution
      quote="The best way to predict the future is to invent it."
      attribution="Alan Kay"
    />
  );
};

const CompareSplitTestComposition: React.FC = () => {
  return (
    <CompareSplit
      left="$50M"
      right="$75M"
      leftLabel="Q1"
      rightLabel="Q2"
    />
  );
};

const LocationPulseTestComposition: React.FC = () => {
  return (
    <LocationPulse
      locationName="Cupertino, California"
      latitude={37.33}
      longitude={-122.03}
    />
  );
};

const ScrollytellingTestComposition: React.FC = () => {
  return (
    <Scrollytelling
      title="Why AI Chips Matter"
      body={
        "Chip supply is now a strategic asset, not a commodity. " +
        "Capital is following capacity, and capacity follows capital. " +
        "The chip itself is the new oil pipeline — and the producers hold the leverage."
      }
      emphasisWords={["strategic", "capital", "chip", "leverage"]}
    />
  );
};

const PlainTextTestComposition: React.FC<{ durationInFrames?: number }> = ({
  durationInFrames = 150,
}) => (
  <PlainText
    text={
      "The gamble works while AI chips are scarce, and the " +
      "bets are getting bigger. Every major cloud provider " +
      "now treats compute capacity as a strategic asset, and " +
      "the supply curve is no longer friendly."
    }
    emphasisWords={["scarce", "strategic"]}
    durationInFrames={durationInFrames}
  />
);

const TickerTapeTestComposition: React.FC = () => {
  return (
    <TickerTape
      stories={[
        "FED HOLDS RATES STEADY",
        "AI CHIP DEMAND SURGES",
        "TECH EARNINGS BEAT EXPECTATIONS",
      ]}
      label="BREAKING"
    />
  );
};

/* ------------------------------------------------------------------ */
/*  Horizon 2.4 — Emphasis cycle test compositions                     */
/*                                                                     */
/*  These four compositions exist so you can visual-QA the per-word  */
/*  emphasis cycle (Highlight → Circle → Underline) on the three      */
/*  components that got it in 2.4: VersusCard, BeforeAfter, and      */
/*  QuoteCard (with a long-quote variant to exercise all three cycle  */
/*  entries in one beat). Each one passes `emphasisWords` via the     */
/*  wrapped component's props (NOT via defaultProps on the            */
/*  <Composition>), so the prop is visible in Studio's props panel.  */
/* ------------------------------------------------------------------ */

const VersusCardTestComposition: React.FC = () => {
  return (
    <VersusCard
      left={{
        label: "Broadcom",
        value: "$70B debt",
        items: ["Chip design", "Software", "Infrastructure"],
      }}
      right={{
        label: "Nvidia",
        value: "$500B market cap",
        items: ["GPU monopoly", "CUDA lock-in", "Data center"],
      }}
      emphasisWords={["Broadcom", "Nvidia"]}
    />
  );
};

const BeforeAfterTestComposition: React.FC = () => {
  return (
    <BeforeAfter
      beforeLabel="Manual Chip Procurement"
      afterLabel="Automated Lease-Back Model"
      emphasisWords={["Manual", "Automated"]}
    />
  );
};

const QuoteCardTestComposition: React.FC = () => {
  return (
    <QuoteCard
      quote="The best way to predict the future is to invent it"
      attribution="Alan Kay"
      emphasisWords={["predict", "invent"]}
    />
  );
};

// Long-quote variant of the QuoteCard test — exercises 3 emphasis
// words in one cycle so you can see Highlight → Circle → Underline
// all fire in a single beat.
const QuoteCardLongTestComposition: React.FC = () => {
  return (
    <QuoteCard
      quote="People who are really serious about software should make their own hardware because the hardware defines what the software can do"
      attribution="Alan Kay"
      emphasisWords={["serious", "software", "hardware"]}
      durationInFrames={180}
    />
  );
};

/* ------------------------------------------------------------------ */
/*  The Signal Feed — logo preview compositions                        */
/*                                                                     */
/*  Two compositions so you can see the logo in the Studio sidebar:    */
/*                                                                     */
/*   1. SignalFeedLogoInContext — shows the logo at the exact size     */
/*      and position PersistentBackground mounts it (top-left, 80px    */
/*      tall) over a faint grid hint of the video background.         */
/*                                                                     */
/*   2. SignalFeedLogoAnimated — center-stage preview at 200px so      */
/*      you can scrub through the breath animation.                   */
/*                                                                     */
/*  The actual video uses the live component via PersistentBackground  */
/*  (no preview composition needed there — render MotionGraphicsVideo */
/*  to see it in context).                                            */
/* ------------------------------------------------------------------ */

const SignalFeedLogoInContext: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      {/* Faint grid so the contrast against the actual video background
          is visible during preview. */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        style={{ position: "absolute", top: 0, left: 0, opacity: 0.3 }}
      >
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#000" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Same size + position as PersistentBackground mounts it:
          180px tall, 720px wide, centered (left=180), top=80. */}
      <Logo top={80} left={180} height={180} opacity={1} />
    </AbsoluteFill>
  );
};

const SignalFeedLogoAnimated: React.FC = () => {
  return (
    <AbsoluteFill
      style={{ backgroundColor: "white" }}
    >
      {/* 4:1 aspect, fit to width 1080 → height 270. Centered
          vertically: top = (1920 - 270) / 2 = 825. */}
      <Logo top={825} left={0} height={270} opacity={1} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ */
/*  Phase 5 — SourceBadge test composition                            */
/*                                                                     */
/*  Renders the persistent top-right attribution pill on a white      */
/*  background, with the logo at 15% opacity as a ghost. This lets    */
/*  you visually verify the "doesn't obstruct the logo" requirement   */
/*  in Studio or via `npx remotion still SourceBadgeTest`.            */
/* ------------------------------------------------------------------ */

const SourceBadgeTestComposition: React.FC<{
  source?: string;
  sourceUrl?: string;
}> = ({
  source = "TechCrunch AI",
  sourceUrl = "https://techcrunch.com/2026/09/01/example-article/",
}) => (
  <AbsoluteFill style={{ backgroundColor: "white" }}>
    {/* Ghosted logo at 15% opacity so the badge's clearance to the
        logo is visually obvious without the actual wordmark competing. */}
    <Logo top={80} left={180} height={180} opacity={0.15} />
    <SourceBadge source={source} sourceUrl={sourceUrl} />
  </AbsoluteFill>
);

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
        defaultProps={{}}
      />
      <Composition
        id="KeyStatementTest"
        component={KeyStatementTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="ChartCounterTest"
        component={ChartCounterTestComposition}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          value: 70_000_000_000,
          label: "in debt",
          durationInFrames: 90,
        }}
      />
      <Composition
        id="StatPillTest"
        component={StatPillTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="QuoteAttributionTest"
        component={QuoteAttributionTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="CompareSplitTest"
        component={CompareSplitTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="LocationPulseTest"
        component={LocationPulseTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="ScrollytellingTest"
        component={ScrollytellingTestComposition}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="TickerTapeTest"
        component={TickerTapeTestComposition}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="PlainTextTest"
        component={PlainTextTestComposition}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ durationInFrames: 150 }}
      />
      {/* ---- Horizon 2.4 — emphasis cycle Test compositions ---- */}
      <Composition
        id="VersusCardTest"
        component={VersusCardTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BeforeAfterTest"
        component={BeforeAfterTestComposition}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="QuoteCardTest"
        component={QuoteCardTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="QuoteCardLongTest"
        component={QuoteCardLongTestComposition}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      {/* ---- The Signal Feed — logo preview compositions ---- */}
      <Composition
        id="SignalFeedLogoInContext"
        component={SignalFeedLogoInContext}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="SignalFeedLogoAnimated"
        component={SignalFeedLogoAnimated}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      {/* ---- Phase 5 — SourceBadge preview composition ---- */}
      <Composition
        id="SourceBadgeTest"
        component={SourceBadgeTestComposition}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          source: "TechCrunch AI",
          sourceUrl: "https://techcrunch.com/",
        }}
      />
    </>
  );
};
