import React from "react";
import { KineticCaptions } from "../KineticCaptions";
import type { Word } from "../beats/words";

/**
 * Per-beat wrapper around the existing <KineticCaptions> component.
 *
 * The original <KineticCaptions> takes a `captionEnabledTypes` set,
 * a `beats` array, and a `words` array (all words). For the orchestrator
 * we already pre-slice the words to the current beat's window, so we
 * can short-circuit: pass an empty beats array and a `Set([beatType])`
 * with just the current beat's type enabled.
 *
 * This avoids changing the KineticCaptions contract until you decide
 * to refactor it.
 */
type BeatKineticCaptionsProps = {
  text: string;
  words: Word[];
  durationInFrames: number;
  beatType: string;
};

export const BeatKineticCaptions: React.FC<BeatKineticCaptionsProps> = ({
  words,
  beatType,
}) => {
  return (
    <KineticCaptions
      captionEnabledTypes={new Set([beatType])}
      beats={[]}
      words={words}
    />
  );
};
