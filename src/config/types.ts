/**
 * Shared configuration types for DeepSeek Harness Desktop Themes.
 *
 * These types are platform-agnostic: they are imported by the Host entry
 * (schema registration) and the Client entry (presenter + settings UI), and
 * they are the single source of truth for the persisted settings shape.
 */

/** Identifier of one of the three built-in desktop themes. */
export type ThemeId = 'tokyo-night' | 'catppuccin-mocha' | 'black-gold';

/** Wallpaper background fit modes. */
export type WallpaperFit = 'cover' | 'contain' | 'stretch' | 'center' | 'tile';

/** Glassmorphism performance tier. */
export type GlassPerformanceMode = 'off' | 'light' | 'standard' | 'strong' | 'custom' | 'balanced';

export interface FontConfig {
  /** UI font family (Latin-first fallback stack). */
  uiFamily: string;
  /** Code / monospace font family. */
  codeFamily: string;
  /** Chinese UI font family (appended to the UI stack). */
  chineseFamily: string;
  /** Base UI font size in px. */
  fontSize: number;
  /** Code font size in px. */
  codeFontSize: number;
  /** Base line height (unitless multiplier). */
  lineHeight: number;
  /** Base font weight (100..900). */
  fontWeight: number;
  /** Whether font ligatures are enabled for the code font. */
  ligatures: boolean;
  /** Whether font smoothing (antialiasing) is enabled. */
  smoothing: boolean;
}

export interface AppearanceConfig {
  /** Master switch for the semi-transparent surface layer. */
  transparencyEnabled: boolean;
  /** App base background opacity (0.55..1.00). */
  windowOpacity: number;
  /** Sidebar background opacity (0.55..1.00). */
  sidebarOpacity: number;
  /** Content panel background opacity (0.55..1.00). */
  panelOpacity: number;
  /** Input area background opacity (0.55..1.00). */
  inputOpacity: number;
  /** Whether theme transitions / hover animations are enabled. */
  animationsEnabled: boolean;
}

export interface WallpaperConfig {
  /** Master switch for the custom wallpaper layer. */
  enabled: boolean;
  /**
   * Wallpaper source. Prefers a `file:` URL produced by the picker; a raw
   * absolute path is normalized to `file:` on the Host side. Empty disables.
   */
  path: string;
  /** Background fit mode. */
  fit: WallpaperFit;
  /** Horizontal anchor 0..100 (percent). */
  positionX: number;
  /** Vertical anchor 0..100 (percent). */
  positionY: number;
  /** Zoom factor (0.5..3.0, 1 = native). */
  scale: number;
  /** Wallpaper opacity (0..1). */
  opacity: number;
  /** Wallpaper blur radius in px (0..50). */
  blur: number;
  /** Dark overlay strength over the wallpaper (0..1). */
  overlay: number;
  /** Saturation adjustment (0..2, 1 = none). */
  saturation: number;
  /** Brightness adjustment (0.5..1.5, 1 = none). */
  brightness: number;
}

export interface GlassConfig {
  /** Master switch for glassmorphism. */
  enabled: boolean;
  /** Backdrop blur radius in px (0..40). */
  strength: number;
  /** Backdrop saturation (0.5..2.0, 1 = none). */
  saturation: number;
  /** Panel fill opacity for the glass surface (0..1). */
  panelOpacity: number;
  /** Border highlight strength (0..1). */
  borderHighlight: number;
  /** Soft shadow strength (0..1). */
  shadow: number;
  /** Performance tier; `off` disables blur and shadows entirely. */
  performanceMode: GlassPerformanceMode;
}

export interface DesktopThemesConfig {
  /** Selected theme id. */
  theme: ThemeId;
  font: FontConfig;
  appearance: AppearanceConfig;
  wallpaper: WallpaperConfig;
  glass: GlassConfig;
}

/** The settings namespace this plugin owns on the Host. */
export const SETTINGS_NAMESPACE = 'ui-desktop-themes';

/** Top-level fields of the persisted settings section (one write each). */
export type SettingsField = keyof DesktopThemesConfig;

/**
 * Exported JSON envelope: the `schemaVersion` field lives here for import
 * migration but is intentionally NOT part of the persisted settings section,
 * which already carries its own namespace revisioning.
 */
export interface ExportedConfig {
  schemaVersion: number;
  config: DesktopThemesConfig;
}

/** Current export schema version. */
export const SCHEMA_VERSION = 1;
