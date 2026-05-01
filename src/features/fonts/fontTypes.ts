export type BitmapFontStyle = "regular" | "bold" | "oblique" | "boldOblique";

export interface BitmapGlyph {
  codepoint: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  advance: number;
  bitmapOffset: number;
}

export interface BitmapFontRange {
  first: number;
  last: number;
  glyphOffset: number;
}

export interface BitmapFontFace {
  id: string;
  family: string;
  size: number;
  style: BitmapFontStyle;
  lineHeight: number;
  baseline: number;
  bytesPerRow: number;
  bitmap: number[];
  glyphs: BitmapGlyph[];
  ranges: BitmapFontRange[];
}
