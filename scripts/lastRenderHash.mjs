// Last-render composition hash (Horizon 0.5).
//
// Pure ES module, no TypeScript, lives under `scripts/` (NOT `src/`)
// so Remotion's webpack bundler never sees it. The bundle input is
// rooted at `src/Root.tsx`; webpack only walks files reachable from
// there. Putting the helper in `src/lib/` was the original mistake —
// webpack discovered it via the directory walk even though no source
// file imported it, and then tried to resolve `node:fs` / `node:crypto`
// in a browser context, failing with "Module not found: Error: Can't
// resolve 'fs'".
//
// This file is only consumed by `scripts/render-smoke.sh` via:
//   node -e "import('./scripts/lastRenderHash.mjs').then(m => ...)"
// or a dynamic require equivalent. The bash script runs OUTSIDE the
// webpack bundle, so the Node-only `fs` / `crypto` / `path` imports
// here are fine.

// Bump this when the cache key definition changes. Old cache files
// (which don't contain this version) are invalidated on read.
export const LAST_RENDER_HASH_VERSION = 1;

const HASH_FILENAME = "last-render.json";

/**
 * Compute the SHA-256 hex digest of the canonical input pair.
 *
 * @param {string|Buffer} beatsJson  Raw bytes of `public/beats.json`.
 * @param {string|Buffer} wordsJson  Raw bytes of `public/timestamps.json`.
 * @returns {string} `<version>:<64-char hex>`
 */
export const computeLastRenderHash = (beatsJson, wordsJson) => {
  const h = crypto.createHash("sha256");
  h.update(beatsJson);
  h.update(0x0a); // LF separator, matches the bash `cat` invocation
  h.update(wordsJson);
  return `v${LAST_RENDER_HASH_VERSION}:${h.digest("hex")}`;
};

const isLastRenderRecord = (v) => {
  if (typeof v !== "object" || v === null) return false;
  return (
    typeof v.version === "number" &&
    typeof v.hash === "string" &&
    typeof v.renderedAt === "string"
  );
};

/**
 * Read the cached last-render record from `<outDir>/last-render.json`.
 * Returns `null` if the file is missing, unreadable, malformed, or
 * was written with a stale schema version.
 */
export const readLastRenderHash = (outDir) => {
  const file = path.resolve(outDir, HASH_FILENAME);
  if (!fs.existsSync(file)) return null;
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isLastRenderRecord(parsed)) return null;
  if (parsed.version !== LAST_RENDER_HASH_VERSION) return null;
  return parsed;
};

/**
 * Write the last-render record. Creates `<outDir>/` if it doesn't
 * exist. Throws on I/O failure.
 */
export const writeLastRenderHash = (outDir, hash, extras = {}) => {
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.resolve(outDir, HASH_FILENAME);
  const record = {
    version: LAST_RENDER_HASH_VERSION,
    hash,
    renderedAt: new Date().toISOString(),
    ...(extras.durationInFrames !== undefined
      ? { durationInFrames: extras.durationInFrames }
      : {}),
    ...(extras.storyId !== undefined ? { storyId: extras.storyId } : {}),
  };
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n", "utf8");
};

/** Resolve `<projectRoot>/out/last-render.json`. */
export const defaultLastRenderFile = (projectRoot) =>
  path.join(projectRoot, "out", HASH_FILENAME);
