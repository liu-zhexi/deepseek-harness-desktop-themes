"""Recolor the generated character's bright-blue jacket to the original image's
muted navy-gray, using the original clothing color signature extracted from
08_57_26 PM.png (jacket = black + navy where R≈G and B ≈ R+32, ~(96,96,128)).

The Qwen API is out of balance, so this is a local color correction applied to
the already-extracted animation frames.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / "assets"


def recolor(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    a = np.asarray(rgb).astype(np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]

    # Saturated blue = the generated jacket (B high, R low, G between).
    mask = (b >= 96) & ((b - r) >= 60) & ((b - g) >= 30)

    # Desaturate into navy: R=G=B-32 (keeps blue channel as the shade ref).
    target = np.clip(b - 32, 0, 255)
    out = np.stack([np.where(mask, target, r), np.where(mask, target, g), b], axis=-1)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def process_frame(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    rgb = img.convert("RGB")
    recolored = recolor(rgb)
    recolored.putalpha(img.getchannel("A"))
    recolored.save(path, optimize=True)


def main() -> int:
    dirs = [ROOT / "frames_talk", ROOT / "frames_ball", ROOT / "frames_lean"]
    n = 0
    for d in dirs:
        for f in sorted(d.glob("frame_*.png")):
            process_frame(f)
            n += 1
    print("recolored", n, "frames")

    # Also recolor the green-screen full body for reference/regeneration.
    if len(sys.argv) > 1 and sys.argv[1] == "--base":
        base = ROOT / "ruan_outpaint.png"
        if base.exists():
            rgb = recolor(Image.open(base).convert("RGB"))
            rgb.save(ROOT / "ruan_outpaint_navy.png", optimize=True)
            print("wrote ruan_outpaint_navy.png")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
