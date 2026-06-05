import { describe, expect, it } from "vitest";

import {
  createPaletteEntry,
  isValidToken,
  normalizeHex,
  normalizePalette,
  suggestPaletteToken,
} from "@entities/ui-project/lib/palette";

describe("palette utils", () => {
  describe("normalizeHex", () => {
    it("normalizes valid hex values", () => {
      expect(normalizeHex("#ff00aa")).toBe("#FF00AA");
      expect(normalizeHex("ff00aa")).toBe("#FF00AA");
      expect(normalizeHex("  #aabbcc  ")).toBe("#AABBCC");
    });

    it("rejects invalid hex values", () => {
      expect(normalizeHex("bad")).toBeNull();
      expect(normalizeHex("#fff")).toBeNull();
      expect(normalizeHex("")).toBeNull();
    });
  });

  describe("isValidToken", () => {
    it("accepts valid token names", () => {
      expect(isValidToken("bg")).toBe(true);
      expect(isValidToken("accent_2")).toBe(true);
      expect(isValidToken("Color1")).toBe(true);
    });

    it("rejects invalid token names", () => {
      expect(isValidToken("")).toBe(false);
      expect(isValidToken("  ")).toBe(false);
      expect(isValidToken("1bg")).toBe(false);
      expect(isValidToken("bad-name")).toBe(false);
    });
  });

  describe("normalizePalette", () => {
    it("normalizes and trims valid entries", () => {
      const result = normalizePalette([
        { token: " bg ", hex: "ff00aa" },
        { token: "fg", hex: "#ffffff" },
      ]);
      expect(result).toEqual({
        ok: true,
        entries: [
          { token: "bg", hex: "#FF00AA" },
          { token: "fg", hex: "#FFFFFF" },
        ],
      });
    });

    it("rejects duplicate tokens case-insensitively", () => {
      const result = normalizePalette([
        { token: "bg", hex: "#000000" },
        { token: "BG", hex: "#111111" },
      ]);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Duplicate token/i);
    });

    it("rejects invalid token names", () => {
      const result = normalizePalette([{ token: "1bad", hex: "#000000" }]);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Invalid token name/i);
    });

    it("rejects invalid hex colors", () => {
      const result = normalizePalette([{ token: "bg", hex: "nope" }]);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/Invalid hex color/i);
    });

    it("accepts an empty palette", () => {
      expect(normalizePalette([])).toEqual({ ok: true, entries: [] });
    });
  });

  describe("suggestPaletteToken", () => {
    it("starts from color_1 when unused", () => {
      expect(suggestPaletteToken([{ token: "bg", hex: "#000000" }])).toBe("color_1");
    });

    it("suggests the next unused color_N token", () => {
      expect(
        suggestPaletteToken([
          { token: "bg", hex: "#000000" },
          { token: "color_1", hex: "#111111" },
        ]),
      ).toBe("color_2");
    });
  });

  describe("createPaletteEntry", () => {
    it("creates a new palette entry with normalized hex", () => {
      const entry = createPaletteEntry([{ token: "bg", hex: "#000000" }], "abcdef");
      expect(entry).toEqual({ token: "color_1", hex: "#ABCDEF" });
    });

    it("falls back to white when hex is invalid", () => {
      const entry = createPaletteEntry([], "bad");
      expect(entry).toEqual({ token: "color_1", hex: "#FFFFFF" });
    });
  });
});
