"""Extract transparent animation frames from a generated video.

Usage: python scripts/extract_frames.py <video> <outdir> <n_frames> <width>

Reads the video, samples N frames, removes the background from each, crops all
frames to one shared bounding box (so the figure stays aligned), resizes to a
common width, and writes frame_00.png ... plus a horizontal sprite sheet.
"""
import sys
from pathlib import Path

import imageio
import numpy as np
from PIL import Image
from rembg import remove


def main() -> int:
    video = Path(sys.argv[1])
    outdir = Path(sys.argv[2])
    n = int(sys.argv[3])
    width = int(sys.argv[4]) if len(sys.argv) > 4 else 200

    reader = imageio.get_reader(video)
    total = reader.count_frames()
    print("video frames", total)

    # Sample indices, skipping the static first frame.
    idxs = np.linspace(1, total - 2, n).astype(int)

    cutouts = []
    for i, idx in enumerate(idxs):
        frame = Image.fromarray(reader.get_data(int(idx))).convert("RGB")
        cutout = remove(frame)
        cutouts.append(cutout.convert("RGBA"))
        print("rembg", i + 1, "/", n)

    # Shared bounding box across all frames.
    boxes = [c.getchannel("A").getbbox() for c in cutouts]
    boxes = [b for b in boxes if b is not None]
    left = min(b[0] for b in boxes)
    top = min(b[1] for b in boxes)
    right = max(b[2] for b in boxes)
    bottom = max(b[3] for b in boxes)
    pad = 8
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(cutouts[0].width, right + pad)
    bottom = min(cutouts[0].height, bottom + pad)

    outdir.mkdir(parents=True, exist_ok=True)
    h = round((bottom - top) * width / (right - left))
    final = []
    for i, c in enumerate(cutouts):
        c = c.crop((left, top, right, bottom)).resize((width, h), Image.LANCZOS)
        final.append(c)
        c.save(outdir / f"frame_{i:02d}.png", optimize=True)

    # Horizontal sprite sheet.
    sheet = Image.new("RGBA", (width * n, h))
    for i, c in enumerate(final):
        sheet.paste(c, (i * width, 0), c)
    sheet.save(outdir / "sprite.png", optimize=True)

    print("wrote", outdir, "size", (width, h), "frames", n)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
