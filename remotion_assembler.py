"""
remotion_assembler.py
Renders draft_video.mp4 using Remotion's MotionGraphicsVideo composition.

The current pipeline (beats-driven architecture) works as follows:
  1. run_pipeline.py copies beats.json + narration.mp3 + timestamps.json
     into my-video/public/ BEFORE calling this function.
  2. Root.tsx::renderDataCalculateMetadata fetches those three files from
     /public at render-time via staticFile(), validates them, and passes
     the parsed data down as props to MotionGraphicsVideo.
  3. This function just invokes `npx remotion render MotionGraphicsVideo`
     and lets Remotion handle the rest.

There is no asset_plan.json, no shots, no remotion_props.json, and no
ShortsComposition in this architecture — those were from a previous
iteration and have been removed.
"""

import subprocess
from pathlib import Path


def assemble_video_remotion(project_dir: Path) -> Path:
    project_dir = Path(project_dir)
    output_video = project_dir / "draft_video.mp4"

    # Sanity-check: the files run_pipeline.py staged into public/ must exist.
    remotion_root = Path(__file__).parent
    public_dir = remotion_root / "public"
    missing = [
        name
        for name in ("beats.json", "narration.mp3", "timestamps.json")
        if not (public_dir / name).exists()
    ]
    if missing:
        raise FileNotFoundError(
            f"Required public/ files missing before Remotion render: {missing}. "
            f"run_pipeline.py should have copied them to {public_dir} already."
        )

    cmd = [
        "npx", "remotion", "render",
        "MotionGraphicsVideo",          # composition ID registered in Root.tsx
        str(output_video.absolute()),
        "--concurrency=1",              # Prevents "No target found" ProtocolError on
                                        # headless CI — default concurrency spawns one
                                        # Chrome tab per CPU core; OOM kills a tab while
                                        # Remotion is still sending Target.closeTarget.
        "--log=verbose",                # Surface the real error in CI logs on failure.
    ]

    print(
        f"  ─ Running: {' '.join(cmd[:4])} … → {output_video.name}"
    )
    result = subprocess.run(cmd, capture_output=False, text=True, cwd=remotion_root)
    if result.returncode != 0:
        raise RuntimeError(
            f"Remotion render failed with exit code {result.returncode}"
        )

    if not output_video.exists():
        raise RuntimeError(
            f"Remotion exited 0 but {output_video} was not created."
        )

    print(f"  ✓ draft_video.mp4 rendered by Remotion")
    return output_video


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        assemble_video_remotion(Path(sys.argv[1]))
    else:
        print("Usage: python remotion_assembler.py path/to/project_dir")
