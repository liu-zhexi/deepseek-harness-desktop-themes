/**
 * Small, dependency-free color helpers shared by the theme token builder and
 * the appearance (transparency / glass) presenters. All inputs are `#RRGGBB`
 * or `#RRGGBBAA` hex strings; all outputs are CSS color strings.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse `#RGB`, `#RRGGBB`, or `#RRGGBBAA` into integer channels. */
export function hexToRgb(hex: string): Rgb {
  let value = hex.trim();
  if (value.startsWith('#')) value = value.slice(1);
  if (value.length === 3) {
    value = value
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(value.slice(0, 6), 16);
  if (Number.isNaN(int)) return { r: 0, g: 0, b: 0 };
  return {
    r: (int >> 16) & 0xff,
    g: (int >> 8) & 0xff,
    b: int & 0xff,
  };
}

/** Build an `rgba(r, g, b, a)` string from a hex color and an alpha (0..1). */
export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Mix `from` toward `to` by `weight` (0..1, 0 = from, 1 = to) and return a
 * `#RRGGBB` string. Used to derive hover / dimmed shades without hand-tuning.
 */
export function mixHex(from: string, to: string, weight: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const w = Math.min(1, Math.max(0, weight));
  const channel = (x: number, y: number) => Math.round(x + (y - x) * w);
  return `#${[channel(a.r, b.r), channel(a.g, b.g), channel(a.b, b.b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Relative luminance (0..1) of a hex color, per WCAG 2.x. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two hex colors (1..21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
