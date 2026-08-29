  // Audio plan log (Horizon 0.4 / 1.4).
  // Write the resolved audio plan to out/audio-mounts.log so the
  // smoke test (and any future CI / dashboard) can verify the
  // orchestrator's audio layout without having to mount the React
  // tree. This is the ONLY mount-time observability we get because
  // a `still` render never commits the React component tree — see
  // src/lib/sceneSfx.ts for the full reasoning.
  //
  // We resolve the project root from process.cwd() (the directory
  // the user invoked `npx remotion` from, which is the project
  // root by convention).
  //
  // writeAudioPlanLog uses (0, eval)("require") under the hood to
  // load Node's fs + path modules at runtime. The eval boundary
  // hides the module names from webpack's static analyzer so the
  // browser bundle never tries to resolve "fs" or "path" (which
  // would fail with `Module not found: Can't resolve 'fs'`). The
  // function is synchronous and returns a boolean indicating
  // whether the file was actually written (false in non-Node
  // environments).
  try {
    writeAudioPlanLog(
      {
        beatsCount: data.beats.beats.length,
        wordsCount: data.words.length,
        narration: `public/${data.narrationSrc}`,
        ambient: `public/sfx-ambient.mp3`,
        whooshCount: data.whooshSlots.length,
        clickCount: data.clickCount,
        whooshSlots: data.whooshSlots,
      },
      process.cwd(),
    );
  } catch (err) {
    // Don't fail the render if the log write fails — the audio plan
    // log is observability, not correctness. But emit a warning so
    // the user knows.
    // eslint-disable-next-line no-console
    console.warn(
      `[MotionGraphicsVideo] failed to write audio plan log: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
