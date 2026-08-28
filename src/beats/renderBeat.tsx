import React from "react";
import { Sequence } from "remotion";
import { Beat } from "./types";
import { SceneTransition } from "./SceneTransition";
import { KineticCaptions } from "./KineticCaptions";
import { PersistentBackground } from "./PersistentBackground";
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
 *   - <PersistentBackground />          (rendered inside the sequence so
 *                                         it composes correctly with z-order)
 *   - <SceneTransition>                  (entrance/exit wrapper)
 *     -> <BeatComponent {...metadata} /> (the typed component from the registry)
 *   - <KineticCaptions />                (overlaid on top, syncs to the
 *                                         current beat's word window)
 */
type RenderBeatProps = {
  beat: Beat;
  text: string;
  allWords: Word[];
  beatIndex: number;
  fps: number;
};

export const RenderBeat: React.FC<RenderBeatProps> = ({
  beat,
  text,
  allWords,
  beatIndex,
  fps,
}) => {
  // 1) Validate the metadata against the Zod schema for this beat type.
  //    Throws a clear error if the Python pipeline emitted something invalid.
  let validatedMetadata: Record<string, unknown>;
  try {
    validatedMetadata = validateBeatMetadata(beat.type, beat.metadata) as Record<
      string,
      unknown
    >;
  } catch (err) {
    // Don't crash the whole render — surface the problem in the Studio timeline.
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
          <UnsupportedBeatMessage beatType={beat.type} text={text} />
        </SceneTransition>
      </Sequence>
    );
  }

  // 3) Slice the word list to the window that this beat narrates.
  //    The Python pipeline sets startFrame/endFrame in word-time, so we
  //    convert frame -> seconds (frame / fps) and filter.
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
          // Top-level narration text wins for any caption overlay.
          text={text}
          durationInFrames={beat.durationInFrames}
        />
      </SceneTransition>

      <KineticCaptions
        text={text}
        words={beatWords}
        durationInFrames={beat.durationInFrames}
      />
    </Sequence>
  );
};

/* ------------------------------------------------------------------ */
/*  Inline fallback messages for bad / missing beat data              */
/* ------------------------------------------------------------------ */

const InvalidBeatMessage: React.FC<{ beatType: string; error: string }> = ({
  beatType,
  error,
}) => (
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
    <div style={{ fontSize: 18, opacity: 0.8 }}>{error}</div>
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
