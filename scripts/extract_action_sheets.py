"""Convert generated 4x2 action sheets into aligned transparent pet frames.

The generated sheets contain a baked checkerboard. This script slices the
eight cells, removes that simple background with GrabCut, and places every
frame on a common 939px-high canvas. The standing frame is used as the scale
reference so action playback does not make the character jump in size.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
IDLE = ASSETS / "ruanqilan.png"
TARGET_HEIGHT = 939
TARGET_MIN_WIDTH = 320
BASELINE = TARGET_HEIGHT - 4

SHEETS = {
    "talk": (ASSETS / "action_sheets" / "talk.png", ASSETS / "frames_talk"),
    "basketball": (ASSETS / "action_sheets" / "basketball.png", ASSETS / "frames_ball"),
    "lean": (ASSETS / "action_sheets" / "lean.png", ASSETS / "frames_lean"),
    "wave": (ASSETS / "action_sheets" / "wave.png", ASSETS / "frames_wave"),
}


@dataclass
class Cutout:
    image: Image.Image
    person_center_x: float
    person_bottom: float
    person_height: float


def fill_enclosed_holes(binary: np.ndarray) -> np.ndarray:
    flood = binary.copy()
    flood_mask = np.zeros((binary.shape[0] + 2, binary.shape[1] + 2), np.uint8)
    cv2.floodFill(flood, flood_mask, (0, 0), 255)
    return cv2.bitwise_or(binary, cv2.bitwise_not(flood))


def segment_cell(cell: Image.Image) -> Cutout:
    rgb = np.asarray(cell.convert("RGB"))
    height, width = rgb.shape[:2]
    spread = rgb.max(axis=2).astype(np.int16) - rgb.min(axis=2).astype(np.int16)
    checker = (rgb.min(axis=2) > 220) & (spread < 10)

    gc_mask = np.full((height, width), cv2.GC_PR_BGD, dtype=np.uint8)
    edge = max(2, round(min(width, height) * 0.012))
    gc_mask[:edge, :] = cv2.GC_BGD
    gc_mask[-edge:, :] = cv2.GC_BGD
    gc_mask[:, :edge] = cv2.GC_BGD
    gc_mask[:, -edge:] = cv2.GC_BGD
    gc_mask[~checker] = cv2.GC_PR_FGD

    bg_model = np.zeros((1, 65), np.float64)
    fg_model = np.zeros((1, 65), np.float64)
    cv2.grabCut(rgb, gc_mask, None, bg_model, fg_model, 4, cv2.GC_INIT_WITH_MASK)
    binary = np.where(
        (gc_mask == cv2.GC_FGD) | (gc_mask == cv2.GC_PR_FGD), 255, 0
    ).astype(np.uint8)

    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("No foreground found in action-sheet cell")

    areas = stats[1:, cv2.CC_STAT_AREA]
    person_label = 1 + int(np.argmax(areas))
    person_area = int(stats[person_label, cv2.CC_STAT_AREA])
    keep = np.zeros_like(binary)
    for label in range(1, count):
        # Preserve disconnected props such as the basketball, but discard tiny
        # checkerboard/antialias remnants.
        if int(stats[label, cv2.CC_STAT_AREA]) >= max(36, round(person_area * 0.008)):
            keep[labels == label] = 255

    keep = fill_enclosed_holes(keep)
    mask = Image.fromarray(keep, "L").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.65))
    union_bbox = mask.getbbox()
    if union_bbox is None:
        raise RuntimeError("Foreground became empty after cleanup")

    px = int(stats[person_label, cv2.CC_STAT_LEFT])
    py = int(stats[person_label, cv2.CC_STAT_TOP])
    pw = int(stats[person_label, cv2.CC_STAT_WIDTH])
    ph = int(stats[person_label, cv2.CC_STAT_HEIGHT])

    pad = 3
    left = max(0, union_bbox[0] - pad)
    top = max(0, union_bbox[1] - pad)
    right = min(width, union_bbox[2] + pad)
    bottom = min(height, union_bbox[3] + pad)

    rgba = cell.convert("RGBA")
    rgba.putalpha(mask)
    cropped = rgba.crop((left, top, right, bottom))
    return Cutout(
        image=cropped,
        person_center_x=(px + pw / 2) - left,
        person_bottom=(py + ph) - top,
        person_height=float(ph),
    )


def extract_sheet(sheet_path: Path, out_dir: Path) -> None:
    sheet = Image.open(sheet_path).convert("RGB")
    if sheet.width % 4 or sheet.height % 2:
        raise ValueError(f"Expected an exact 4x2 grid, got {sheet.size}: {sheet_path}")

    cell_w, cell_h = sheet.width // 4, sheet.height // 2
    cutouts: list[Cutout] = []
    for index in range(8):
        col, row = index % 4, index // 4
        cell = sheet.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
        cutouts.append(segment_cell(cell))

    idle_bbox = Image.open(IDLE).convert("RGBA").getchannel("A").getbbox()
    if idle_bbox is None:
        raise RuntimeError("Idle character has no alpha foreground")
    target_person_height = min(idle_bbox[3] - idle_bbox[1], TARGET_HEIGHT - 12)
    scale = target_person_height / cutouts[0].person_height

    half_extent = 0.0
    for cutout in cutouts:
        scaled_w = cutout.image.width * scale
        center = cutout.person_center_x * scale
        half_extent = max(half_extent, center, scaled_w - center)
    canvas_width = max(TARGET_MIN_WIDTH, int(math.ceil((half_extent + 8) * 2 / 2) * 2))

    frames: list[Image.Image] = []
    out_dir.mkdir(parents=True, exist_ok=True)
    for index, cutout in enumerate(cutouts):
        size = (
            max(1, round(cutout.image.width * scale)),
            max(1, round(cutout.image.height * scale)),
        )
        foreground = cutout.image.resize(size, Image.Resampling.LANCZOS)
        person_center = cutout.person_center_x * scale
        person_bottom = cutout.person_bottom * scale
        x = round(canvas_width / 2 - person_center)
        y = round(BASELINE - person_bottom)

        canvas = Image.new("RGBA", (canvas_width, TARGET_HEIGHT), (0, 0, 0, 0))
        canvas.paste(foreground, (x, y), foreground)
        canvas.save(out_dir / f"frame_{index:02d}.png", optimize=True)
        frames.append(canvas)

    sheet_out = Image.new("RGBA", (canvas_width * len(frames), TARGET_HEIGHT), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet_out.alpha_composite(frame, (index * canvas_width, 0))
    sheet_out.save(out_dir / "sprite.png", optimize=True)
    print(sheet_path.name, "cell", (cell_w, cell_h), "scale", round(scale, 3), "frame", (canvas_width, TARGET_HEIGHT))


def main() -> None:
    for sheet_path, out_dir in SHEETS.values():
        extract_sheet(sheet_path, out_dir)


if __name__ == "__main__":
    main()
