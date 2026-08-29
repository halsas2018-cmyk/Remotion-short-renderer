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
 * Canonical input = `public/beats.json` bytes || `public/timestamps.json` bytes,
 * concatenated with NO separator. This matches what the bash side of
 * `scripts/render-smoke.sh` does via `cat beats.json timestamps.json |
 * sha256sum` (which is also a pure byte concatenation with no
 * separator). Keeping the two sides in lock-step is what makes the
 * skip path actually skip: the bash-computed hash and the
 * Node-computed hash MUST agree, byte-for-byte.
 *
 * Earlier versions of this function inserted a single `0x0a` (LF)
 * byte between the two file bodies, on the theory that a separator
 * would make the hash more robust. Two problems with that:
 *   1. `createHash().update(0x0a)` throws
 *      `ERR_INVALID_ARG_TYPE: data argument must be of type string or
 *      an instance of Buffer, TypedArray, or DataView. Received type
 *      number (10)`. The number `0x0a` is not accepted.
 *   2. The bash side does NOT add a separator, so the two hashes
 *      would never have agreed even if the call hadn't thrown.
 * Both problems are fixed by dropping the separator entirely.
 *
 * @param {string|Buffer} beatsJson  Raw bytes of `public/beats.json`.
 * @param {string|Buffer} wordsJson  Raw bytes of `public/timestamps.json`.
 * @returns {string} `v<version>:<64-char hex>`
 */
export const computeLastRenderHash = (beatsJson, wordsJson) => {
  const h = crypto.createHash("sha256");
  h.update(beatsJson);
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
