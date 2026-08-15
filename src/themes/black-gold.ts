import type { ThemePalette } from './palette.ts';

/**
 * Black & Gold — restrained, low-saturation charcoal/warm-gold theme. Avoids
 * large neon-yellow areas: the gold is used as a quiet accent, not a wash.
 */
export const blackGold: ThemePalette = {
  id: 'black-gold',
  bgBase: '#090909',
  bgSurface: '#181612',
  bgSurface2: '#11100E',
  bgSurface3: '#1F1C16',
  bgOverlay: '#11100E',
  textPrimary: '#F3EBDD',
  textSecondary: '#B9AD98',
  textMuted: '#7A7060',
  accent: '#D5AF55',
  accentHover: '#E4C46D',
  accentForeground: '#090909',
  success: '#86B97B',
  warning: '#D8A94E',
  danger: '#D46A64',
  codeBlock: '#11100E',
  inlineCode: '#181612',
  sidebarFill: '#0E0D0B',
};
