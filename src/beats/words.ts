/**
 * Word-level timestamps produced by the Python pipeline
 * (WhisperX alignment in extract_word_timestamps.py).
 *
 * The orchestrator slices this list per-beat so KineticCaptions stays
 * synced to the current beat's narration window.
 */
export type Word = {
  word: string;
  start: number; // seconds
  end: number; // seconds
};
