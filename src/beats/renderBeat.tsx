import React from "react";
import { Sequence } from "remotion";
import { Beat } from "./types";
import { SceneTransition } from "../SceneTransition";
import { PersistentBackground } from "../PersistentBackground";
import { BeatKineticCaptions } from "../audio/BeatKineticCaptions";
import {
  getBeatComponent,
  validateBeatMetadata,
  isBeatTypeSupported,
} from "./registry";
import type { Word } from "./words";

/**
 * Render a single beat as a hard-coded <Sequence>.
 *
 * Per Remotion best practices, each beat is its own authored JSX node
 * (not generated via .map()) so its `from` and `durationInFrames` are
 * editable in Studio.
 *
 * Each beat's <Sequence> contains:
 *   - <PersistentBackground />               (behind the content)
 *   - <SceneTransition>                       (entrance/exit wrapper)
 *     -> <BeatComponent {...adaptedProps} />  (the typed component)
 *   - <BeatKineticCaptions />                 (per-beat word-sync overlay)
 */
type RenderBeatProps = {
  beat: Beat;
  allWords: Word[];
  beatIndex: number;
  fps: number;
};

export const RenderBeat: React.FC<RenderBeatProps> = ({
  beat,
  allWords,
  beatIndex,
  fps,
}) => {
  // 1) Validate the WHOLE beat (top-level fields) against the Zod schema
  //    for this beat type. The Python pipeline puts per-type props at
  //    the top level — not inside a `metadata` field.
  let validatedBeat: Record<string, unknown>;
  try {
    validatedBeat = validateBeatMetadata(beat.type, beat) as Record<
      string,
      unknown
    >;
  } catch (err) {
    return (
      <Sequence
        key={`beat-${beatIndex}`}
        from={beat.startFrame}
        durationInFrames={beat.durationInFrames}
        name={`Beat ${beatIndex} (invalid)`}
        layout="absolute-fill"
      >
        <PersistentBackground />
        <SceneTransition>
          <InvalidBeatMessage
            beatType={beat.type}
            text={beat.text}
            error={err instanceof Error ? err.message : String(err)}
          />
        </SceneTransition>
      </Sequence>
    );
  }

  // 2) Adapt the top-level Python shape into the rich shape the
  //    existing components expect (e.g. `left: "..."` → `left: {label: "..."}`).
  const adaptedProps = adaptMetadata(beat.type, validatedBeat);

  // 3) Look up the component for this beat type.
  const BeatComponent = getBeatComponent(beat.type);

  if (!BeatComponent || !isBeatTypeSupported(beat.type)) {
    return (
      <Sequence
        key={`beat-${beatIndex}`}
        from={beat.startFrame}
        durationInFrames={beat.durationInFrames}
        name={`Beat ${beatIndex} (unsupported)`}
        layout="absolute-fill"
      >
        <PersistentBackground />
        <SceneTransition>
          <UnsupportedBeatMessage beatType={beat.type} text={beat.text} />
        </SceneTransition>
      </Sequence>
    );
  }

  // 4) Slice the word list to the window this beat narrates.
  const startSec = beat.startFrame / fps;
  const endSec = (beat.startFrame + beat.durationInFrames) / fps;
  const beatWords = allWords.filter(
    (w) => w.start >= startSec - 0.001 && w.start < endSec,
  );

  return (
    <Sequence
      key={`beat-${beatIndex}`}
      from={beat.startFrame}
      durationInFrames={beat.durationInFrames}
      name={`Beat ${beatIndex}: ${beat.type}`}
      layout="absolute-fill"
    >
      <PersistentBackground />

      <SceneTransition>
        <BeatComponent
          {...adaptedProps}
          durationInFrames={beat.durationInFrames}
        />
      </SceneTransition>

      <BeatKineticCaptions
        text={beat.text}
        words={beatWords}
        durationInFrames={beat.durationInFrames}
        beatType={beat.type}
      />
    </Sequence>
  );
};

/* ------------------------------------------------------------------ */
/*  Per-type metadata adapter                                         */
/* ------------------------------------------------------------------ */

/**
 * Adapts the top-level Python pipeline shape into the rich shape the
 * existing components expect.
 *
 * The Python pipeline emits flat fields at the top level of each beat:
 *   - versus: {left: "string", right: "string"}
 *   - timeline: {events: ["a", "b", "c"]}
 *   - process_flow: {steps: ["a", "b"]}
 *
 * The existing components expect rich objects:
 *   - VersusCard: {left: {label, value, items}, right: {...}}
 *   - Timeline: {events: [{marker, label}]}
 *
 * This function converts the flat shape into the rich shape.
 */
const adaptMetadata = (
  type: string,
  beat: Record<string, unknown>,
): Record<string, unknown> => {
  switch (type) {
    case "versus": {
      // Python: {left: "string", right: "string"}
      // VersusCard expects: {left: {label, value, items}, right: {label, value, items}}
      const leftStr = typeof beat.left === "string" ? beat.left : "";
      const rightStr = typeof beat.right === "string" ? beat.right : "";
      return {
        ...beat,
        left: { label: leftStr, value: "", items: [] },
        right: { label: rightStr, value: "", items: [] },
      };
    }

    case "timeline": {
      // Python: {events: ["a", "b", "c"]} (strings)
      // Timeline expects: {events: [{marker, label}]}
      const events = Array.isArray(beat.events)
        ? (beat.events as unknown[]).map((e, i) => {
            if (typeof e === "string") {
              return { marker: `Step ${i + 1}`, label: e };
            }
            return e;
          })
        : [];
      return { ...beat, events };
    }

    case "process_flow": {
      // Python: {steps: ["a", "b"]} (strings)
      // Timeline (fallback) expects: {events: [{marker, label}]}
      const steps = Array.isArray(beat.steps)
        ? (beat.steps as unknown[]).map((s, i) => {
            const labelStr = typeof s === "string" ? s : "";
            return { marker: `${i + 1}`, label: labelStr };
          })
        : [];
      return { ...beat, events: steps };
    }

    default:
      // All other beat types pass through unchanged.
      return beat;
  }
};

/* ------------------------------------------------------------------ */
/*  Inline fallback messages for bad / missing beat data              */
/* ------------------------------------------------------------------ */

const InvalidBeatMessage: React.FC<{
  beatType: string;
  text: string;
  error: string;
}> = ({ beatType, text, error }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#fee",
      color: "#900",
      padding: 48,
      textAlign: "center",
      fontFamily: "sans-serif",
    }}
  >
    <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 16 }}>
      Invalid metadata for "{beatType}"
    </div>
    <div style={{ fontSize: 18, fontStyle: "italic", marginBottom: 12 }}>
      {text}
    </div>
    <div style={{ fontSize: 16, opacity: 0.8 }}>{error}</div>
  </div>
);

const UnsupportedBeatMessage: React.FC<{
  beatType: string;
  text: string;
}> = ({ beatType, text }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#eef",
      color: "#003",
      padding: 48,
      textAlign: "center",
      fontFamily: "sans-serif",
    }}
  >
    <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
      No component registered for "{beatType}"
    </div>
    <div style={{ fontSize: 20, fontStyle: "italic" }}>{text}</div>
  </div>
);
