import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const GENERATION_SCRIPTS = [
  'scripts/qwen_i2v.py',
  'scripts/qwen_edit.py',
  'scripts/qwen_vision.py',
  'scripts/compose_face.py',
  'scripts/extract_ruan.py',
  'scripts/finalize_ruan.py',
  'scripts/gen_ruan_anim_ts.py',
  'scripts/gen_ruan_ts.py',
  'scripts/recolor_jacket.py',
];

test('generation scripts contain neither embedded API keys nor machine-specific workspace paths', () => {
  for (const path of GENERATION_SCRIPTS) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /sk-[A-Za-z0-9_-]{12,}/, path);
    assert.doesNotMatch(source, /D:\\插件/i, path);
  }
});

test('DashScope helpers read credentials from the environment', () => {
  for (const path of GENERATION_SCRIPTS.slice(0, 3)) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /os\.environ\.get\("DASHSCOPE_API_KEY"/, path);
  }
});
