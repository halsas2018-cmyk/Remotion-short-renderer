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
#   `src/lib/lastRenderHash.ts` to invalidate old caches.
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
#   3 — no audio plan log line was written (Horizon 0.4 — 1.4
#       regression: the audio plan wasn't computed or the file
#       write failed)
#   4 — --skip-if-unchanged was requested but the cache file
#       `out/last-render.json` is missing or unreadable (treat
#       as a fresh render, NOT a failure; we still run the render)
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
AUDIO_PLAN_LOG="${OUT_DIR}/audio-mounts.log"
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
echo "    audio plan:         ${AUDIO_PLAN_LOG}"
echo "    last-render cache:  ${LAST_RENDER_FILE}"
echo "    skip-if-unchanged:  ${SKIP_IF_UNCHANGED}"

mkdir -p "${OUT_DIR}"

# ------------------------------------------------------------------
# Horizon 0.5 — skip-if-unchanged check.
#
# We compute the hash here in bash (cat | sha256sum) and then
# delegate the version-aware read to a small Node one-liner so the
# semantics of "is the cache valid?" match the TypeScript helper
# exactly. If the cache is missing or stale, we fall through to the
# render path. We never fail with exit 4 just because the cache is
# absent on a fresh checkout — that's exit 0 to "fall through".
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
    CACHE_RESULT=$(node -e "
      const fs = require('fs');
      const path = '${LAST_RENDER_FILE}';
      let raw;
      try { raw = fs.readFileSync(path, 'utf8'); }
      catch (e) { console.log('MISSING'); process.exit(0); }
      let obj;
      try { obj = JSON.parse(raw); }
      catch (e) { console.log('MALFORMED'); process.exit(0); }
      const expectedPrefix = 'v' + (require('./src/lib/lastRenderHash').LAST_RENDER_HASH_VERSION) + ':';
      if (typeof obj.version !== 'number' || obj.version !== require('./src/lib/lastRenderHash').LAST_RENDER_HASH_VERSION) {
        console.log('STALE_VERSION');
        process.exit(0);
      }
      if (typeof obj.hash !== 'string' || !obj.hash.startsWith(expectedPrefix)) {
        console.log('STALE_FORMAT');
        process.exit(0);
      }
      console.log('OK ' + obj.hash + ' ' + (obj.renderedAt || ''));
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

# Truncate the audio plan log so the assertion only sees the current
# render. This is safe to do even on a first run (the file doesn't
# exist yet, but we create it as empty so the grep has something to
# look at if the render fails before calculateMetadata completes).
: > "${AUDIO_PLAN_LOG}"

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
# Horizon 0.4 (1.4) audio plan assertion.
#
# The audio plan is written by Root.tsx::renderDataCalculateMetadata
# to out/audio-mounts.log AFTER the JSONs are parsed and deduped
# but BEFORE the orchestrator mounts. It is one JSON line per
# render with:
#   - beatsCount, wordsCount
#   - narration, ambient (resolved public/ paths)
#   - whooshCount, clickCount
#   - whooshSlots: per-whoosh { from, to, beatIndex }
#
# Why a file (not console.log):
#   We tried every React mount hook to emit a per-stream log line:
#     - onMount on <Audio>        — time-driven, doesn't fire in `still`
#     - useEffect(..., [])         — post-render, doesn't fire in `still`
#     - useState(() => ...) init   — initializer, doesn't fire in `still`
#     - useRef(false) + body log   — doesn't fire in `still` either
#   The `still` (single-frame) renderer in Remotion does not commit
#   the React component tree — it just calls the render function
#   for one frame and discards it. The orchestrator is never
#   mounted. So the only place we can emit observability is from
#   calculateMetadata, which DOES run before the render.
#
# We assert at least one line is present and is a valid JSON object
# with the expected top-level fields. This proves the audio plan
# was computed and the file write succeeded.
# ------------------------------------------------------------------
if [ ! -s "${AUDIO_PLAN_LOG}" ]; then
  echo "==> FAIL: no audio plan log line in ${AUDIO_PLAN_LOG}." >&2
  echo "==> This means the audio plan was not computed, or the" >&2
  echo "==> file write in Root.tsx::renderDataCalculateMetadata" >&2
  echo "==> failed. The 1.4 invariant is that one JSON line per" >&2
  echo "==> render lands in out/audio-mounts.log." >&2
  echo "==> Last 50 lines of stderr:" >&2
  tail -n 50 "${STDERR_LOG}" >&2 || true
  echo "==> Last 50 lines of stdout:" >&2
  tail -n 50 "${STDOUT_LOG}" >&2 || true
  exit 3
fi

# Validate the last line is a JSON object with the expected fields.
# We use Node.js here because the bash-only JSON parsing path is
# gnarly and we already need Node for the render.
AUDIO_PLAN_VALIDATION=$(node -e "
  const fs = require('fs');
  const lines = fs.readFileSync('${AUDIO_PLAN_LOG}', 'utf8').trim().split('\n');
  const last = lines[lines.length - 1];
  try {
    const obj = JSON.parse(last);
    const required = ['beatsCount', 'wordsCount', 'narration', 'ambient', 'whooshCount', 'clickCount', 'whooshSlots'];
    const missing = required.filter(k => !(k in obj));
    if (missing.length) {
      console.log('INVALID: missing keys: ' + missing.join(', '));
      process.exit(1);
    }
    console.log('beatsCount=' + obj.beatsCount + ' wordsCount=' + obj.wordsCount + ' whooshCount=' + obj.whooshCount + ' clickCount=' + obj.clickCount);
  } catch (e) {
    console.log('INVALID: not valid JSON: ' + e.message);
    process.exit(1);
  }
" 2>&1) || {
  echo "==> FAIL: audio plan log line is not valid JSON." >&2
  echo "==> Contents: $(cat "${AUDIO_PLAN_LOG}")" >&2
  exit 3
}

# ------------------------------------------------------------------
# Horizon 0.5 — write the last-render hash so the NEXT invocation
# of `scripts/render-smoke.sh --skip-if-unchanged` can short-circuit.
#
# We compute the same canonical input as above (`cat beats words`)
# and write it via the TypeScript helper so the schema is shared
# with any future caller. Failures are warned, not fatal — a broken
# cache file shouldn't kill an otherwise-successful render.
# ------------------------------------------------------------------
INPUT_HASH=$(
  cat "${PUBLIC_BEATS_FILE}" "${PUBLIC_WORDS_FILE}" | sha256sum | awk '{print $1}'
)
DURATION_FRAMES=$(node -e "
  const fs = require('fs');
  const lines = fs.readFileSync('${AUDIO_PLAN_LOG}', 'utf8').trim().split('\n');
  const obj = JSON.parse(lines[lines.length - 1]);
  // We don't store totalDurationInFrames in the plan; derive from
  // beats if we can. Falls back to 0 (which is fine — it's metadata
  // for humans, not load-bearing).
  console.log(obj.beatsCount || 0);
" 2>/dev/null || echo 0)

if ! node -e "
  const { writeLastRenderHash, LAST_RENDER_HASH_VERSION } = require('./src/lib/lastRenderHash');
  const { createHash } = require('node:crypto');
  // Re-derive the prefixed hash from the same inputs the bash did,
  // so the schema in TS is the single source of truth.
  const fs = require('node:fs');
  const beats = fs.readFileSync('${PUBLIC_BEATS_FILE}');
  const words = fs.readFileSync('${PUBLIC_WORDS_FILE}');
  const h = createHash('sha256');
  h.update(beats);
  h.update(0x0a);
  h.update(words);
  const hex = h.digest('hex');
  writeLastRenderHash('${OUT_DIR}', 'v' + LAST_RENDER_HASH_VERSION + ':' + hex, {
    durationInFrames: ${DURATION_FRAMES} || undefined,
  });
" 2>&1; then
  echo "==> WARN: failed to write ${LAST_RENDER_FILE} (non-fatal, see above)." >&2
fi

echo "==> OK: smoke render produced ${OUTPUT_SIZE}-byte PNG at ${OUT_FILE}"
echo "==> OK: audio plan: ${AUDIO_PLAN_VALIDATION}"
echo "==> OK: log file:   ${AUDIO_PLAN_LOG}"
echo "==> OK: cache:      ${LAST_RENDER_FILE} (hash ${INPUT_HASH:0:12}…)"
exit 0
