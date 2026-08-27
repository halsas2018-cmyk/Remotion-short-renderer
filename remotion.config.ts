/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";
import { enableTailwind } from '@remotion/tailwind-v4';

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.overrideBundlerConfig(enableTailwind);
Config.setBrowserExecutable("/usr/bin/chromium");
Config.setChromiumOpenGlRenderer("swangle");
// Entry point is ./src/index.tsx (default) which calls registerRoot(RemotionRoot)
// RemotionRoot is defined in ./src/Root.tsx (separate file per best practice)
