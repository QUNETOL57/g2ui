import { describe, expect, it } from "vitest";

import {
  hexToHsv,
  hsvToHex,
  hsvToRgb,
  parseHexRgb,
  rgbToHex,
  rgbToHsv,
} from "@shared/lib/colorModel";

describe("colorModel", () => {
  it("parses and formats hex", () => {
    expect(parseHexRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    expect(parseHexRgb("00ff00")).toEqual({ r: 0, g: 255, b: 0 });
    expect(parseHexRgb("bad")).toBeNull();
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#FF0000");
  });

  it("round-trips primary colors through hsv", () => {
    for (const hex of ["#FF0000", "#00FF00", "#0000FF", "#FFFFFF", "#000000"]) {
      const hsv = hexToHsv(hex);
      expect(hsv).not.toBeNull();
      expect(hsvToHex(hsv!)).toBe(hex);
    }
  });

  it("preserves hue when converting near-white hex", () => {
    const hsv = hexToHsv("#FFFFFF", 160);
    expect(hsv).toEqual({ h: 160, s: 0, v: 1 });
  });

  it("preserves hue for near-gray colors", () => {
    const hsv = hexToHsv("#F2F2F2", 40);
    expect(hsv?.h).toBe(40);
    expect(hsv!.s).toBeLessThan(0.01);
  });

  it("converts mid gray", () => {
    const hsv = rgbToHsv({ r: 128, g: 128, b: 128 });
    expect(hsv.s).toBeCloseTo(0, 5);
    expect(hsv.v).toBeCloseTo(128 / 255, 5);
  });

  it("maps full-sat hues to expected primaries", () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#FF0000");
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00FF00");
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe("#0000FF");
  });

  it("round-trips rgb through hsv for mixed colors", () => {
    const rgb = { r: 90, g: 229, b: 187 };
    const back = hsvToRgb(rgbToHsv(rgb));
    expect(Math.round(back.r)).toBe(90);
    expect(Math.round(back.g)).toBe(229);
    expect(Math.round(back.b)).toBe(187);
  });
});
