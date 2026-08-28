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
  beat: Beat & { text: string };
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
  // 0) Per-type metadata adapter. The Python pipeline emits
  //    a *minimal* shape (e.g. `left: "..."` for versus) but the
  //    existing components expect a *rich* shape (`left: {label, value, items}`).
  //    We expand the minimal shape into the rich shape here so the
  //    components don't need to know about the Python output format.
  const adaptedMetadata = adaptMetadata(beat.type, beat.metadata, beat.text);

  // 1) Validate the metadata against the Zod schema for this beat type.
  let validatedMetadata: Record<string, unknown>;
  try {
    validatedMetadata = validateBeatMetadata(
      beat.type,
      adaptedMetadata,
    ) as Record<string, unknown>;
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

  // 2) Look up the component for this beat type.
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

  // 3) Slice the word list to the window this beat narrates.
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
          {...validatedMetadata}
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
 * Adapts the minimal Python pipeline shape into the rich shape the
 * existing components expect, and merges top-level `text` into the
 * metadata for any text-driven component.
 *
 * If a future beat type needs custom mapping, add a case here.
 */
const adaptMetadata = (
  type: string,
  rawMetadata: Record<string, unknown>,
  topLevelText: string,
): Record<string, unknown> => {
  // Always make `text` available to the component.
  const base: Record<string, unknown> = { ...rawMetadata, text: topLevelText };

  switch (type) {
    case "versus": {
      // beats.json: {left: "string", right: "string"}
      // VersusCard expects: {left: {label, value, items}, right: {label, value, items}}
      const leftStr = typeof rawMetadata.left === "string" ? rawMetadata.left : "";
      const rightStr = typeof rawMetadata.right === "string" ? rawMetadata.right : "";
      return {
        ...base,
        left: { label: leftStr, value: "", items: [] },
        right: { label: rightStr, value: "", items: [] },
      };
    }

    case "timeline": {
      // beats.json: {events: ["a", "b", "c"]} (strings)
      // Timeline expects: {events: [{marker, label}]}
      const events = Array.isArray(rawMetadata.events)
        ? (rawMetadata.events as unknown[]).map((e, i) => {
            if (typeof e === "string") {
              return { marker: `Step ${i + 1}`, label: e };
            }
            return e;
          })
        : [];
      return { ...base, events };
    }

    case "process_flow": {
      // beats.json: {steps: ["a", "b"]} (strings)
      // Timeline (fallback) expects: {events: [{marker, label}]}
      const steps = Array.isArray(rawMetadata.steps)
        ? (rawMetadata.steps as unknown[]).map((s, i) => {
            const labelStr = typeof s === "string" ? s : "";
            return { marker: `${i + 1}`, label: labelStr };
          })
        : [];
      return { ...base, events: steps };
    }

    case "before_after": {
      // beats.json: {beforeLabel, afterLabel}
      // BeforeAfter props need to be confirmed; pass through plus `text`.
      return base;
    }

    case "map_location":
    case "map_3d": {
      // beats.json: {locationName, latitude, longitude, buildings?}
      // Pass through; no extra shaping.
      return base;
    }

    case "icon_text": {
      // beats.json: {icon, text}
      // text is already merged above.
      return base;
    }

    default:
      return base;
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
