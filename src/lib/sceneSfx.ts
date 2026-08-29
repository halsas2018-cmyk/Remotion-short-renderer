/**
 * Sound effect URLs and defaults used by the orchestrator and the
 * per-beat caption wrapper.
 *
 * The whoosh is a free SFX from the Remotion CDN
 * (https://remotion.media/whoosh.wav), as listed in the project's
 * `.agents/skills/remotion-markup/sfx.md` skill. It plays at the
 * start of every <TransitionSeries.Transition> as a UI feedback
 * sound for the cross-fade.
 *
 * The mouse-click is a short SFX from the same CDN
 * (https://remotion.media/mouse-click.wav). It plays at the start of
 * every visible caption word inside <BeatKineticCaptions> to give the
 * typing a tactile, mechanical feel.
 *
 * The ambient track is a local file in /public (sfx-ambient.mp3) that
 * loops for the entire composition underneath the narration. Volume
 * fades in over the first second and then sits at AMBIENT_SFX_VOLUME
 * (0.15) so it doesn't compete with the narration, the whoosh, or the
 * typing clicks. Per `.agents/skills/remotion-markup/audio.md` best
 * practices for ambient sound: use `loop` + `loopVolumeCurveBehavior=
 * "extend"` so the volume callback sees a continuously incrementing
 * frame count across loops.
 *
 * Centralized here so the URLs and volumes can be tweaked in one
 * place and reused if other parts of the project ever need
 * transition / typing / ambient sounds.
 */

/* ------------------------------------------------------------------ */
/*  Render-time audio plan logger (Horizon 0.4 — 1.4)                 */
/*                                                                     */
/*  Why we log to a file, not console.log:                            */
/*    We tried every React mount hook to emit a per-stream [audio]    */
/*    log line on mount:                                               */
/*      1. onMount on <Audio>          — time-driven, doesn't fire     */
/*                                        during a `still` render      */
/*      2. useEffect(..., []) in a      — post-render, doesn't fire    */
/*         sibling <AudioMountLog>       during a `still` render      */
/*      3. useState(() => ...)          — initializer, doesn't fire    */
/*         initializer                   during a `still` render      */
/*      4. useRef(false) + function      — doesn't fire either         */
/*         body log                       (the React tree is NEVER    */
/*                                        mounted during `still`,     */
/*                                        only the render function    */
/*                                        is called)                  */
/*                                                                     */
/*    The smoke test (`scripts/render-smoke.sh`) is a `still` render.  */
/*    So the only way to emit observability for it is from somewhere  */
/*    OUTSIDE the React tree, BEFORE the orchestrator mounts.         */
/*    `Root.tsx::renderDataCalculateMetadata` is the perfect place:    */
/*    it runs once per render, has access to the parsed beats.json    */
/*    and timestamps.json, and computes the audio plan (whoosh slots, */
/*    click slots) as a byproduct of the data fetch.                  */
/*                                                                     */
/*  Format:                                                           */
/*    One JSON line per render. Contains:                              */
/*      - beatsCount, wordsCount                                       */
/*      - narration (the resolved public/narration.mp3)                 */
/*      - ambient (the resolved public/sfx-ambient.mp3)                 */
/*      - whooshCount (number of cross-fade whoosh <Audio>s)            */
/*      - clickCount (number of per-word click <Audio>s)                */
/*      - whooshSlots: list of { from, to, beatIndex } for each         */
/*        whoosh that will be mounted (proves the math is right)        */
/*                                                                     */
/*  The log file lives at `${projectRoot}/out/audio-mounts.log`.       */
/*  It is APPENDED across renders so you can see the history of what   */
/*  was rendered. The smoke test truncates it before each run so the   */
/*  assertion only sees the current render.                            */
/*                                                                     */
/*  Why `(0, eval)("require")` instead of `await import("fs")`:       */
/*    Remotion's webpack bundler parses every module looking for       */
/*    `import` and `require` calls. Even `await import("fs")` is      */
/*    statically resolved by webpack 4/5 — it sees the literal        */
/*    string "fs" in the source and tries to bundle the Node          */
/*    built-in, which fails with `Module not found: Can't resolve     */
/*    'fs'`. We learned this the hard way: the first dynamic-import   */
/*    attempt still produced the same bundler error.                   */
/*                                                                     */
/*    The `(0, eval)("require")("fs")` idiom hides the module name    */
/*    inside an `eval` call. Webpack's static analyzer can't see      */
/*    inside `eval` (it short-circuits at the eval boundary), so it   */
/*    never tries to resolve "fs" or "path" for the browser bundle.   */
/*    At runtime, `eval("require")` returns the real CommonJS         */
/*    `require` function, which Node uses to load "fs" and "path"     */
/*    from its built-in module cache. The bundle stays browser-       */
/*    safe; the file write only happens server-side (where           */
/*    `calculateMetadata` runs).                                      */
/*                                                                     */
/*    This is the same pattern Remotion itself uses internally for   */
/*    server-only helpers like `getVideoDuration` / `getAudioDuration`*/
/*    in `@remotion/media-utils`. See the project documentation:      */
/*    https://remotion.dev/docs/webpack#override-the-webpack-config   */
/*    and the discussion of "server-only" modules.                    */
/* ------------------------------------------------------------------ */

export type WhooshSlot = {
  /** Global frame the whoosh starts (inclusive). */
  from: number;
  /** Global frame the whoosh ends (exclusive). */
  to: number;
  /** Index of the OUTGOING beat in the beats[] array. */
  beatIndex: number;
};

export type AudioPlanLog = {
  /** Beat count from beats.json. */
  beatsCount: number;
  /** Word count from timestamps.json (after dedupe in 1.3). */
  wordsCount: number;
  /** Resolved public/ path to the narration audio. */
  narration: string;
  /** Resolved public/ path to the ambient SFX. */
  ambient: string;
  /** Number of cross-fade whoosh <Audio>s the orchestrator will mount. */
  whooshCount: number;
  /** Number of per-word click <Audio>s the orchestrator will mount. */
  clickCount: number;
  /** Per-whoosh global frame range and outgoing-beat index. */
  whooshSlots: WhooshSlot[];
};

/**
 * Append one JSON line describing the audio plan for a render to
 * `${projectRoot}/out/audio-mounts.log`. Idempotent: creates the
 * `out/` directory and the log file if they don't exist.
 *
 * Called from `Root.tsx::renderDataCalculateMetadata` after the
 * JSONs have been parsed and deduped but BEFORE the orchestrator
 * mounts, so the log is written even during a `still` (single-frame)
 * render.
 *
 * Uses `(0, eval)("require")("fs")` and `(0, eval)("require")("path")`
 * to load the Node built-ins via CommonJS at runtime. The `eval`
 * boundary hides the module names from webpack's static analyzer so
 * the browser bundle never tries to resolve "fs" or "path" (which
 * would fail with `Module not found: Can't resolve 'fs'`). At
 * runtime in Node, `eval("require")` returns the real CommonJS
 * `require` and the file write succeeds.
 *
 * NOOPs gracefully on non-Node environments (e.g. if the same bundle
 * somehow gets executed in a browser despite the eval trick). Returns
 * `false` in that case so the caller can decide whether to warn.
 */
export const writeAudioPlanLog = (
  plan: AudioPlanLog,
  projectRoot: string,
): boolean => {
  // Bail early if we are not running in Node. `process` exists in Node
  // and in the browser when a bundler polyfills it; the safer check is
  // `typeof require !== "undefined"`. If require is unavailable, the
  // file write is a no-op (the orchestrator still works, the log just
  // doesn't get written).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeRequire: ((id: string) => any) | undefined =
    typeof require !== "undefined" ? (0, eval)("require") : undefined;
  if (!nodeRequire) return false;

  const fs = nodeRequire("fs") as typeof import("fs");
  const path = nodeRequire("path") as typeof import("path");

  const outDir = path.join(projectRoot, "out");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const logPath = path.join(outDir, "audio-mounts.log");
  fs.appendFileSync(logPath, JSON.stringify(plan) + "\n", "utf8");
  return true;
};

export const TRANSITION_SFX_URL = "https://remotion.media/whoosh.wav";

/** Volume of the transition SFX (0..1). 0.5 = comfortable default. */
export const TRANSITION_SFX_VOLUME = 0.5;

export const TYPING_SFX_URL = "https://remotion.media/mouse-click.wav";

/** Volume of the typing-click SFX (0..1). 0.15 = quiet; doesn't fight the narration. */
export const TYPING_SFX_VOLUME = 0.15;

/**
 * Ambient SFX — local file in /public. Looped under the narration.
 * Volume is a callback that fades in over the first second and then
 * holds at AMBIENT_SFX_VOLUME so the ambience is felt but not heard
 * loudly.
 */
export const AMBIENT_SFX_URL = "sfx-ambient.mp3";

/**
 * Steady-state ambient volume (0..1). 0.15 = quiet bed under the
 * narration, whoosh, and typing clicks. Per audio.md best practices.
 */
export const AMBIENT_SFX_VOLUME = 0.15;

/**
 * Frames over which the ambient SFX fades in from 0 to
 * AMBIENT_SFX_VOLUME. At 30 fps, 30 frames = 1 second.
 */
export const AMBIENT_SFX_FADE_IN_FRAMES = 30;

/**
 * Duration of a single typing-click <Sequence>. 4 frames (~133ms at
 * 30fps) is the smallest stable window for mediabunny's MP4 muxer —
 * 1-frame variants throw `Cannot write to a closing writable stream`
 * during chunk flush. Used by BeatKineticCaptions to size each
 * per-word click.
 */
export const TYPING_CLICK_HOLD_FRAMES = 4;
