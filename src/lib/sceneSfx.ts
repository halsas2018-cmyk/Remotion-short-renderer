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
/*  Render-time audio mount logger (Horizon 0.4 — 1.4)                 */
/*                                                                     */
/*  Every <Audio> in the render pipeline calls logAudioMount() once    */
/*  on mount with a one-line summary of the resolved URL, volume, and */
/*  frame range. This makes it trivial to correlate render output     */
/*  with frame ranges when debugging — search the render log for      */
/*  "[audio]" to see every stream the orchestrator mounted.           */
/*                                                                     */
/*  Volume is rendered as a fixed-point number (0..1) for static      */
/*  volumes, or as "0..N.NN (callback)" for callback volumes (ambient) */
/*  to make the difference obvious.                                    */
/*                                                                     */
/*  Frame ranges are half-open [from, to) so to = from + duration.    */
/* ------------------------------------------------------------------ */

export type AudioMountLog = {
  /** Stream label (narration, ambient, whoosh, click, …). */
  readonly label: string;
  /** Resolved URL or staticFile path. */
  readonly src: string;
  /** Static volume 0..1, or `null` if a callback was supplied. */
  readonly volume: number | null;
  /** Peak volume the callback reaches (0..1), or `null` for static. */
  readonly peakVolume?: number | null;
  /** Inclusive start frame (local to the parent <Sequence>). */
  readonly from: number;
  /** Duration in frames. */
  readonly durationInFrames: number;
  /** Optional per-mount context (beatIndex, wordIndex, etc.). */
  readonly meta?: Record<string, string | number>;
};

export const logAudioMount = (info: AudioMountLog): void => {
  const to = info.from + info.durationInFrames;
  const volumeStr =
    info.volume === null
      ? `0..${(info.peakVolume ?? 0).toFixed(2)} (callback)`
      : info.volume.toFixed(2);
  const metaStr = info.meta
    ? " " +
      Object.entries(info.meta)
        .map(([k, v]) => `${k}=${v}`)
        .join(" ")
    : "";
  // eslint-disable-next-line no-console
  console.log(
    `[audio] ${info.label.padEnd(8)} ` +
      `src=${info.src} ` +
      `volume=${volumeStr} ` +
      `frames=[${info.from}, ${to})${metaStr}`,
  );
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
