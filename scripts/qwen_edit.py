"""Image editing / generation via Qwen multimodal-generation (DashScope).

Usage: python scripts/qwen_edit.py <input_image[,input_image2,...]> <instruction> <output_path> [size]
"""
import base64
import io
import json
import os
import sys
from pathlib import Path

import requests
from PIL import Image

API_KEY = os.environ.get("DASHSCOPE_API_KEY", "").strip()
ENDPOINT = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"


def encode_image(path: Path, max_dim: int = 1024) -> str:
    img = Image.open(path).convert("RGB")
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def main() -> int:
    if not API_KEY:
        print("DASHSCOPE_API_KEY is not set", file=sys.stderr)
        return 2

    sources = [Path(p) for p in sys.argv[1].split("|")]
    instruction = sys.argv[2]
    out = Path(sys.argv[3])
    size = sys.argv[4] if len(sys.argv) > 4 else "1024*1440"

    content = []
    for src in sources:
        content.append({"image": encode_image(src)})
    content.append({"text": instruction})

    payload = {
        "model": "qwen-image-2.0-pro",
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": content,
                }
            ]
        },
        "parameters": {
            "n": 1,
            "negative_prompt": "",
            "prompt_extend": True,
            "watermark": False,
            "size": size,
        },
    }

    resp = requests.post(
        ENDPOINT,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=300,
    )
    print("HTTP", resp.status_code)
    data = resp.json()
    if resp.status_code != 200:
        print(json.dumps(data, ensure_ascii=False)[:2000])
        return 1

    # Extract image URL(s) from the response.
    urls = []
    try:
        for choice in data["output"]["choices"]:
            for item in choice["message"]["content"]:
                if isinstance(item, dict) and "image" in item:
                    urls.append(item["image"])
                elif isinstance(item, str):
                    urls.append(item)
    except Exception:
        print(json.dumps(data, ensure_ascii=False)[:2000])
        return 1

    if not urls:
        print("NO IMAGE URL in response:")
        print(json.dumps(data, ensure_ascii=False)[:2000])
        return 1

    out.parent.mkdir(parents=True, exist_ok=True)
    img = requests.get(urls[0], timeout=120).content
    out.write_bytes(img)
    print("wrote", out, len(img), "bytes", "urls", len(urls))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
