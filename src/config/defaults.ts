import type {
  AppearanceConfig,
  DesktopThemesConfig,
  FontConfig,
  GlassConfig,
  WallpaperConfig,
} from './types.ts';

/**
 * Default configuration. Every value here must round-trip through the
 * schemastery schema (see `schema.ts`) so the resolved persisted section and
 * this object stay identical when nothing is overridden.
 */

export const DEFAULT_FONT: FontConfig = {
  uiFamily: 'Inter',
  codeFamily: 'JetBrains Mono',
  chineseFamily: 'LXGW WenKai',
  fontSize: 14,
  codeFontSize: 13,
  lineHeight: 1.6,
  fontWeight: 400,
  ligatures: true,
  smoothing: true,
};

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  transparencyEnabled: true,
  windowOpacity: 0.92,
  sidebarOpacity: 0.78,
  panelOpacity: 0.84,
  inputOpacity: 0.86,
  animationsEnabled: true,
};

export const DEFAULT_WALLPAPER: WallpaperConfig = {
  enabled: false,
  path: '',
  fit: 'cover',
  positionX: 50,
  positionY: 50,
  scale: 1,
  opacity: 0.7,
  blur: 4,
  overlay: 0.45,
  saturation: 1,
  brightness: 1,
};

export const DEFAULT_GLASS: GlassConfig = {
  enabled: true,
  strength: 16,
  saturation: 1.1,
  panelOpacity: 0.84,
  borderHighlight: 0.5,
  shadow: 0.3,
  performanceMode: 'balanced',
};

export const DEFAULT_CONFIG: DesktopThemesConfig = {
  theme: 'tokyo-night',
  font: DEFAULT_FONT,
  appearance: DEFAULT_APPEARANCE,
  wallpaper: DEFAULT_WALLPAPER,
  glass: DEFAULT_GLASS,
};

/** Lower bound enforced for any opacity slider (contrast floor). */
export const MIN_OPACITY = 0.55;

/** Recommended (safe) values the "restore recommended" action reverts to. */
export const RECOMMENDED_OPACITY = {
  windowOpacity: 0.92,
  sidebarOpacity: 0.78,
  panelOpacity: 0.84,
  inputOpacity: 0.86,
} as const;

/** A deep, frozen copy of the defaults (safe to hand to callers). */
export function createDefaultConfig(): DesktopThemesConfig {
  return {
    theme: DEFAULT_CONFIG.theme,
    font: { ...DEFAULT_FONT },
    appearance: { ...DEFAULT_APPEARANCE },
    wallpaper: { ...DEFAULT_WALLPAPER },
    glass: { ...DEFAULT_GLASS },
  };
}
