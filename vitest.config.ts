import { defineConfig } from "vitest/config";

// Vitest config for the registry unit tests (Phase 2.2).
//
// We point at src/**/*.test.ts only. The test suite is the
// type-system-equivalent guard for the per-beat Zod schemas, not
// a render-equivalent guard. No jsdom, no React Testing Library,
// no visual regression: these are pure-data tests against the
// registry helpers (validateBeatMetadata, adaptMetadata,
// shouldShowKineticCaptions, etc.) in a `node` environment.
//
// We explicitly exclude public/ (runtime render data: beats.json,
// timestamps.json, narration.mp3, sfx-ambient.mp3) and out/
// (smoke-test artifacts: smoke.png, last-render.json) so Vitest
// never tries to walk them. node_modules/ and dist/ are excluded
// by default but we list them explicitly for clarity.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    exclude: [
      "node_modules/**",
      "out/**",
      "dist/**",
      "public/**",
    ],
  },
});
