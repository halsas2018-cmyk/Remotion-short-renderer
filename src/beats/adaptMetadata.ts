/* ------------------------------------------------------------------ */
/*  Per-type metadata adapter                                         */
/*                                                                     */
/*  Lives in its own file (Phase 2.2 follow-up) so the registry      */
/*  barrel can re-export it without creating a circular import with   */
/*  `renderBeat.tsx`, which already imports from the registry.        */
/*                                                                     */
/*  Both `renderBeat.tsx` (orchestrator) and the registry barrel      */
/*  (test layer) import from this file. No cycle.                     */
/* ------------------------------------------------------------------ */

export const adaptMetadata = (
  type: string,
  beat: Record<string, unknown>,
): Record<string, unknown> => {
  switch (type) {
    case "versus": {
      const leftStr = typeof beat.left === "string" ? beat.left : "";
      const rightStr = typeof beat.right === "string" ? beat.right : "";
      return {
        ...beat,
        left: { label: leftStr, value: "", items: [] },
        right: { label: rightStr, value: "", items: [] },
      };
    }

    case "timeline": {
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
      const steps = Array.isArray(beat.steps)
        ? (beat.steps as unknown[]).map((s, i) => {
            const labelStr = typeof s === "string" ? s : "";
            return { marker: `${i + 1}`, label: labelStr };
          })
        : [];
      return { ...beat, events: steps };
    }

    default:
      return beat;
  }
};
