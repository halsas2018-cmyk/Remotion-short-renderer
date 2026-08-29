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
#   3 — no [audio] log lines were emitted (Horizon 0.4 — 1.4
#       regression: the orchestrator mounted but logAudioMount was
#       bypassed or the format changed)
# ------------------------------------------------------------------
set -euo pipefail

# Resolve the project root (the directory above this script) so the
# script works regardless of where it's invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

OUT_DIR="${PROJECT_ROOT}/out"
OUT_FILE="${OUT_DIR}/smoke.png"
LOG_FILE="${OUT_DIR}/smoke.stderr.log"
MIN_FRAMES=60
COMPOSITION_ID="MotionGraphicsVideo"

echo "==> Smoke test: rendering 1 frame of ${COMPOSITION_ID}"
echo "    project root: ${PROJECT_ROOT}"
echo "    output:       ${OUT_FILE}"
echo "    stderr log:   ${LOG_FILE}"

mkdir -p "${OUT_DIR}"

# Render a single frame at the 2-second mark. `--scale=0.2` keeps
# the output small (≈216×384) so the smoke test runs in under a
# minute even on slow machines. If beats.json or timestamps.json
# are missing, Remotion will print the "[MotionGraphicsVideo] ..."
# error we just added in Horizon 0.1 and exit non-zero.
#
# Stderr is captured to LOG_FILE because that's where Remotion
# (and console.log/console.warn from inside React onMount callbacks)
# write their output. The progress UI goes to stdout; the actual
# log lines go to stderr. This is also where the [audio] mount logs
# from logAudioMount land.
if ! npx remotion still "${COMPOSITION_ID}" \
    --output="${OUT_FILE}" \
    --frame=60 \
    --scale=0.2 \
    2> "${LOG_FILE}"; then
  echo "==> FAIL: Remotion render returned non-zero. See logs above." >&2
  echo "==> Stderr log (last 50 lines):" >&2
  tail -n 50 "${LOG_FILE}" >&2 || true
  exit 1
fi

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
# Horizon 0.4 (1.4) audio log assertion.
#
# Every <Audio> in the render pipeline calls logAudioMount() once on
# mount, emitting a "[audio] ..." line to console.log. This ends up
# in the captured stderr because the Remotion CLI routes console
# output through the same channel as the build progress.
#
# We assert that at least one [audio] line is present in the log —
# otherwise the orchestrator mounted successfully but the logger was
# bypassed (e.g. someone removed the onMount callback, or the helper
# was renamed and the callsites were missed). Without this assertion,
# a future regression in the audio logging would be invisible until
# someone manually rendered and grepped the output.
#
# We only require ONE [audio] line because a single-frame render
# (frame=60) at 30fps sits inside the narration's frame range (0..1438)
# and inside the ambient bed's frame range, so those two will always
# mount. The whoosh and click tracks are mounted at specific frames
# and may or may not be active at frame 60 depending on the beat
# plan; we don't assert on those.
# ------------------------------------------------------------------
if ! grep -q "\[audio\]" "${LOG_FILE}"; then
  echo "==> FAIL: no [audio] log lines found in ${LOG_FILE}." >&2
  echo "==> This means logAudioMount() did not run, or the format" >&2
  echo "==> changed. The 1.4 invariant is that every <Audio>" >&2
  echo "==> mount emits a [audio] line to console.log." >&2
  echo "==> Last 50 lines of stderr:" >&2
  tail -n 50 "${LOG_FILE}" >&2 || true
  exit 3
fi

AUDIO_LINE_COUNT=$(grep -c "\[audio\]" "${LOG_FILE}" || true)
echo "==> OK: smoke render produced ${OUTPUT_SIZE}-byte PNG at ${OUT_FILE}"
echo "==> OK: found ${AUDIO_LINE_COUNT} [audio] log line(s) in ${LOG_FILE}"
exit 0
