"""Image-to-video via wan i2v (DashScope, async).

Usage: python scripts/qwen_i2v.py <input_image> <prompt> <output_mp4> [duration]
"""
import base64
import io
import json
import os
import sys
import time
from pathlib import Path

import requests
from PIL import Image

API_KEY = os.environ.get("DASHSCOPE_API_KEY", "").strip()
CREATE = "https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis"
TASK = "https://dashscope.aliyuncs.com/api/v1/tasks"


def encode_image(path: Path, max_dim: int = 1280) -> str:
    img = Image.open(path).convert("RGB")
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    # Keep the short side >= 240 (the i2v minimum), padding with white if needed.
    w, h = img.size
    if min(w, h) < 240:
        scale = 240 / min(w, h)
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    if not API_KEY:
        print("DASHSCOPE_API_KEY is not set", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    prompt = sys.argv[2]
    out = Path(sys.argv[3])
    duration = int(sys.argv[4]) if len(sys.argv) > 4 else 5

    payload = {
        "model": "wan2.6-i2v-flash",
        "input": {
            "prompt": prompt,
            "img_url": encode_image(src),
        },
        "parameters": {
            "resolution": "720P",
            "duration": duration,
        },
    }

    r = requests.post(
        CREATE,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json", "X-DashScope-Async": "enable"},
        json=payload,
        timeout=180,
    )
    print("CREATE", r.status_code)
    data = r.json()
    if r.status_code != 200:
        print(json.dumps(data, ensure_ascii=False)[:2000])
        return 1
    task_id = data.get("output", {}).get("task_id")
    print("task_id", task_id)

    # Poll until SUCCEEDED / FAILED.
    deadline = time.time() + 600
    while time.time() < deadline:
        time.sleep(8)
        s = requests.get(f"{TASK}/{task_id}", headers={"Authorization": f"Bearer {API_KEY}"}, timeout=60)
        d = s.json()
        status = d.get("output", {}).get("task_status")
        print("status", status)
        if status == "SUCCEEDED":
            video_url = d.get("output", {}).get("video_url")
            print("video_url", video_url)
            if video_url:
                v = requests.get(video_url, timeout=300).content
                out.write_bytes(v)
                print("wrote", out, len(v), "bytes")
                return 0
            return 1
        if status in ("FAILED", "CANCELED", "UNKNOWN"):
            print(json.dumps(d, ensure_ascii=False)[:2000])
            return 1
    print("TIMEOUT")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
