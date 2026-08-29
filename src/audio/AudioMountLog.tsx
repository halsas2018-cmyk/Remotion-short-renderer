import React, { useRef } from "react";
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
/*    The second attempt: log inside `useEffect(..., [])`. The smoke  */
/*    test revealed `useEffect` ALSO does not fire during a `still`  */
/*    render. Both stdout and stderr were still empty.                */
/*                                                                     */
/*    The third attempt: log inside a `useState` initializer. The     */
/*    smoke test revealed `useState` initializers ALSO do not fire    */
/*    during a `still` render. Both stdout and stderr were still      */
/*    empty.                                                          */
/*                                                                     */
/*    The fourth attempt (this one): log directly inside the function */
/*    body, gated by a `useRef` flag. `useRef` is different from      */
/*    `useState` and `useEffect` — it doesn't have a "callback that   */
/*    runs at a specific time in the lifecycle". Instead,             */
/*    `useRef(initialValue)` synchronously returns                    */
/*    `{current: initialValue}` during the render. There's no        */
/*    deferred callback, no post-render effect, no initializer        */
/*    function. Just a plain object created and returned in the       */
/*    middle of the function body.                                    */
/*                                                                     */
/*    The `useRef` guard ensures we only log ONCE per mount instance. */
/*    On re-renders (e.g. every frame in a normal video render), the  */
/*    ref's `.current` is already `true`, so the `if` branch is       */
/*    skipped. On a new mount, a fresh `useRef` is created with       */
/*    `.current = false`, so the log fires again.                     */
/*                                                                     */
/*    If THIS doesn't work, then the function body itself is not      */
/*    being called during a `still` render, which would mean the     */
/*    entire approach needs to change (e.g. log from the parent      */
/*    before mounting, or write to a file instead of console.log).   */
/*                                                                     */
/*  This component renders nothing — it's a pure logging side effect.*/
/* ------------------------------------------------------------------ */

type AudioMountLogProps = AudioMountLog;

export const AudioMountLog: React.FC<AudioMountLogProps> = (info) => {
  // useRef synchronously returns {current: false} during the render.
  // No deferred callback, no post-render effect, no initializer
  // function — just a plain object created in the function body.
  const logged = useRef(false);

  // Log exactly once per mount instance. On re-renders, logged.current
  // is already true and this branch is skipped. On a new mount, a
  // fresh useRef is created with .current = false, so the log fires.
  if (!logged.current) {
    logged.current = true;
    logAudioMount(info);
  }

  return null;
};
