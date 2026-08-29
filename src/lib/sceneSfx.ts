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
/*  Why dynamic import('fs') and import('path') inside the helper:    */
/*    Remotion's bundler is webpack-based and runs in a browser-like  */
/*    environment. Static `import { ... } from "fs"` at the top of    */
/*    this file would be pulled into the browser bundle, and webpack */
/*    would fail with `Module not found: Can't resolve 'fs'`.         */
/*                                                                     */
/*    Dynamic `await import("fs")` is invisible to webpack's static   */
/*    analysis, so it never tries to bundle `fs`. At runtime,         */
/*    `renderDataCalculateMetadata` runs server-side in Node, so the  */
/*    dynamic import resolves to the real Node `fs` and `path`        */
/*    modules and the file write succeeds.                             */
/*                                                                     */
/*    The cost of the dynamic import is one extra async hop per       */
/*    render (negligible — calculateMetadata already does a fetch     */
/*    per render). Node caches the import internally so the second    */
/*    render is just as fast.                                          */
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
 * Uses `await import("fs")` and `await import("path")` instead of
 * static top-level imports so the Remotion webpack bundler doesn't
 * try to bundle Node built-ins for the browser side. The dynamic
 * import resolves to the real Node modules at server-side runtime
 * (where `calculateMetadata` runs).
 */
export const writeAudioPlanLog = async (
  plan: AudioPlanLog,
  projectRoot: string,
): Promise<void> => {
  const [{ appendFileSync, mkdirSync, existsSync }, { join }] =
    await Promise.all([import("fs"), import("path")]);

  const outDir = join(projectRoot, "out");
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }
  const logPath = join(outDir, "audio-mounts.log");
  appendFileSync(logPath, JSON.stringify(plan) + "\n", "utf8");
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
