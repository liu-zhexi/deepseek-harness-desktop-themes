/**
 * Theme palette → `--dsw-alias-*` token mapping.
 *
 * DeepSeek Harness themes are expressed as overrides on the semantic alias
 * token layer (see `design-platform.css`). Each theme supplies a compact
 * `ThemePalette` (a handful of core colors); `buildThemeTokens` derives the
 * full alias-token dictionary so the three themes never repeat hard-coded
 * values and every surface — background, text, accent, borders, states, code,
 * sidebar, scrollbars, buttons — stays consistent from one place.
 */

import type { ThemeId } from '../config/types.ts';
import { mixHex, rgba } from '../utils/color.ts';

export interface ThemePalette {
  id: ThemeId;
  /** Application base background. */
  bgBase: string;
  /** Raised surface (layer-1) background — panels. */
  bgSurface: string;
  /** Nested surface (layer-2) background — secondary panels. */
  bgSurface2: string;
  /** Deepest raised surface (layer-3) — menus, tooltips. */
  bgSurface3: string;
  /** Overlay / popover background. */
  bgOverlay: string;
  /** Primary text. */
  textPrimary: string;
  /** Secondary text. */
  textSecondary: string;
  /** Muted / tertiary text. */
  textMuted: string;
  /** Accent color. */
  accent: string;
  /** Accent hover color. */
  accentHover: string;
  /** Foreground (text) color placed on top of the accent. */
  accentForeground: string;
  /** Success state color. */
  success: string;
  /** Warning state color. */
  warning: string;
  /** Danger / error state color. */
  danger: string;
  /** Markdown code block background. */
  codeBlock: string;
  /** Inline code background. */
  inlineCode: string;
  /** Sidebar column fill. */
  sidebarFill: string;
}

/**
 * Emit the full dark-palette alias token dictionary for a palette. Values are
 * plain CSS color strings (the theme `register()` API takes `{ light, dark }`
 * pairs; a dark theme repeats the same value for both so it never goes
 * illegible when the OS scheme flips).
 */
export function buildThemeTokens(p: ThemePalette): Record<string, string> {
  const tokens: Record<string, string> = {
    // Backgrounds.
    '--dsw-alias-bg-base': p.bgBase,
    '--dsw-alias-bg-layer-1': p.bgSurface,
    '--dsw-alias-bg-layer-2': p.bgSurface2,
    '--dsw-alias-bg-layer-3': p.bgSurface3,
    '--dsw-alias-bg-overlay': p.bgOverlay,
    '--dsw-alias-bg-module-platform': p.bgSurface3,
    '--dsw-alias-bg-multi-select': p.bgSurface2,
    '--dsw-alias-bg-skeleton': rgba(p.textPrimary, 0.08),
    '--dsw-alias-bg-mask-1': rgba('#000000', 0.5),
    '--dsw-alias-bg-mask-2': rgba('#000000', 0.2),
    '--dsw-alias-bg-mask-3': rgba('#000000', 0.48),
    '--dsw-alias-bg-mask-photo': rgba('#000000', 0.88),
    '--dsw-alias-bg-mask-drop': rgba('#000000', 0.7),

    // Borders.
    '--dsw-alias-border-l1': rgba(p.textPrimary, 0.06),
    '--dsw-alias-border-l2': rgba(p.textPrimary, 0.12),
    '--dsw-alias-border-l2-darkmode-thin': rgba(p.textPrimary, 0.06),
    '--dsw-alias-border-l3': rgba(p.textPrimary, 0.16),
    '--dsw-alias-border-l4': rgba(p.textPrimary, 0.2),
    '--dsw-alias-border-inverted': rgba('#ffffff', 0.06),
    '--dsw-alias-border-inverted2': rgba('#ffffff', 0.08),

    // Brand / accent.
    '--dsw-alias-brand-primary': p.accent,
    '--dsw-alias-brand-primary-invert': p.accentForeground,
    '--dsw-alias-brand-primary-new-colorprimary-new-color': p.accent,
    '--dsw-alias-brand-text': p.accent,

    // Text.
    '--dsw-alias-label-primary': p.textPrimary,
    '--dsw-alias-label-secondary': p.textSecondary,
    '--dsw-alias-label-tertiary': p.textMuted,
    '--dsw-alias-label-caption': p.textMuted,
    '--dsw-alias-label-dimmed': mixHex(p.textPrimary, p.bgBase, 0.5),
    '--dsw-alias-label-primary-bluish': p.textPrimary,
    '--dsw-alias-label-primary-dimmed': p.textSecondary,
    '--dsw-alias-label-primary-foreground': p.accentForeground,
    '--dsw-alias-label-primary-inverted': p.textPrimary,

    // Interactive surfaces.
    '--dsw-alias-interactive-bg-hover': rgba(p.textPrimary, 0.08),
    '--dsw-alias-interactive-bg-active': rgba('#ffffff', 0.14),
    '--dsw-alias-interactive-bg-hover-solid': p.bgSurface3,
    '--dsw-alias-interactive-bg-hover-accent': rgba(p.accent, 0.24),
    '--dsw-alias-interactive-bg-hover-danger': rgba(p.danger, 0.15),

    // Buttons.
    '--dsw-alias-button-primary-fill': p.accent,
    '--dsw-alias-button-primary-hover': p.accentHover,
    '--dsw-alias-button-primary-dimmed': p.bgSurface3,
    '--dsw-alias-button-elevated-fill': p.bgSurface3,
    '--dsw-alias-button-floating-fill': p.bgSurface2,
    '--dsw-alias-button-floating-hover': p.bgSurface3,
    '--dsw-alias-button-ghost-active-border': p.textMuted,
    '--dsw-alias-button-ghost-active-fill': p.bgSurface3,
    '--dsw-alias-button-ghost-active-hover': p.bgSurface2,
    '--dsw-alias-button-contrast-fill': p.textPrimary,
    '--dsw-alias-button-info-fill': p.accent,
    '--dsw-alias-button-info-hover': p.accentHover,
    '--dsw-alias-button-tool-bar-fill': rgba('#545557', 0.5),
    '--dsw-alias-button-tool-bar-fill-invisible': rgba('#1f1f1f', 0.36),
    '--dsw-alias-button-tool-bar-hover': rgba('#545557', 0.6),

    // Markdown / code.
    '--dsw-alias-markdown-code-block': p.codeBlock,
    '--dsw-alias-markdown-code-block-banner': p.bgSurface3,
    '--dsw-alias-markdown-inline-code': p.inlineCode,
    '--dsw-alias-markdown-code-segment-selected': p.bgSurface3,
    '--dsw-alias-markdown-code-segment-unselected': p.codeBlock,
    '--dsw-alias-markdown-citation': p.inlineCode,
    '--dsw-alias-markdown-tag': p.inlineCode,
    '--dsw-alias-markdown-placeholder': p.bgSurface2,

    // Scrollbars.
    '--dsw-alias-scrollbar-bg-l1': rgba(p.textSecondary, 0.4),
    '--dsw-alias-scrollbar-bg-l2': rgba(p.textSecondary, 0.5),
    '--dsw-alias-scrollbar-hover-l1': rgba(p.textSecondary, 0.55),
    '--dsw-alias-scrollbar-hover-l2': rgba(p.textSecondary, 0.65),

    // States.
    '--dsw-alias-state-success-primary': p.success,
    '--dsw-alias-state-success-secondary': p.success,
    '--dsw-alias-state-success-tertiary': rgba(p.success, 0.2),
    '--dsw-alias-state-warn-primary': p.warning,
    '--dsw-alias-state-warn-secondary': p.warning,
    '--dsw-alias-state-warn-tertiary': rgba(p.warning, 0.2),
    '--dsw-alias-state-warn-label': p.warning,
    '--dsw-alias-state-error-primary': p.danger,
    '--dsw-alias-state-error-secondary': p.danger,
    '--dsw-alias-state-business-primary': p.accent,
    '--dsw-alias-state-business-tertiary': rgba(p.accent, 0.2),

    // Toast / tooltip.
    '--dsw-alias-toast-bg': p.bgSurface3,
    '--dsw-alias-tooltip-bg': p.bgSurface3,

    // Specific surfaces.
    '--dsw-specific-sidebar-fill': p.sidebarFill,
    '--dsw-specific-sidebar-nav-item-active': rgba(p.textPrimary, 0.1),
    '--dsw-specific-sidebar-nav-item-active-accent': rgba(p.accent, 0.2),
    '--dsw-specific-sidebar-nav-item-hover': rgba(p.textPrimary, 0.06),
    '--dsw-specific-menu': p.bgSurface3,
    '--dsw-specific-selector': p.bgSurface3,
    '--dsw-specific-input-major': p.bgSurface2,
    '--dsw-specific-login-input': p.bgBase,
    '--dsw-specific-bubble': p.bgSurface2,
    '--dsw-specific-bubble-highlight': p.bgSurface3,
    '--dsw-specific-tip': p.bgSurface3,
  };
  return tokens;
}
