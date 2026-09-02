import { createContext, useContext } from "react";
import type { Word } from "./words";

/* ------------------------------------------------------------------ */
/*  Beat context (shared leaf)                                        */
/*                                                                     */
/*  This is the SINGLE SOURCE OF TRUTH for the beat context that       */
/*  <KineticCaptions> reads via useBeatContext().                      */
/*                                                                     */
/*  Why a leaf file (not MotionGraphicsVideo.tsx, not                 */
/*  audio/BeatKineticCaptions.tsx):                                    */
/*    CLAUDE.md §4.5 / §3.7 forbids cross-layer re-exports between    */
/*    orchestrator and the audio/ wrapper. The same pattern applies   */
/*    here: <KineticCaptions> lives in src/, <BeatKineticCaptions>     */
/*    lives in src/audio/, <MotionGraphicsVideo> lives in src/. If the */
/*    context is defined in any one of them, the others must import    */
/*    it, which creates a cycle or a TDZ-under-React-Refresh trap.     */
/*    A leaf file breaks the cycle.                                    */
/*                                                                     */
/*  Consumers:                                                         */
/*    - MotionGraphicsVideo.tsx → re-exports for back-compat          */
/*    - audio/BeatKineticCaptions.tsx → provides the context          */
/*    - KineticCaptions.tsx → reads the context                       */
/* ------------------------------------------------------------------ */

export type BeatContextValue = {
  currentBeatType: string | null;
  currentBeatText: string | null;
  /** Word list sliced to this beat's window, in GLOBAL seconds. */
  currentWords: Word[];
  /** Absolute frame at which this beat begins. */
  beatStartFrame: number | null;
  /** Beat duration in frames. */
  beatDurationInFrames: number | null;
};

export const defaultBeatContext: BeatContextValue = {
  currentBeatType: null,
  currentBeatText: null,
  currentWords: [],
  beatStartFrame: null,
  beatDurationInFrames: null,
};

export const BeatContext = createContext<BeatContextValue>(defaultBeatContext);

export const useBeatContext = (): BeatContextValue => useContext(BeatContext);
