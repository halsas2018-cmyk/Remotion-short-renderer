import React, { useRef, useState } from "react";
import { logAudioMount, type AudioMountLog } from "../lib/sceneSfx";

/* ------------------------------------------------------------------ */
/*  AudioMountLog                                                     */
/*                                                                     */
/*  Render-time audio mount logger (Horizon 0.4 — 1.4).               */
/*                                                                     */
/*  Why this is a separate component (not just `onMount` on <Audio>): */
/*    We initially wired `onMount={() => logAudioMount(...)}` directly */
/*    on each <Audio> element. The smoke test (`scripts/render-smoke  */
/*    .sh`) revealed that `onMount` does NOT fire during a `still`    */
/*    render — both stdout and stderr were empty of [audio] lines,    */
/*    even though the component tree had been mounted. The reason:    */
/*    Remotion's <Audio> onMount is a time-driven lifecycle hook that */
/*    fires when the audio's local timeline starts advancing, and a   */
/*    `still` (single-frame) render never advances time. The audio    */
/*    element is still part of the React tree, but its mount          */
/*    lifecycle is optimized away.                                    */
/*                                                                     */
/*    The first fix: log inside `useEffect(..., [])`. The smoke test  */
/*    revealed that `useEffect` ALSO does not fire during a `still`  */
/*    render — both stdout and stderr were still empty. This suggests */
/*    the React tree is being rendered without going through the      */
/*    full mount lifecycle in `still` mode (probably a render-only    */
/*    code path that reads `useCurrentFrame()` without committing     */
/*    to a real mount).                                               */
/*                                                                     */
/*    The second fix: log inside a `useState` initializer.            */
/*    `useState(() => ...)` runs the initializer the first time the   */
/*    component renders, BEFORE the first effect. It DOES run during */
/*    a `still` render because React always needs to compute initial  */
/*    state to render the component at all. The useRef guard ensures  */
/*    we only log once per actual mount instance (not once per         */
/*    re-render, which would log on every frame).                     */
/*                                                                     */
/*  Why we use a useRef guard (not just useState):                    */
/*    In a normal video render, the component re-renders on every    */
/*    frame (frame 0, 1, 2, ...). If we logged inside the render body */
/*    or the useMemo, we'd log once per frame. The useRef guard      */
/*    ensures we log exactly once per mount instance.                 */
/*                                                                     */
/*  Strict mode note:                                                 */
/*    React 18 strict mode invokes initializers twice in development  */
/*    (once for the first mount, once for the strict-mode re-mount).  */
/*    The useRef ref is reset on re-mount, so we'd log twice in dev. */
/*    That's acceptable for a diagnostic log line and easier than     */
/*    threading a module-level Set through here.                      */
/*                                                                     */
/*  This component renders nothing — it's a pure logging side effect.*/
/* ------------------------------------------------------------------ */

type AudioMountLogProps = AudioMountLog;

export const AudioMountLog: React.FC<AudioMountLogProps> = (info) => {
  // Per-instance guard: only log once per mount, not on every re-render.
  const logged = useRef(false);

  // useState initializer runs on the first render, BEFORE any
  // useEffect would. This is the earliest possible point in React's
  // lifecycle to run a side effect during a `still` render.
  useState(() => {
    if (logged.current) return null;
    logged.current = true;
    logAudioMount(info);
    return null;
  });

  return null;
};
