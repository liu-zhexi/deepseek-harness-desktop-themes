"""One-off extraction of the '阮启岚' character from the ChatGPT image.

Usage: python scripts/extract_ruan.py

Downscales the source, removes the background with u2net, crops to the figure,
and writes a transparent PNG plus a quality report.
"""
import sys
from pathlib import Path

from PIL import Image, ImageFilter
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "ChatGPT Image Aug 15, 2026, 08_57_26 PM.png"
OUT = ROOT / "assets" / "ruanqilan.png"

MAX_DIM = 768  # displayed at <=288px; keeps the embedded asset small


def main() -> int:
    img = Image.open(SRC).convert("RGB")
    print("source", img.size)
    if max(img.size) > MAX_DIM:
        img.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
        print("downscaled", img.size)

    # rembg returns an RGBA image whose ALPHA channel is the foreground mask.
    cutout = remove(img)
    mask = cutout.getchannel("A")

    # Clean the mask: drop faint remnants, then soften one pixel for edges.
    mask = mask.point(lambda p: 255 if p > 96 else 0)
    mask = mask.filter(ImageFilter.MinFilter(3))  # remove stray specks / halo
    mask = mask.filter(ImageFilter.GaussianBlur(0.7))

    bbox = mask.getbbox()
    print("alpha bbox", bbox)
    if bbox is None:
        print("NO foreground detected", file=sys.stderr)
        return 1

    pad = 6
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(mask.width, bbox[2] + pad)
    bottom = min(mask.height, bbox[3] + pad)

    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    cropped = rgba.crop((left, top, right, bottom))

    # The pet displays at <=288px wide; normalize width to 320 for a crisp
    # but small embedded asset.
    TARGET_W = 320
    if cropped.width > TARGET_W:
        h = round(cropped.height * TARGET_W / cropped.width)
        cropped = cropped.resize((TARGET_W, h), Image.LANCZOS)

    alpha = cropped.getchannel("A")
    opaque = sum(1 for p in list(alpha.getdata()) if p > 128)
    total = cropped.width * cropped.height
    print("crop", cropped.size, "coverage %.1f%%" % (100 * opaque / total))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(OUT, optimize=True)
    print("wrote", OUT, cropped.size, OUT.stat().st_size, "bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
