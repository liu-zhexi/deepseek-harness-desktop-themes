import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONFIG, DEFAULT_PET, createDefaultConfig } from '../src/config/defaults.ts';
import { coerceConfig, mergeConfig } from '../src/config/validation.ts';
import { DesktopThemesSchema } from '../src/config/schema.ts';
import { loadRuanAnim, RUAN_ANIM, RUAN_ANIM_ACTIONS } from '../src/pet/ruan-anim.ts';
import { ruanActionShiftX, ruanActionVisualWidth } from '../src/pet/layout.ts';

test('default config has a full pet section', () => {
  assert.equal(DEFAULT_CONFIG.pet.enabled, true);
  assert.equal(DEFAULT_CONFIG.pet.style, 'photo');
  assert.equal(DEFAULT_CONFIG.pet.positionX, 88);
  assert.equal(DEFAULT_CONFIG.pet.positionY, 84);
  assert.equal(DEFAULT_CONFIG.pet.size, 112);
  assert.equal(DEFAULT_CONFIG.pet.animations, true);
  assert.equal(DEFAULT_CONFIG.pet.speech, true);
  assert.ok(DEFAULT_CONFIG.pet.speechLines.length > 0);
  assert.equal(DEFAULT_CONFIG.pet.voiceEnabled, false);
  assert.equal(DEFAULT_CONFIG.pet.voiceStyle, 'playful');
});

test('createDefaultConfig deep-copies the pet section', () => {
  const a = createDefaultConfig();
  const b = createDefaultConfig();
  assert.notEqual(a.pet, b.pet);
  assert.notEqual(a.pet.speechLines, b.pet.speechLines);
  a.pet.size = 999;
  a.pet.speechLines[0] = 'changed';
  assert.equal(b.pet.size, DEFAULT_PET.size);
  assert.notEqual(b.pet.speechLines[0], 'changed');
});

test('coerceConfig fills the pet defaults when missing', () => {
  const config = coerceConfig({});
  assert.deepEqual(config.pet, DEFAULT_PET);
});

test('coerceConfig accepts a valid pet section', () => {
  const config = coerceConfig({
    pet: {
      enabled: false,
      style: 'cat',
      positionX: 20,
      positionY: 30,
      size: 160,
      animations: false,
      speech: false,
      speechLines: ['hello', ' world ', 'hello'],
      voiceEnabled: true,
      voiceStyle: 'cheerful',
    },
  });
  assert.equal(config.pet.enabled, false);
  assert.equal(config.pet.style, 'cat');
  assert.equal(config.pet.positionX, 20);
  assert.equal(config.pet.positionY, 30);
  assert.equal(config.pet.size, 160);
  assert.equal(config.pet.animations, false);
  assert.equal(config.pet.speech, false);
  assert.deepEqual(config.pet.speechLines, ['hello', 'world']); // trimmed + deduped
  assert.equal(config.pet.voiceEnabled, true);
  assert.equal(config.pet.voiceStyle, 'cheerful');
});

test('coerceConfig accepts the photo pet style', () => {
  const config = coerceConfig({ pet: { style: 'photo' } });
  assert.equal(config.pet.style, 'photo');
});

test('coerceConfig accepts the ruan pet style', () => {
  const config = coerceConfig({ pet: { style: 'ruan' } });
  assert.equal(config.pet.style, 'ruan');
});

test('coerceConfig clamps out-of-range pet values and rejects unknown styles', () => {
  const config = coerceConfig({
    pet: { style: 'dragon', positionX: 999, positionY: -5, size: 1 },
  });
  assert.equal(config.pet.style, 'photo'); // unknown style falls back
  assert.equal(config.pet.positionX, 100); // clamped to max
  assert.equal(config.pet.positionY, 0); // clamped to min
  assert.equal(config.pet.size, 64); // clamped to min
  assert.equal(config.pet.enabled, true); // untouched default
});

test('coerceConfig clamps the pet size to the new 288px maximum and defaults bad voice style', () => {
  const config = coerceConfig({
    pet: { size: 9999, voiceStyle: 'screaming', voiceEnabled: true, speechLines: [] },
  });
  assert.equal(config.pet.size, 288);
  assert.equal(config.pet.voiceStyle, 'playful'); // unknown style falls back
  assert.equal(config.pet.voiceEnabled, true);
  assert.deepEqual(config.pet.speechLines, DEFAULT_PET.speechLines); // empty → defaults
});

test('mergeConfig keeps pet defaults when partial input lacks the section', () => {
  const merged = mergeConfig({ theme: 'obsidian-gold' });
  assert.equal(merged.theme, 'obsidian-gold');
  assert.deepEqual(merged.pet, DEFAULT_PET);
});

test('schema resolves the pet section to defaults for an empty input', () => {
  const resolved = DesktopThemesSchema({});
  assert.equal(resolved.pet.enabled, DEFAULT_PET.enabled);
  assert.equal(resolved.pet.style, DEFAULT_PET.style);
  assert.equal(resolved.pet.size, DEFAULT_PET.size);
  assert.equal(resolved.pet.voiceEnabled, DEFAULT_PET.voiceEnabled);
  assert.equal(resolved.pet.voiceStyle, DEFAULT_PET.voiceStyle);
  assert.deepEqual(resolved.pet.speechLines, DEFAULT_PET.speechLines);
});

test('schema accepts a valid pet override', () => {
  const resolved = DesktopThemesSchema({
    pet: { style: 'slime', size: 144, enabled: false, voiceEnabled: true, voiceStyle: 'robot', speechLines: ['hi'] },
  });
  assert.equal(resolved.pet.style, 'slime');
  assert.equal(resolved.pet.size, 144);
  assert.equal(resolved.pet.enabled, false);
  assert.equal(resolved.pet.voiceEnabled, true);
  assert.equal(resolved.pet.voiceStyle, 'robot');
  assert.deepEqual(resolved.pet.speechLines, ['hi']);
  assert.equal(resolved.pet.positionX, DEFAULT_PET.positionX); // untouched default
});

test('schema rejects an out-of-range pet size', () => {
  assert.throws(() => DesktopThemesSchema({ pet: { size: 9999 } } as any));
});

test('Ruan lazily loads compact current-character frames for every non-idle action', async () => {
  assert.deepEqual(RUAN_ANIM_ACTIONS, ['talk', 'basketball', 'lean', 'wave']);
  let decodedBytes = 0;
  for (const action of RUAN_ANIM_ACTIONS) {
    const meta = RUAN_ANIM[action];
    const anim = await loadRuanAnim(action);
    assert.equal(anim.frames.length, 8);
    assert.equal(anim.frameCount, 8);
    assert.equal(anim.height, 640);
    assert.ok(anim.width >= 240);
    assert.ok(anim.frameMs >= 80 && anim.frameMs <= 100);
    assert.equal(anim.durationMs, anim.frameMs * anim.sequence.length);
    assert.ok(anim.sequence.length >= 14);
    assert.ok(anim.sequence.every((index) => index >= 0 && index < anim.frames.length));
    assert.ok(anim.frames.every((frame) => frame.startsWith('data:image/webp;base64,')));
    assert.deepEqual({ ...anim, frames: undefined }, { ...meta, frames: undefined });
    decodedBytes += anim.width * anim.height * 4 * anim.frameCount;
  }
  assert.ok(decodedBytes < 32 * 1024 * 1024, `decoded frame budget was ${(decodedBytes / 1024 / 1024).toFixed(1)} MiB`);
});

test('wide Ruan actions shift back inside the viewport at either edge', () => {
  const viewport = 800;
  const visualWidth = ruanActionVisualWidth(288, RUAN_ANIM.lean.width, RUAN_ANIM.lean.height) * 1.04;
  for (const anchor of [0, 5, 50, 95, 100]) {
    const center = (viewport * anchor) / 100 + ruanActionShiftX(viewport, anchor, visualWidth);
    assert.ok(center - visualWidth / 2 >= 7.99);
    assert.ok(center + visualWidth / 2 <= viewport - 7.99);
  }
});
