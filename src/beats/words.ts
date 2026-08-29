/* ------------------------------------------------------------------ */
/*  Word — runtime shape of a single WhisperX word-level timestamp.   */
/*                                                                     */
/*  Schema lives in `src/beats/types.ts::WordSchema`; this file owns  */
/*  the `Word` type alias and helpers that operate on arrays of      */
/*  words (dedupe, sort, etc.).                                       */
/* ------------------------------------------------------------------ */

export type Word = {
  /** The spoken word. */
  word: string;
  /** Start time in seconds (composition-global). */
  start: number;
  /** End time in seconds (composition-global). */
  end: number;
};

/* ------------------------------------------------------------------ */
/*  dedupeOverlappingWords                                            */
/*                                                                     */
/*  WhisperX sometimes emits:                                         */
/*    - Overlapping entries: word[i].end > word[i+1].end              */
/*    - Zero-duration entries: word[i].end === word[i].start           */
/*                                                                     */
/*  Both cause the kinetic-caption highlight to flicker / get stuck   */
/*  on the wrong word because `findIndex` finds two indices for the   */
/*  same local frame. This helper returns a clean, monotonic list.    */
/*                                                                     */
/*  Rules (applied in order):                                          */
/*    1. Drop words where `end <= start` (zero or negative duration). */
/*    2. If word[i+1].end <= word[i].end, drop word[i+1] (the later  */
/*       word is contained in — or extends no further than — the     */
/*       previous one).                                               */
/*                                                                     */
/*  Ties: when word[i+1].end === word[i].end, the LATER word is     */
/*  dropped. This matches what `KineticCaptions::findCurrentWordIndex`*/
/*  does anyway (it returns the FIRST matching word), so dropping the */
/*  later one is the no-op-safe choice.                               */
/*                                                                     */
/*  The function is PURE: it does not log. Callers should log how    */
/*  many words were dropped (see `Root.tsx`).                          */
/* ------------------------------------------------------------------ */

export const dedupeOverlappingWords = (
  words: readonly Word[],
): { words: Word[]; dropped: number } => {
  const cleaned: Word[] = [];
  let dropped = 0;

  for (const w of words) {
    // Rule 1: zero or negative duration — drop.
    if (w.end <= w.start) {
      dropped += 1;
      continue;
    }

    const prev = cleaned[cleaned.length - 1];
    if (prev) {
      // Rule 2: this word ends at or before the previous word's end —
      // it's a duplicate / contained entry. Drop it.
      if (w.end <= prev.end) {
        dropped += 1;
        continue;
      }
    }

    cleaned.push({ word: w.word, start: w.start, end: w.end });
  }

  return { words: cleaned, dropped };
};
