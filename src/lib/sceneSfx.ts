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
 * Centralized here so the URLs and volumes can be tweaked in one
 * place and reused if other parts of the project ever need
 * transition / typing sounds.
 */
export const TRANSITION_SFX_URL = "https://remotion.media/whoosh.wav";

/** Volume of the transition SFX (0..1). 0.5 = comfortable default. */
export const TRANSITION_SFX_VOLUME = 0.5;

export const TYPING_SFX_URL = "https://remotion.media/mouse-click.wav";

/** Volume of the typing-click SFX (0..1). 0.15 = quiet; doesn't fight the narration. */
export const TYPING_SFX_VOLUME = 0.15;
