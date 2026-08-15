/**
 * Desktop-theme registry: the three built-in themes and the DSH `theme`
 * service registration definitions derived from them.
 */

import type { ThemeId } from '../config/types.ts';
import { blackGold } from './black-gold.ts';
import { catppuccinMocha } from './catppuccin-mocha.ts';
import { buildThemeTokens, type ThemePalette } from './palette.ts';
import { tokyoNight } from './tokyo-night.ts';

/** Registration shape consumed by the DSH `theme` service (`register`). */
export interface DshThemeDefinition {
  id: ThemeId;
  colorScheme: 'dark';
  tokens: Record<string, string>;
}

export interface DesktopTheme {
  id: ThemeId;
  /** Human-readable display name. */
  name: string;
  /** One-line description shown in the settings UI. */
  description: string;
  /** Core palette (used for transparency derivation + display swatches). */
  palette: ThemePalette;
  /** Ready-to-register DSH theme definition. */
  definition: DshThemeDefinition;
}

const DEFINITIONS: DesktopTheme[] = [
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Calm blue-violet dark theme tuned for long sessions.',
    palette: tokyoNight,
    definition: { id: 'tokyo-night', colorScheme: 'dark', tokens: buildThemeTokens(tokyoNight) },
  },
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    description: 'Warm, pastel-heavy dark theme.',
    palette: catppuccinMocha,
    definition: { id: 'catppuccin-mocha', colorScheme: 'dark', tokens: buildThemeTokens(catppuccinMocha) },
  },
  {
    id: 'black-gold',
    name: 'Black & Gold',
    description: 'Restrained charcoal and warm-gold theme.',
    palette: blackGold,
    definition: { id: 'black-gold', colorScheme: 'dark', tokens: buildThemeTokens(blackGold) },
  },
];

export const THEMES: readonly DesktopTheme[] = DEFINITIONS;

export function getTheme(id: string): DesktopTheme | undefined {
  return THEMES.find((theme) => theme.id === id);
}

export function isThemeId(value: string): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/** Palette lookup for transparency derivation, including the built-in pair. */
export function bgBaseForTheme(id: string): string {
  const theme = getTheme(id);
  if (theme !== undefined) return theme.palette.bgBase;
  // Built-in `dark` palette from design-platform.css; `light`/`system` default.
  return id === 'light' ? '#ffffff' : '#151517';
}
