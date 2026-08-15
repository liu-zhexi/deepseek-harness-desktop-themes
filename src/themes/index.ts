/**
 * Desktop-theme registry: the six built-in themes and the DSH `theme` service
 * registration definitions derived from them. Custom themes are built from the
 * same palette/token pipeline at runtime (see `paletteFromCustomColors`).
 */

import type { CustomThemeConfig } from '../config/types.ts';
import { auroraDream } from './aurora-dream.ts';
import { mintBreeze } from './mint-breeze.ts';
import { obsidianGold } from './obsidian-gold.ts';
import { buildThemeTokens, paletteFromCustomColors, type ThemePalette } from './palette.ts';
import { quantumBlue } from './quantum-blue.ts';
import { sakuraMist } from './sakura-mist.ts';
import { sunsetFlow } from './sunset-flow.ts';

/** Registration shape consumed by the DSH `theme` service (`register`). */
export interface DshThemeDefinition {
  id: string;
  colorScheme: 'light' | 'dark';
  tokens: Record<string, string>;
}

export interface DesktopTheme {
  id: string;
  /** Human-readable display name. */
  name: string;
  /** One-line description shown in the settings UI. */
  description: string;
  /** Style tag (e.g. "科技" / "Tech"). */
  tag: string;
  /** Core palette (used for transparency derivation + display swatches). */
  palette: ThemePalette;
  /** Ready-to-register DSH theme definition. */
  definition: DshThemeDefinition;
}

const DEFINITIONS: DesktopTheme[] = [
  {
    id: 'quantum-blue',
    name: 'Quantum Blue',
    description: 'Electric blue, cyan and violet over a deep blue-black canvas.',
    tag: 'Tech',
    palette: quantumBlue,
    definition: { id: 'quantum-blue', colorScheme: 'dark', tokens: buildThemeTokens(quantumBlue) },
  },
  {
    id: 'aurora-dream',
    name: 'Aurora Dream',
    description: 'Slow-drifting indigo auroras with teal and pink glow.',
    tag: 'Ethereal',
    palette: auroraDream,
    definition: { id: 'aurora-dream', colorScheme: 'dark', tokens: buildThemeTokens(auroraDream) },
  },
  {
    id: 'mint-breeze',
    name: 'Mint Breeze',
    description: 'Fresh mint, teal and soft cyan on a calm light surface.',
    tag: 'Fresh',
    palette: mintBreeze,
    definition: { id: 'mint-breeze', colorScheme: 'light', tokens: buildThemeTokens(mintBreeze) },
  },
  {
    id: 'sakura-mist',
    name: 'Sakura Mist',
    description: 'Restrained misty pink, lavender and warm white.',
    tag: 'Soft',
    palette: sakuraMist,
    definition: { id: 'sakura-mist', colorScheme: 'light', tokens: buildThemeTokens(sakuraMist) },
  },
  {
    id: 'sunset-flow',
    name: 'Sunset Flow',
    description: 'Deep purple and coral with slow golden halos.',
    tag: 'Warm',
    palette: sunsetFlow,
    definition: { id: 'sunset-flow', colorScheme: 'dark', tokens: buildThemeTokens(sunsetFlow) },
  },
  {
    id: 'obsidian-gold',
    name: 'Obsidian Gold',
    description: 'Obsidian, charcoal and low-saturation gold.',
    tag: 'Premium',
    palette: obsidianGold,
    definition: { id: 'obsidian-gold', colorScheme: 'dark', tokens: buildThemeTokens(obsidianGold) },
  },
];

export const THEMES: readonly DesktopTheme[] = DEFINITIONS;

export function getTheme(id: string): DesktopTheme | undefined {
  return THEMES.find((theme) => theme.id === id);
}

export function isBuiltinTheme(id: string): boolean {
  return THEMES.some((theme) => theme.id === id);
}

/** Resolve the palette for a theme id (built-in or custom). */
export function resolvePalette(id: string, customThemes: readonly CustomThemeConfig[] = []): ThemePalette | undefined {
  const builtin = getTheme(id);
  if (builtin !== undefined) return builtin.palette;
  const custom = customThemes.find((t) => t.id === id);
  if (custom !== undefined) {
    const base = getTheme(custom.base)?.palette ?? quantumBlue;
    return paletteFromCustomColors(custom.colors, base);
  }
  return undefined;
}

/** Build a DSH theme definition for a custom theme. */
export function buildCustomThemeDefinition(theme: CustomThemeConfig): DshThemeDefinition {
  const base = getTheme(theme.base)?.palette ?? quantumBlue;
  const palette = paletteFromCustomColors(theme.colors, base);
  return { id: theme.id, colorScheme: palette.colorScheme, tokens: buildThemeTokens(palette) };
}

/** Palette lookup for transparency derivation, including built-in pair. */
export function bgBaseForTheme(id: string, customThemes: readonly CustomThemeConfig[] = []): string {
  const palette = resolvePalette(id, customThemes);
  if (palette !== undefined) return palette.bgBase;
  return id === 'light' ? '#ffffff' : '#151517';
}
