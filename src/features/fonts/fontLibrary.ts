import { FONT_FACES } from "./generated/fontAssets";
import type { BitmapFontFace, BitmapFontStyle } from "./fontTypes";

export const DEFAULT_FONT_FAMILY = "BDF";
export const DEFAULT_FONT_SIZE = 7;
export const DEFAULT_FONT_STYLE: BitmapFontStyle = "regular";

export interface FontFamilyOption {
  family: string;
  styles: BitmapFontStyle[];
  sizes: number[];
}

export function getFontFaces(): BitmapFontFace[] {
  return FONT_FACES;
}

export function getFontFamilyOptions(): FontFamilyOption[] {
  const byFamily = new Map<string, { styles: Set<BitmapFontStyle>; sizes: Set<number> }>();
  for (const face of FONT_FACES) {
    const entry = byFamily.get(face.family) ?? { styles: new Set(), sizes: new Set() };
    entry.styles.add(face.style);
    entry.sizes.add(face.size);
    byFamily.set(face.family, entry);
  }
  return [...byFamily.entries()]
    .map(([family, entry]) => ({
      family,
      styles: [...entry.styles].sort(),
      sizes: [...entry.sizes].sort((a, b) => a - b),
    }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

export function getFontSizes(family: string, style?: BitmapFontStyle | string): number[] {
  const normalized = normalizeFontStyle(style);
  const exact = FONT_FACES
    .filter((face) => face.family === family && face.style === normalized)
    .map((face) => face.size);
  const sizes = exact.length > 0 ? exact : FONT_FACES.filter((face) => face.family === family).map((face) => face.size);
  return [...new Set(sizes)].sort((a, b) => a - b);
}

export function findFontFace(args: {
  fontFace?: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: BitmapFontStyle | string;
}): BitmapFontFace {
  if (args.fontFace) {
    const byId = FONT_FACES.find((face) => face.id === args.fontFace);
    if (byId) return byId;
  }

  const family = args.fontFamily ?? DEFAULT_FONT_FAMILY;
  const style = normalizeFontStyle(args.fontStyle);
  const familyFaces = FONT_FACES.filter((face) => face.family === family);
  const styleFaces = familyFaces.filter((face) => face.style === style);
  const candidates = styleFaces.length > 0 ? styleFaces : familyFaces;
  if (candidates.length > 0) {
    if (typeof args.fontSize === "number") {
      const exact = candidates.find((face) => face.size === args.fontSize);
      if (exact) return exact;
      return [...candidates].sort((a, b) => Math.abs(a.size - args.fontSize!) - Math.abs(b.size - args.fontSize!))[0];
    }
    return [...candidates].sort((a, b) => a.size - b.size)[0];
  }

  return FONT_FACES.find((face) => face.id === "default_5x7") ?? FONT_FACES[0];
}

export function normalizeFontStyle(style: BitmapFontStyle | string | undefined): BitmapFontStyle {
  if (style === "bold" || style === "oblique" || style === "boldOblique") return style;
  if (style === "italic") return "oblique";
  if (style === "bold-italic" || style === "boldItalic" || style === "bold-oblique") return "boldOblique";
  return "regular";
}

export function findGlyph(face: BitmapFontFace, codepoint: number) {
  for (const range of face.ranges) {
    if (codepoint >= range.first && codepoint <= range.last) {
      return face.glyphs[range.glyphOffset + codepoint - range.first];
    }
  }
  return undefined;
}

export function glyphPixelOn(face: BitmapFontFace, glyph: NonNullable<ReturnType<typeof findGlyph>>, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= glyph.width || y >= glyph.height) return false;
  const byteIndex = glyph.bitmapOffset + y * face.bytesPerRow + Math.floor(x / 8);
  return (face.bitmap[byteIndex] & (0x80 >> (x % 8))) !== 0;
}

export function measureTextWidth(face: BitmapFontFace, text: string): number {
  let width = 0;
  for (const char of text) {
    const glyph = findGlyph(face, char.codePointAt(0) ?? 0);
    width += glyph ? glyph.advance : Math.floor(face.lineHeight / 2);
  }
  return width;
}
