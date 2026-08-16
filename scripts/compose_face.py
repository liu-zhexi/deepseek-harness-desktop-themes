"""Paste the real face photo onto the body using face detection.

Usage: python scripts/compose_face.py

Detects faces in the headshot and the body, crops the headshot to the face
(with margin for hair/forehead), scales it to the body's face, and pastes it
with a soft blend so only the face swaps and the body's neck stays.
"""
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
HEAD = ROOT / "ChatGPT Image Aug 15, 2026, 10_25_07 PM.png"
BODY = ROOT / "assets" / "ruan_full3.png"
OUT = ROOT / "assets" / "ruan_face.png"
CASCADE = ROOT / "assets" / "haarcascade_frontalface_default.xml"

MARGIN = 0.55  # expand the face box to include hair/forehead/chin


def detect(img_rgb):
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    cascade = cv2.CascadeClassifier(str(CASCADE))
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(40, 40))
    if len(faces) == 0:
        return None
    return max(faces, key=lambda f: f[2] * f[3])  # largest face


def load_rgb(path):
    return np.array(Image.open(path).convert("RGB"))


def main() -> None:
    head_rgb = load_rgb(HEAD)
    body_rgb = load_rgb(BODY)

    hf = detect(head_rgb)
    bf = detect(body_rgb)
    print("headshot face", hf, "body face", bf)
    if hf is None or bf is None:
        print("face detection failed", file=__import__("sys").stderr)
        return 1

    hx, hy, hw, hh = hf
    bx, by, bw, bh = bf

    # Crop headshot face with margin (clamped to image).
    mw, mh = int(hw * MARGIN), int(hh * MARGIN)
    x0, y0 = max(0, hx - mw), max(0, hy - mh)
    x1, y1 = min(head_rgb.shape[1], hx + hw + mw), min(head_rgb.shape[0], hy + hh + mh)
    face = Image.fromarray(head_rgb[y0:y1, x0:x1]).convert("RGBA")

    # Remove the headshot background (light wall) via rembg for a clean alpha.
    from rembg import remove
    face = remove(Image.fromarray(head_rgb[y0:y1, x0:x1])).convert("RGBA")

    # Scale face to body's face size (plus a little to cover the old face).
    target_w = int(bw * (1 + MARGIN))
    face = face.resize((target_w, round(face.height * target_w / face.width)), Image.LANCZOS)

    # Soften the face edges slightly.
    fw, fh = face.size
    alpha = face.getchannel("A")
    from PIL import ImageFilter
    alpha = alpha.filter(ImageFilter.GaussianBlur(2))
    face.putalpha(alpha)

    body_img = Image.fromarray(body_rgb).convert("RGBA")
    # Paste at the body's face top-left (center the face box).
    paste_x = max(0, bx + bw // 2 - face.width // 2)
    paste_y = max(0, by + bh // 2 - face.height // 2)
    body_img.paste(face, (paste_x, paste_y), face)

    body_img.convert("RGB").save(OUT, optimize=True)
    print("composed", body_img.size, "face", face.size, "-> wrote", OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
