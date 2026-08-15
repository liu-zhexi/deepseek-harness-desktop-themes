/**
 * Effect preset metadata shared by the settings UI and the effect engine.
 */

import type { EffectPresetId } from '../config/types.ts';

export type EffectKind = 'none' | 'points' | 'streaks' | 'petals' | 'bubbles' | 'ribbons' | 'glow';

export interface EffectPresetMeta {
  id: EffectPresetId;
  /** Particle drawing style. */
  kind: EffectKind;
  /** Whether nearby particles should be connected with lines. */
  connectLines: boolean;
  /** Whether the preset has an ambient glow layer. */
  hasGlow: boolean;
}

export const EFFECT_PRESETS: readonly EffectPresetMeta[] = [
  { id: 'none', kind: 'none', connectLines: false, hasGlow: false },
  { id: 'tech-data', kind: 'streaks', connectLines: true, hasGlow: false },
  { id: 'starfield', kind: 'points', connectLines: false, hasGlow: false },
  { id: 'aurora-flow', kind: 'ribbons', connectLines: false, hasGlow: true },
  { id: 'fireflies', kind: 'points', connectLines: false, hasGlow: false },
  { id: 'bubbles', kind: 'bubbles', connectLines: false, hasGlow: false },
  { id: 'sakura', kind: 'petals', connectLines: false, hasGlow: false },
  { id: 'gold-dust', kind: 'points', connectLines: false, hasGlow: false },
  { id: 'breathing', kind: 'glow', connectLines: false, hasGlow: true },
  { id: 'custom', kind: 'points', connectLines: false, hasGlow: false },
];

export function getEffectPreset(id: EffectPresetId): EffectPresetMeta {
  return EFFECT_PRESETS.find((p) => p.id === id) ?? EFFECT_PRESETS[0];
}
