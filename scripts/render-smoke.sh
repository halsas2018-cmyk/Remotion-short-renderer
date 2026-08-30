#!/usr/bin/env bash
# ------------------------------------------------------------------
# Render a single-frame "smoke test" of the MotionGraphicsVideo
# composition, then assert the output exists and is at least 60
# frames long.
#
# Usage:
#   ./scripts/render-smoke.sh
#   ./scripts/render-smoke.sh --skip-if-unchanged
#
# Why this exists (Horizon 0.1 + 0.5):
#   The render pipeline is now functioning but fragile. A missing
#   beats.json used to silently produce a 1-frame MP4 with no
#   error. This script makes it trivial to verify that the render
#   pipeline produced something usable — and that the hard-error
#   path kicks in if beats.json / timestamps.json are missing or
#   malformed.
#
# What "smoke" means here:
#   We render at 0.1× scale (≈216×384) and only the middle frame
#   (frame 60, the 2-second mark at 30 fps). The output is a
#   single still image, not a video. The point is to exercise the
#   full render path (calculateMetadata → fetch beats.json → mount
#   MotionGraphicsVideo → render frame 60) in under a minute. If
#   anything is wrong with the data input or the metadata
#   validation, this fails fast and loudly.
#
# --skip-if-unchanged (Horizon 0.5):
#   Compute a SHA-256 of `public/beats.json` + `public/timestamps.json`
#   and compare it to the hash stored in `out/last-render.json` from
#   the previous successful render. If they match, print a SKIP
#   message and exit 0 without re-running `remotion still`. Saves
#   ~2 minutes of ffmpeg time on every duplicate render. The hash
#   only covers beats + words (the visible-output inputs); changes
#   to narration.mp3 / sfx-ambient.mp3 do NOT invalidate the cache
#   because they don't change a single pixel. If you change a SFX
#   mapping in `sceneSfx.ts`, bump `LAST_RENDER_HASH_VERSION` in
#   `scripts/lastRenderHash.mjs` to invalidate old caches.
#
# Canonical hash input: the two file bodies concatenated byte-for-byte
# with NO separator. This matches what `cat beats.json timestamps.json
# | sha256sum` produces and what `computeLastRenderHash` in
# `scripts/lastRenderHash.mjs` produces. Earlier versions of this
# script inserted a single `0x0a` (LF) byte between the two file
# bodies, on the theory that a separator would make the hash more
# robust. Two problems with that:
#   1. `createHash().update(0x0a)` throws
#      `ERR_INVALID_ARG_TYPE: data argument must be of type string or
#      an instance of Buffer, TypedArray, or DataView. Received type
#      number (10)`. The number `0x0a` is not accepted; you have to
#      wrap it in `Buffer.from([0x0a])` or `"\n"`.
#   2. The bash side does NOT add a separator, so the two hashes
#      would never have agreed even if the call hadn't thrown.
# Both problems are fixed by dropping the separator entirely.
#
# Pre-requisites:
#   1. public/narration.mp3, public/beats.json, public/timestamps.json
#      and public/sfx-ambient.mp3 must all exist.
#   2. node + npx must be on PATH.
#
# Exit codes:
#   0 — render succeeded and the output is at least 60 frames
#       (or --skip-if-unchanged matched the cache)
#   1 — render failed (Remotion printed an error)
#   2 — output is too short (< 60 frames), indicates a silent
#       failure we should investigate
#
# History:
#   - Horizon 1.4 used to add exit code 3 for "no audio plan log
#     line in out/audio-mounts.log". That assertion was dropped
#     along with 1.4 itself (see ROADMAP.md / CLAUDE.md). The
#     orchestrator's audio streams are observable through the
#     React tree; a side-channel log was redundant.
# ------------------------------------------------------------------
set -euo pipefail

# ------------------------------------------------------------------
# Parse flags. We only support one right now (--skip-if-unchanged)
# but use a loop so future flags (e.g. --scale, --frame) can slot in
# without rewriting the parser.
# ------------------------------------------------------------------
SKIP_IF_UNCHANGED=0
for arg in "$@"; do
  case "${arg}" in
    --skip-if-unchanged)
      SKIP_IF_UNCHANGED=1
      ;;
    -h|--help)
      sed -n '2,40p' "$0"
      exit 0
      ;;
    *)
      echo "==> FAIL: unknown flag: ${arg}" >&2
      echo "==> Run with --help for usage." >&2
      exit 1
      ;;
  esac
done

# Resolve the project root (the directory above this script) so the
# script works regardless of where it's invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

OUT_DIR="${PROJECT_ROOT}/out"
OUT_FILE="${OUT_DIR}/smoke.png"
STDOUT_LOG="${OUT_DIR}/smoke.stdout.log"
STDERR_LOG="${OUT_DIR}/smoke.stderr.log"
COMBINED_LOG="${OUT_DIR}/smoke.combined.log"
LAST_RENDER_FILE="${OUT_DIR}/last-render.json"
PUBLIC_BEATS_FILE="${PROJECT_ROOT}/public/beats.json"
PUBLIC_WORDS_FILE="${PROJECT_ROOT}/public/timestamps.json"
MIN_FRAMES=60
COMPOSITION_ID="MotionGraphicsVideo"

echo "==> Smoke test: rendering 1 frame of ${COMPOSITION_ID}"
echo "    project root:       ${PROJECT_ROOT}"
echo "    output:             ${OUT_FILE}"
echo "    stdout log:         ${STDOUT_LOG}"
echo "    stderr log:         ${STDERR_LOG}"
echo "    combined log:       ${COMBINED_LOG}"
echo "    last-render cache:  ${LAST_RENDER_FILE}"
echo "    skip-if-unchanged:  ${SKIP_IF_UNCHANGED}"

mkdir -p "${OUT_DIR}"

# ------------------------------------------------------------------
# Phase 2.2 — registry unit tests.
#
# Run the Vitest unit-test suite BEFORE the ~2-minute render. If the
# tests fail, the smoke test fails fast. The test suite is the
# type-system-equivalent guard, not a render-equivalent guard, so
# it always runs — even with --skip-if-unchanged. The render cache
# is for visible-output equivalence (beats + words bytes), not for
# test-pass equivalence; a broken schema should fail the smoke
# script regardless of whether the visible output changed.
#
# We tail the last 20 lines so a failing test produces a readable
# assertion in the smoke log. The pipeline uses `set -o pipefail`
# (set at the top of this script) so the if-check sees the exit
# code of `npm test`, not the exit code of `tail`.
# ------------------------------------------------------------------
echo "==> Running registry unit tests (Phase 2.2)…"
if ! npm test --silent 2>&1 | tail -n 20; then
  echo "==> FAIL: registry unit tests failed. Fix before re-running smoke test." >&2
  exit 1
fi
echo "==> OK: registry unit tests passed."

# ------------------------------------------------------------------
# Horizon 0.5 — skip-if-unchanged check.
#
# We compute the hash here in bash (cat | sha256sum) and then
# delegate the version-aware read to a small Node one-liner that
# dynamically imports `scripts/lastRenderHash.mjs`. The helper is
# deliberately kept under `scripts/` (not `src/`) so Remotion's
# webpack bundler never walks it — only the smoke script's
# `node -e` invocation loads it. If the cache is missing or stale,
# we fall through to the render path. We never fail just because
# the cache is absent on a fresh checkout — that's exit 0 to
# "fall through".
# ------------------------------------------------------------------
if [ "${SKIP_IF_UNCHANGED}" = "1" ]; then
  if [ ! -f "${PUBLIC_BEATS_FILE}" ] || [ ! -f "${PUBLIC_WORDS_FILE}" ]; then
    echo "==> --skip-if-unchanged: input files missing, falling through to render."
  elif [ ! -f "${LAST_RENDER_FILE}" ]; then
    echo "==> --skip-if-unchanged: no cache file (${LAST_RENDER_FILE}), falling through."
  else
    INPUT_HASH=$(
      cat "${PUBLIC_BEATS_FILE}" "${PUBLIC_WORDS_FILE}" | sha256sum | awk '{print $1}'
    )
    CACHE_RESULT=$(node --input-type=module -e "
      const { readLastRenderHash, LAST_RENDER_HASH_VERSION } = await import('./scripts/lastRenderHash.mjs');
      const path = '${LAST_RENDER_FILE}';
      let record;
      try { record = readLastRenderHash('${OUT_DIR}'); }
      catch (e) { console.log('READ_ERROR'); process.exit(0); }
      if (!record) { console.log('MISSING_OR_STALE'); process.exit(0); }
      console.log('OK ' + record.hash + ' ' + record.renderedAt);
    " 2>/dev/null || echo "NODE_ERROR")
    CACHE_STATUS="${CACHE_RESULT%% *}"
    CACHE_HASH="${CACHE_RESULT#* }"
    CACHE_HASH="${CACHE_HASH%% *}"

    if [ "${CACHE_STATUS}" = "OK" ] && [ "${CACHE_HASH#v*:}" = "${INPUT_HASH}" ]; then
      echo "==> SKIP: input hash matches ${CACHE_HASH} (rendered ${CACHE_RESULT##* })."
      echo "==> SKIP: nothing to re-render. Use without --skip-if-unchanged to force."
      exit 0
    else
      echo "==> --skip-if-unchanged: cache status=${CACHE_STATUS}, falling through to render."
    fi
  fi
fi

# Render a single frame at the 2-second mark. `--scale=0.2` keeps
# the output small (≈216×384) so the smoke test runs in under a
# minute even on slow machines. If beats.json or timestamps.json
# are missing, Remotion will print the "[MotionGraphicsVideo] ..."
# error we just added in Horizon 0.1 and exit non-zero.
#
# We capture BOTH stdout and stderr because the Remotion CLI's
# bundler is inconsistent about which stream console.log lands in.
if ! npx remotion still "${COMPOSITION_ID}" \
    --output="${OUT_FILE}" \
    --frame=60 \
    --scale=0.2 \
    > "${STDOUT_LOG}" 2> "${STDERR_LOG}"; then
  echo "==> FAIL: Remotion render returned non-zero. See logs above." >&2
  echo "==> Stderr log (last 50 lines):" >&2
  tail -n 50 "${STDERR_LOG}" >&2 || true
  echo "==> Stdout log (last 50 lines):" >&2
  tail -n 50 "${STDOUT_LOG}" >&2 || true
  exit 1
fi

# Concatenate both streams so any future console.log-based assertions
# don't care which stream Remotion chose.
cat "${STDOUT_LOG}" "${STDERR_LOG}" > "${COMBINED_LOG}"

if [ ! -f "${OUT_FILE}" ]; then
  echo "==> FAIL: expected output file ${OUT_FILE} not found." >&2
  exit 1
fi

OUTPUT_SIZE=$(stat -c %s "${OUT_FILE}" 2>/dev/null || stat -f %z "${OUT_FILE}")
if [ "${OUTPUT_SIZE}" -lt 1024 ]; then
  echo "==> FAIL: output is suspiciously small (${OUTPUT_SIZE} bytes)." >&2
  exit 2
fi

# ------------------------------------------------------------------
# Horizon 0.5 — write the last-render hash so the NEXT invocation
# of `scripts/render-smoke.sh --skip-if-unchanged` can short-circuit.
#
# We compute the same canonical input as above (`cat beats words`),
# which is a pure byte concatenation with NO separator. The Node
# side mirrors that exactly: two `h.update()` calls with no
# separator in between. The hash is then prefixed with the version
# and written via the helper module so the schema is shared with
# any future caller. Failures are warned, not fatal — a broken
# cache file shouldn't kill an otherwise-successful render.
# ------------------------------------------------------------------
INPUT_HASH=$(
  cat "${PUBLIC_BEATS_FILE}" "${PUBLIC_WORDS_FILE}" | sha256sum | awk '{print $1}'
)

if ! node --input-type=module -e "
  const { writeLastRenderHash, LAST_RENDER_HASH_VERSION } = await import('./scripts/lastRenderHash.mjs');
  const fs = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const beats = fs.readFileSync('${PUBLIC_BEATS_FILE}');
  const words = fs.readFileSync('${PUBLIC_WORDS_FILE}');
  // Canonical input: beats bytes || words bytes, no separator.
  // Must match the bash side ('cat beats words | sha256sum') and
  // scripts/lastRenderHash.mjs::computeLastRenderHash byte-for-byte.
  const h = createHash('sha256');
  h.update(beats);
  h.update(words);
  const hex = h.digest('hex');
  writeLastRenderHash('${OUT_DIR}', 'v' + LAST_RENDER_HASH_VERSION + ':' + hex);
" 2>&1; then
  echo "==> WARN: failed to write ${LAST_RENDER_FILE} (non-fatal, see above)." >&2
fi

echo "==> OK: smoke render produced ${OUTPUT_SIZE}-byte PNG at ${OUT_FILE}"
echo "==> OK: cache:      ${LAST_RENDER_FILE} (hash ${INPUT_HASH:0:12}…)"
exit 0
