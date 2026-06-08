import { describe, expect, it } from "vitest";

import {
  computeCornerInsets,
  roundedRowInset,
} from "@widgets/canvas-workspace/lib/pixelRounded";

describe("computeCornerInsets", () => {
  it("matches SquareLine-style reference patterns", () => {
    expect(computeCornerInsets(1)).toEqual([1]);
    expect(computeCornerInsets(3)).toEqual([2, 1, 0]);
    expect(computeCornerInsets(4)).toEqual([3, 2, 1, 1, 0]);
    expect(computeCornerInsets(5)).toEqual([4, 2, 1, 1, 0]);
    expect(computeCornerInsets(6)).toEqual([5, 3, 2, 1, 1, 0]);
    expect(computeCornerInsets(7)).toEqual([6, 4, 3, 2, 1, 1, 0]);
    expect(computeCornerInsets(8)).toEqual([7, 5, 3, 2, 2, 1, 1, 0]);
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
    expect(roundedRowInset(35, 40, 40, 5)).toBe(4);
    expect(roundedRowInset(39, 40, 40, 5)).toBe(0);
  });

  it("clamps radius to half of the smaller dimension", () => {
    expect(roundedRowInset(0, 6, 10, 8)).toBe(2);
    expect(roundedRowInset(1, 6, 10, 8)).toBe(1);
    expect(roundedRowInset(2, 6, 10, 8)).toBe(0);
  });
});
