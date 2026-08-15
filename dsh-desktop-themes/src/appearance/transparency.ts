/**
 * Semi-transparent surface layer.
 *
 * Transparency is applied through the DSH `theme.overrideTokens` API (the
 * official, reversible token-layer mechanism): the product surfaces consume
 * `--dsw-alias-bg-*` tokens, so overriding those tokens with `rgba()` values
 * lets an injected wallpaper show through without touching product DOM. The
 * presenter recomputes the layer on every theme/appearance change and disposes
 * it when transparency is off, so it can never click-through, break dragging,
 * or leave the input area unusable (only background colors change).
 */

import type { AppearanceConfig } from '../config/types.ts';
import { rgba } from '../utils/color.ts';
import { getTheme } from '../themes/index.ts';

export interface SurfaceColors {
  base: string;
  layer1: string;
  layer2: string;
  layer3: string;
  overlay: string;
  sidebar: string;
}

/** Built-in light/dark surface colors, read from design-platform.css. */
const BUILTIN_DARK: SurfaceColors = {
  base: '#151517',
  layer1: '#232324',
  layer2: '#2c2c2e',
  layer3: '#353638',
  overlay: '#61666b',
  sidebar: '#1b1b1c',
};

const BUILTIN_LIGHT: SurfaceColors = {
  base: '#ffffff',
  layer1: '#ffffff',
  layer2: '#ffffff',
  layer3: '#ffffff',
  overlay: '#e9ecef',
  sidebar: '#fafafa',
};

/** Resolve the surface colors for a theme id (my themes + built-in pair). */
export function surfaceColorsFor(themeId: string): SurfaceColors {
  switch (themeId) {
    case 'light':
      return BUILTIN_LIGHT;
    case 'dark':
    case 'system':
      return BUILTIN_DARK;
    default: {
      const theme = getTheme(themeId);
      if (theme !== undefined) {
        return {
          base: theme.palette.bgBase,
          layer1: theme.palette.bgSurface,
          layer2: theme.palette.bgSurface2,
          layer3: theme.palette.bgSurface3,
          overlay: theme.palette.bgOverlay,
          sidebar: theme.palette.sidebarFill,
        };
      }
      return BUILTIN_DARK;
    }
  }
}

/** Which tokens participate in transparency, and the opacity they obey. */
const TOKEN_OPACITY: ReadonlyArray<{ token: string; pick: (c: SurfaceColors) => string; opacity: (a: AppearanceConfig) => number }> = [
  { token: '--dsw-alias-bg-base', pick: (c) => c.base, opacity: (a) => a.windowOpacity },
  { token: '--dsw-alias-bg-layer-1', pick: (c) => c.layer1, opacity: (a) => a.panelOpacity },
  { token: '--dsw-alias-bg-layer-2', pick: (c) => c.layer2, opacity: (a) => a.panelOpacity },
  { token: '--dsw-alias-bg-layer-3', pick: (c) => c.layer3, opacity: (a) => a.panelOpacity },
  { token: '--dsw-alias-bg-overlay', pick: (c) => c.overlay, opacity: (a) => a.panelOpacity },
  { token: '--dsw-alias-bg-module-platform', pick: (c) => c.layer3, opacity: (a) => a.panelOpacity },
  { token: '--dsw-alias-bg-multi-select', pick: (c) => c.layer2, opacity: (a) => a.panelOpacity },
  { token: '--dsw-specific-sidebar-fill', pick: (c) => c.sidebar, opacity: (a) => a.sidebarOpacity },
  { token: '--dsw-specific-input-major', pick: (c) => c.layer2, opacity: (a) => a.inputOpacity },
  { token: '--dsw-specific-menu', pick: (c) => c.layer3, opacity: (a) => a.panelOpacity },
];

/**
 * Build the `{ light, dark }` override layer for the given theme + appearance.
 * When a wallpaper is active, the base background is made fully transparent so
 * the wallpaper layer (painted on `body::before`) shows through the app's base
 * surface; the raised panels keep their configured opacity.
 */
export function buildTransparencyOverrides(
  appearance: AppearanceConfig,
  themeId: string,
  wallpaperEnabled: boolean,
): Record<string, { light: string; dark: string }> {
  const colors = surfaceColorsFor(themeId);
  const overrides: Record<string, { light: string; dark: string }> = {};
  for (const entry of TOKEN_OPACITY) {
    const opacity = wallpaperEnabled && entry.token === '--dsw-alias-bg-base' ? 0 : entry.opacity(appearance);
    const color = rgba(entry.pick(colors), opacity);
    overrides[entry.token] = { light: color, dark: color };
  }
  return overrides;
}

export function isTransparencyActive(appearance: AppearanceConfig): boolean {
  return appearance.transparencyEnabled;
}
