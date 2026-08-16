"""Describe an image with Qwen-VL (DashScope compatible-mode).

Usage: python scripts/qwen_vision.py <image_path> [question]
"""
import base64
import io
import os
import sys
from pathlib import Path

import requests
from PIL import Image

API_KEY = os.environ.get("DASHSCOPE_API_KEY", "").strip()
ENDPOINT = "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"


def encode_image(path: Path, max_dim: int = 1024) -> str:
    img = Image.open(path).convert("RGB")
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    if not API_KEY:
        print("DASHSCOPE_API_KEY is not set", file=sys.stderr)
        return 2

    path = Path(sys.argv[1])
    question = sys.argv[2] if len(sys.argv) > 2 else "详细描述这张图片里的人物：发型、服装、姿势、以及画面底部能看到几条腿、腿是否完整。"
    b64 = encode_image(path)
    payload = {
        "model": "qwen-vl-max",
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                    {"type": "text", "text": question},
                ],
            }
        ],
    }
    resp = requests.post(ENDPOINT, headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}, json=payload, timeout=180)
    print("HTTP", resp.status_code)
    data = resp.json()
    if resp.status_code != 200:
        print(data)
        return 1
    try:
        content = data["choices"][0]["message"]["content"]
    except Exception:
        content = str(data)
    out = Path(__file__).with_name("_vision_out.txt")
    out.write_text(content, encoding="utf-8")
    print("wrote", out)
    print(content.encode("ascii", "replace").decode("ascii")[:200])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
