import { describe, expect, it } from "vitest";

import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_STYLE,
  findFontFace,
  findGlyph,
  getFontFaces,
  getFontFamilyOptions,
  getFontSizes,
  glyphPixelOn,
  lineAtCaret,
  measureTextHeight,
  measureTextWidth,
  normalizeFontStyle,
  normalizeTextNewlines,
} from "@entities/font/fontLibrary";

describe("font library defaults", () => {
  it("exposes default family/style/size constants", () => {
    expect(DEFAULT_FONT_FAMILY).toBe("BDF");
    expect(DEFAULT_FONT_SIZE).toBeGreaterThan(0);
    expect(DEFAULT_FONT_STYLE).toBe("regular");
  });

  it("getFontFaces returns a non-empty list with required fields", () => {
    const faces = getFontFaces();
    expect(faces.length).toBeGreaterThan(0);
    for (const face of faces) {
      expect(face.id).toBeTruthy();
      expect(face.family).toBeTruthy();
      expect(face.lineHeight).toBeGreaterThan(0);
    }
  });

  it("getFontFamilyOptions groups faces by family with sorted sizes", () => {
    const opts = getFontFamilyOptions();
    expect(opts.length).toBeGreaterThan(0);
    for (const opt of opts) {
      expect(opt.styles.length).toBeGreaterThan(0);
      const sorted = [...opt.sizes].sort((a, b) => a - b);
      expect(opt.sizes).toEqual(sorted);
    }
  });

  it("getFontSizes returns sorted unique sizes for a family", () => {
    const sizes = getFontSizes(DEFAULT_FONT_FAMILY, DEFAULT_FONT_STYLE);
    expect(new Set(sizes).size).toBe(sizes.length);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
  });
});

describe("normalizeFontStyle", () => {
  it("returns regular for unknown/missing", () => {
    expect(normalizeFontStyle(undefined)).toBe("regular");
    expect(normalizeFontStyle("xyz")).toBe("regular");
  });

  it("passes through known canonical styles", () => {
    expect(normalizeFontStyle("bold")).toBe("bold");
    expect(normalizeFontStyle("oblique")).toBe("oblique");
    expect(normalizeFontStyle("boldOblique")).toBe("boldOblique");
  });

  it("maps italic aliases to oblique forms", () => {
    expect(normalizeFontStyle("italic")).toBe("oblique");
    expect(normalizeFontStyle("bold-italic")).toBe("boldOblique");
    expect(normalizeFontStyle("boldItalic")).toBe("boldOblique");
    expect(normalizeFontStyle("bold-oblique")).toBe("boldOblique");
  });
});

describe("findFontFace", () => {
  it("returns a face for the default family", () => {
    const face = findFontFace({ fontFamily: "BDF" });
    expect(face).toBeDefined();
    expect(face.family).toBe("BDF");
  });

  it("falls back gracefully when family is unknown", () => {
    const face = findFontFace({ fontFamily: "Imaginary" });
    expect(face).toBeDefined();
    expect(face.lineHeight).toBeGreaterThan(0);
  });

  it("returns face matching exact font id when given", () => {
    const someId = getFontFaces()[0].id;
    expect(findFontFace({ fontFace: someId }).id).toBe(someId);
  });

  it("returns the size closest to the requested when no exact match", () => {
    const family = "BDF";
    const sizes = getFontSizes(family, "regular");
    const target = (sizes[0] ?? 7) + 1000;
    const face = findFontFace({ fontFamily: family, fontStyle: "regular", fontSize: target });
    expect(face.family).toBe(family);
  });
});

describe("measureTextWidth & glyph lookups", () => {
  it("measureTextWidth returns >= 0 for any text", () => {
    const face = findFontFace({ fontFamily: "BDF" });
    expect(measureTextWidth(face, "")).toBe(0);
    expect(measureTextWidth(face, "Hello")).toBeGreaterThan(0);
  });

  it("findGlyph returns either an entry or undefined", () => {
    const face = findFontFace({ fontFamily: "BDF" });
    const a = findGlyph(face, "A".codePointAt(0)!);
    if (a) {
      expect(a.advance).toBeGreaterThan(0);
      expect(glyphPixelOn(face, a, -1, -1)).toBe(false);
      expect(glyphPixelOn(face, a, a.width + 5, a.height + 5)).toBe(false);
    }
  });

  it("Org_01 digits share a common tabular advance with right-aligned 1", () => {
    const face = findFontFace({ fontFamily: "Org_01", fontSize: 7 });
    const digits = [..."0123456789"].map((ch) => findGlyph(face, ch.codePointAt(0)!)!);
    const advances = new Set(digits.map((glyph) => glyph.advance));
    expect(advances.size).toBe(1);

    const one = digits[1]!;
    const zero = digits[0]!;
    expect(one.advance).toBe(zero.advance);
    expect(one.xOffset).toBe(zero.width - one.width);
    expect(measureTextWidth(face, "00011")).toBe(measureTextWidth(face, "00000"));
  });

  it("Org_01 keeps tabular digits at a scaled size", () => {
    const sizes = getFontSizes("Org_01", "regular");
    expect(sizes).toContain(7);
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(20);

    const face = findFontFace({ fontFamily: "Org_01", fontSize: Math.max(...sizes) });
    const digits = [..."0123456789"].map((ch) => findGlyph(face, ch.codePointAt(0)!)!);
    expect(new Set(digits.map((glyph) => glyph.advance)).size).toBe(1);
    expect(measureTextWidth(face, "00011")).toBe(measureTextWidth(face, "00000"));
  });

  it("measures multiline text by the longest line and stacked line height", () => {
    const face = findFontFace({ fontFamily: "BDF" });
    expect(normalizeTextNewlines("Hi\r\nThere")).toBe("Hi\nThere");
    expect(measureTextWidth(face, "Hi\nThere")).toBe(measureTextWidth(face, "There"));
    expect(measureTextHeight(face, "Hi\nThere")).toBe(face.lineHeight * 2);
    expect(lineAtCaret("Hi\nThere", 4)).toEqual({ line: "There", lineIndex: 1, offset: 1 });
  });
});
