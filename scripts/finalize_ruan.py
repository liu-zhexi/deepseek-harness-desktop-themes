"""Extract the generated full-body character to a transparent desktop-pet PNG.

Usage: python scripts/finalize_ruan.py

Runs rembg on assets/ruan_generated.png, crops to the figure, normalizes width
to 320px, and writes assets/ruanqilan.png.
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "ruan_generated.png"
OUT = ROOT / "assets" / "ruanqilan.png"
TARGET_W = 320


def main() -> int:
    img = Image.open(SRC).convert("RGB")
    print("source", img.size)

    # The generated source has a baked-in light checkerboard. Seed GrabCut with
    # its neutral gray pixels as background and the darker/chromatic pixels in
    # the central figure region as foreground. This avoids loading a heavyweight
    # neural background-removal model for a deliberately simple backdrop.
    rgb = np.asarray(img)
    height, width = rgb.shape[:2]
    channel_range = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    neutral_light = (rgb.min(axis=2) > 220) & (channel_range < 10)

    gc_mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    inset = max(2, round(min(width, height) * 0.01))
    gc_mask[:inset, :] = cv2.GC_BGD
    gc_mask[-inset:, :] = cv2.GC_BGD
    gc_mask[:, :inset] = cv2.GC_BGD
    gc_mask[:, -inset:] = cv2.GC_BGD

    x0, x1 = round(width * 0.12), round(width * 0.88)
    y0, y1 = round(height * 0.025), round(height * 0.97)
    central = np.zeros((height, width), dtype=bool)
    central[y0:y1, x0:x1] = True
    gc_mask[central & ~neutral_light] = cv2.GC_PR_FGD

    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb, gc_mask, None, bg_model, fg_model, 5, cv2.GC_INIT_WITH_MASK)
    binary = np.where(
        (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)

    # Retain the main continuous person and fill only enclosed holes. The open
    # space between the legs remains transparent because it touches the border.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        print("NO foreground")
        return 1
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    binary = np.where(labels == largest, 255, 0).astype(np.uint8)
    flood = binary.copy()
    flood_mask = np.zeros((height + 2, width + 2), np.uint8)
    cv2.floodFill(flood, flood_mask, (0, 0), 255)
    binary = cv2.bitwise_or(binary, cv2.bitwise_not(flood))

    mask = Image.fromarray(binary, "L")
    mask = mask.filter(ImageFilter.MinFilter(3))
    mask = mask.filter(ImageFilter.GaussianBlur(0.7))

    bbox = mask.getbbox()
    print("bbox", bbox)
    if bbox is None:
        print("NO foreground")
        return 1

    pad = 8
    left = max(0, bbox[0] - pad)
    top = max(0, bbox[1] - pad)
    right = min(img.width, bbox[2] + pad)
    bottom = min(img.height, bbox[3] + pad)

    rgba = img.convert("RGBA")
    rgba.putalpha(mask)
    cropped = rgba.crop((left, top, right, bottom))

    if cropped.width > TARGET_W:
        h = round(cropped.height * TARGET_W / cropped.width)
        cropped = cropped.resize((TARGET_W, h), Image.LANCZOS)

    alpha = cropped.getchannel("A")
    opaque = sum(1 for p in alpha.getdata() if p > 128)
    print("crop", cropped.size, "coverage %.1f%%" % (100 * opaque / (cropped.width * cropped.height)))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(OUT, optimize=True)
    print("wrote", OUT, cropped.size, OUT.stat().st_size, "bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
