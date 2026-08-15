/**
 * Host-side schemastery schema for the `ui-desktop-themes` settings namespace.
 *
 * This schema is registered on the Host and serialized over the wire; the
 * Client settings scope validates incoming sections against that serialized
 * schema, so it is the authoritative durable shape. It mirrors the defaults
 * in `defaults.ts` exactly (a resolved empty section must equal the defaults).
 *
 * Only imported by the Host entry and tests — it must never be bundled into
 * the Client (the Client re-validates against the wire schema automatically).
 */
import z from '@deepseek-ai/schemastery';

const fontSchema = z.object({
  uiFamily: z.string().default('Inter'),
  codeFamily: z.string().default('JetBrains Mono'),
  chineseFamily: z.string().default('LXGW WenKai'),
  fontSize: z.number().min(10).max(24).step(1).default(14),
  codeFontSize: z.number().min(9).max(24).step(1).default(13),
  lineHeight: z.number().min(1).max(2.5).step(0.05).default(1.6),
  fontWeight: z.number().min(100).max(900).step(100).default(400),
  ligatures: z.boolean().default(true),
  smoothing: z.boolean().default(true),
});

const appearanceSchema = z.object({
  transparencyEnabled: z.boolean().default(true),
  windowOpacity: z.number().min(0.55).max(1).step(0.01).default(0.92),
  sidebarOpacity: z.number().min(0.55).max(1).step(0.01).default(0.78),
  panelOpacity: z.number().min(0.55).max(1).step(0.01).default(0.84),
  inputOpacity: z.number().min(0.55).max(1).step(0.01).default(0.86),
  animationsEnabled: z.boolean().default(true),
});

const wallpaperSchema = z.object({
  enabled: z.boolean().default(false),
  path: z.string().default(''),
  fit: z.union(['cover', 'contain', 'stretch', 'center', 'tile']).default('cover'),
  positionX: z.number().min(0).max(100).step(1).default(50),
  positionY: z.number().min(0).max(100).step(1).default(50),
  scale: z.number().min(0.5).max(3).step(0.05).default(1),
  opacity: z.number().min(0).max(1).step(0.01).default(0.7),
  blur: z.number().min(0).max(50).step(1).default(4),
  overlay: z.number().min(0).max(1).step(0.01).default(0.45),
  saturation: z.number().min(0).max(2).step(0.05).default(1),
  brightness: z.number().min(0.5).max(1.5).step(0.05).default(1),
});

const glassSchema = z.object({
  enabled: z.boolean().default(true),
  strength: z.number().min(0).max(40).step(1).default(16),
  saturation: z.number().min(0.5).max(2).step(0.05).default(1.1),
  panelOpacity: z.number().min(0).max(1).step(0.01).default(0.84),
  borderHighlight: z.number().min(0).max(1).step(0.01).default(0.5),
  shadow: z.number().min(0).max(1).step(0.01).default(0.3),
  performanceMode: z.union(['off', 'light', 'standard', 'strong', 'custom', 'balanced']).default('balanced'),
});

export const DesktopThemesSchema = z.object({
  theme: z.union(['tokyo-night', 'catppuccin-mocha', 'black-gold']).default('tokyo-night'),
  font: fontSchema,
  appearance: appearanceSchema,
  wallpaper: wallpaperSchema,
  glass: glassSchema,
});

export type DesktopThemesSchemaType = ReturnType<typeof DesktopThemesSchema>;
