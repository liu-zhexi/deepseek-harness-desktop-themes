"""Generate src/pet/ruan.ts from the current transparent character asset.

The source asset is normalized by finalize_ruan.py before being embedded.
"""
import base64
import io
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PNG = ROOT / "assets" / "ruanqilan.png"
OUT = ROOT / "src" / "pet" / "ruan.ts"

img = Image.open(PNG).convert("RGBA")
buf = io.BytesIO()
img.save(buf, "WEBP", quality=82, method=6)
data = base64.b64encode(buf.getvalue()).decode("ascii")

CHUNK = 96
chunks = [data[i : i + CHUNK] for i in range(0, len(data), CHUNK)]

lines = []
lines.append("/**")
lines.append(" * Embedded desktop-pet photo: the '阮启岚' character (full body, both legs")
lines.append(" * complete, transparent background). Generated from the current character")
lines.append(" * asset so clothing, face shape, and body proportions stay up to date.")
lines.append(" */")
lines.append("const RUAN_PHOTO_B64 =")
for i, chunk in enumerate(chunks):
    sep = "" if i == 0 else "+"
    lines.append(f"  {sep} '{chunk}'")
lines.append("  + '';")
lines.append("")
lines.append("export const RUAN_PHOTO_SRC = 'data:image/webp;base64,' + RUAN_PHOTO_B64;")
lines.append("")

OUT.write_text("\n".join(lines), encoding="utf-8")
print("wrote", OUT, OUT.stat().st_size, "bytes", len(chunks), "chunks")
