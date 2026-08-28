import { Config } from "@remotion/cli/config";

/**
 * Use ANGLE software WebGL for headless rendering.
 *
 * Without a GPU on this machine, Chromium's default headless WebGL2
 * backend can't create a context within Remotion's 28s `delayRender`
 * window, causing <ThreeCanvas> to time out during full video renders.
 *
 * Setting `ChromiumOpenGlRenderer = "angle"` enables the SwiftShader
 * software WebGL implementation, which is slow but works on any CPU.
 *
 * If you ever run this on a machine with a real GPU, change this to
 * `"desktop"` (or remove the call entirely) for much faster renders.
 */
Config.setChromiumOpenGlRenderer("angle");
