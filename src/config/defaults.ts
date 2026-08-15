import type {
  AppearanceConfig,
  DesktopThemesConfig,
  EffectsConfig,
  FontConfig,
  GlassConfig,
  PerformanceConfig,
  WallpaperConfig,
} from './types.ts';
import { SCHEMA_VERSION } from './types.ts';

/**
 * Default configuration. Every value here must round-trip through the
 * schemastery schema (see `schema.ts`) so the resolved persisted section and
 * this object stay identical when nothing is overridden.
 */

export const DEFAULT_FONT: FontConfig = {
  uiPreset: 'system',
  codePreset: 'jetbrains-mono',
  uiCustomFamily: '',
  codeCustomFamily: '',
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
  borderRadius: 'standard',
  contentWidth: 'standard',
  animationsEnabled: true,
};

export const DEFAULT_WALLPAPER: WallpaperConfig = {
  enabled: false,
  sourceId: '',
  path: '',
  name: '',
  fit: 'cover',
  positionX: 50,
  positionY: 50,
  scale: 1,
  opacity: 0.7,
  blur: 0,
  overlay: 0.35,
  saturation: 1,
  brightness: 1,
  tintEnabled: false,
  tintStrength: 0.35,
};

export const DEFAULT_EFFECTS: EffectsConfig = {
  enabled: true,
  preset: 'starfield',
  density: 'medium',
  particleCount: 0,
  particleSize: 2,
  particleSpeed: 1,
  particleOpacity: 0.5,
  connectLines: false,
  mouseInteraction: false,
  parallax: false,
  cursorGlow: false,
  glowIntensity: 'soft',
  animationSpeed: 'gentle',
  autoThemeColors: true,
  particleColors: [],
  glowColors: [],
};

export const DEFAULT_PERFORMANCE: PerformanceConfig = {
  level: 'balanced',
};

export const DEFAULT_GLASS: GlassConfig = {
  enabled: true,
  blurLevel: 'standard',
  strength: 0,
  saturation: 1.1,
  panelOpacity: 0.84,
  borderHighlight: 0.5,
  shadow: 0.3,
};

export const DEFAULT_CONFIG: DesktopThemesConfig = {
  schemaVersion: SCHEMA_VERSION,
  theme: 'quantum-blue',
  font: DEFAULT_FONT,
  appearance: DEFAULT_APPEARANCE,
  wallpaper: DEFAULT_WALLPAPER,
  glass: DEFAULT_GLASS,
  effects: DEFAULT_EFFECTS,
  performance: DEFAULT_PERFORMANCE,
  customThemes: [],
  recentWallpapers: [],
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
    schemaVersion: SCHEMA_VERSION,
    theme: DEFAULT_CONFIG.theme,
    font: { ...DEFAULT_FONT },
    appearance: { ...DEFAULT_APPEARANCE },
    wallpaper: { ...DEFAULT_WALLPAPER },
    glass: { ...DEFAULT_GLASS },
    effects: {
      ...DEFAULT_EFFECTS,
      particleColors: [...DEFAULT_EFFECTS.particleColors],
      glowColors: [...DEFAULT_EFFECTS.glowColors],
    },
    performance: { ...DEFAULT_PERFORMANCE },
    customThemes: [],
    recentWallpapers: [],
  };
}
