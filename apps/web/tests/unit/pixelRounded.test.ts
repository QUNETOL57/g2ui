import { describe, expect, it } from "vitest";

import {
  computeCornerInsets,
  innerFillScanline,
  roundedRowInset,
} from "@widgets/canvas-workspace/lib/pixelRounded";

describe("computeCornerInsets", () => {
  it("matches SquareLine-style reference patterns", () => {
    expect(computeCornerInsets(1)).toEqual([1]);
    expect(computeCornerInsets(3)).toEqual([2, 1, 0]);
    expect(computeCornerInsets(4)).toEqual([3, 2, 1, 0]);
    expect(computeCornerInsets(5)).toEqual([4, 2, 1, 1, 0]);
    expect(computeCornerInsets(6)).toEqual([5, 3, 2, 1, 1, 0]);
    expect(computeCornerInsets(7)).toEqual([6, 4, 3, 2, 1, 1, 0]);
    expect(computeCornerInsets(8)).toEqual([7, 5, 3, 2, 2, 1, 1, 0]);
  });

  it("steps down by at most one pixel per row for radius 4", () => {
    const insets = computeCornerInsets(4);
    expect(insets).toEqual([3, 2, 1, 0]);
    for (let i = 1; i < insets.length; i += 1) {
      expect(insets[i - 1] - insets[i]).toBeLessThanOrEqual(1);
    }
  });
});

describe("roundedRowInset", () => {
  it("returns zero inset in the flat middle rows", () => {
    expect(roundedRowInset(10, 40, 40, 5)).toBe(0);
    expect(roundedRowInset(20, 40, 40, 5)).toBe(0);
  });

  it("uses reference insets in the top-left corner", () => {
    expect(roundedRowInset(0, 40, 40, 5)).toBe(4);
    expect(roundedRowInset(1, 40, 40, 5)).toBe(2);
    expect(roundedRowInset(4, 40, 40, 5)).toBe(0);
  });

  it("mirrors insets in the bottom-left corner", () => {
    expect(roundedRowInset(35, 40, 40, 5)).toBe(0);
    expect(roundedRowInset(39, 40, 40, 5)).toBe(4);
  });

  it("forms a symmetric capsule when height equals twice the clamped radius", () => {
    expect(roundedRowInset(0, 112, 28, 14)).toBe(13);
    expect(roundedRowInset(13, 112, 28, 14)).toBe(0);
    expect(roundedRowInset(14, 112, 28, 14)).toBe(0);
    expect(roundedRowInset(27, 112, 28, 14)).toBe(13);
  });

  it("clamps radius to half of the smaller dimension", () => {
    expect(roundedRowInset(0, 6, 10, 8)).toBe(2);
    expect(roundedRowInset(1, 6, 10, 8)).toBe(1);
    expect(roundedRowInset(2, 6, 10, 8)).toBe(0);
  });
});

describe("innerFillScanline", () => {
  it("keeps fill rows inset by borderWidth from the outer rounded edge", () => {
    const width = 112;
    const height = 75;
    const radius = 14;
    const borderWidth = 1;
    const innerH = height - borderWidth * 2;

    for (let y = 0; y < innerH; y += 1) {
      const svgY = borderWidth + y;
      const outerInset = roundedRowInset(svgY, width, height, radius);
      const fill = innerFillScanline(svgY, width, height, radius, borderWidth);

      expect(fill.x).toBe(borderWidth + outerInset);
      expect(fill.x + fill.width).toBe(width - borderWidth - outerInset);
    }
  });
});
