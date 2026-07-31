import { describe, expect, it } from "vitest";

import { hexToHsv, hsvToHex, parseHexRgb, rgbToHex, rgbToHsv } from "@shared/lib/colorModel";

describe("colorModel", () => {
  it("parses and formats hex", () => {
    expect(parseHexRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
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

  it("converts mid gray", () => {
    const hsv = rgbToHsv({ r: 128, g: 128, b: 128 });
    expect(hsv.s).toBeCloseTo(0, 5);
    expect(hsv.v).toBeCloseTo(128 / 255, 5);
  });
});
