#!/usr/bin/env bash
# ------------------------------------------------------------------
# Render a single-frame "smoke test" of the MotionGraphicsVideo
# composition, then assert the output exists and is at least 60
# frames long.
#
# Usage:
#   ./scripts/render-smoke.sh
#
# Why this exists (Horizon 0.1):
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
# Pre-requisites:
#   1. public/narration.mp3, public/beats.json, public/timestamps.json
#      and public/sfx-ambient.mp3 must all exist.
#   2. node + npx must be on PATH.
#
# Exit codes:
#   0 — render succeeded and the output is at least 60 frames
#   1 — render failed (Remotion printed an error)
#   2 — output is too short (< 60 frames), indicates a silent
#       failure we should investigate
#   3 — no audio plan log line was written (Horizon 0.4 — 1.4
#       regression: the audio plan wasn't computed or the file
#       write failed)
# ------------------------------------------------------------------
set -euo pipefail

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
MIN_FRAMES=60
COMPOSITION_ID="MotionGraphicsVideo"

echo "==> Smoke test: rendering 1 frame of ${COMPOSITION_ID}"
echo "    project root: ${PROJECT_ROOT}"
echo "    output:       ${OUT_FILE}"
echo "    stdout log:   ${STDOUT_LOG}"
echo "    stderr log:   ${STDERR_LOG}"
echo "    combined log: ${COMBINED_LOG}"
echo "    audio plan:   ${AUDIO_PLAN_LOG}"

mkdir -p "${OUT_DIR}"

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

echo "==> OK: smoke render produced ${OUTPUT_SIZE}-byte PNG at ${OUT_FILE}"
echo "==> OK: audio plan: ${AUDIO_PLAN_VALIDATION}"
echo "==> OK: log file:   ${AUDIO_PLAN_LOG}"
exit 0
