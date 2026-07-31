/** Hex ↔ RGB ↔ HSV helpers for the hex-only color picker. */

export type Rgb = { r: number; g: number; b: number };
export type Hsv = { h: number; s: number; v: number };

const NEAR_ZERO_SATURATION = 1e-3;

export function parseHexRgb(hex: string): Rgb | null {
  const trimmed = hex.trim();
  const match = /^#?([0-9A-Fa-f]{6})$/.exec(trimmed);
  if (!match) return null;
  const value = match[1]!;
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h < 60) [rn, gn, bn] = [c, x, 0];
  else if (h < 120) [rn, gn, bn] = [x, c, 0];
  else if (h < 180) [rn, gn, bn] = [0, c, x];
  else if (h < 240) [rn, gn, bn] = [0, x, c];
  else if (h < 300) [rn, gn, bn] = [x, 0, c];
  else [rn, gn, bn] = [c, 0, x];

  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
}

/**
 * Convert hex to HSV. When saturation is ~0 (white/gray), hue is undefined in
 * RGB space — pass `preserveHue` so the picker does not snap the hue slider.
 */
export function hexToHsv(hex: string, preserveHue?: number): Hsv | null {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const hsv = rgbToHsv(rgb);
  if (hsv.s < NEAR_ZERO_SATURATION && preserveHue !== undefined) {
    return { ...hsv, h: preserveHue };
  }
  return hsv;
}

export function hsvToHex(hsv: Hsv): string {
  return rgbToHex(hsvToRgb(hsv));
}
