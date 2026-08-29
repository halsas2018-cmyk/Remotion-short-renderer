import React, { useEffect, useRef } from "react";
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
/*    render — both stdout and stderr were empty of [audio] lines,   */
/*    even though the component tree had been mounted. The reason:   */
/*    Remotion's <Audio> onMount is a time-driven lifecycle hook that */
/*    fires when the audio's local timeline starts advancing, and a   */
/*    `still` (single-frame) render never advances time. The audio    */
/*    element is still part of the React tree, but its mount         */
/*    lifecycle is optimized away.                                   */
/*                                                                     */
/*    The fix: log inside a normal React `useEffect(..., [])`. That   */
/*    fires during the initial mount of the React component, which   */
/*    DOES happen during a `still` render (Remotion has to mount the */
/*    tree to render it). We render this component as a sibling of   */
/*    each <Audio> so it shares the parent context (e.g. a per-beat  */
/*    <Sequence> with its own local frame counter).                  */
/*                                                                     */
/*  Why we use a useRef guard inside useEffect:                       */
/*    React 18 strict mode invokes effects twice in development.     */
/*    The guard ensures we only log once per mount even in strict    */
/*    mode. (In production it's a no-op since strict mode is off.)  */
/*                                                                     */
/*  This component renders nothing — it's a pure logging side effect.*/
/* ------------------------------------------------------------------ */

type AudioMountLogProps = AudioMountLog;

export const AudioMountLog: React.FC<AudioMountLogProps> = (info) => {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) return;
    logged.current = true;
    logAudioMount(info);
    // We intentionally only run on mount; `info` is captured in the
    // closure at first render and shouldn't be re-logged if the
    // parent re-renders with different props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};
