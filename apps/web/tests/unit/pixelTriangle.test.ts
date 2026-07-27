import { describe, expect, it } from "vitest";

import { buildTriangleScanlines } from "@widgets/canvas-workspace/lib/pixelTriangle";

function mask(
  width: number,
  height: number,
  direction: "up" | "right" | "down" | "left",
): string[] {
  const rows = buildTriangleScanlines(width, height, direction);
  return rows.map((row) => {
    const cells = Array.from({ length: width }, () => "0");
    if (!row) return cells.join("");
    for (let x = row.x; x < row.x + row.width; x += 1) cells[x] = "1";
    return cells.join("");
  });
}

describe("buildTriangleScanlines", () => {
  it("draws a symmetric up pyramid", () => {
    expect(mask(5, 3, "up")).toEqual([
      "00100",
      "01110",
      "11111",
    ]);
  });

  it("draws a symmetric down pyramid", () => {
    expect(mask(5, 3, "down")).toEqual([
      "11111",
      "01110",
      "00100",
    ]);
  });

  it("draws a symmetric even-width pyramid without an empty base pixel", () => {
    expect(mask(6, 3, "up")).toEqual([
      "001100",
      "011110",
      "111111",
    ]);
  });

  it.each([20, 21])("keeps every up/down row centered for width %i", (width) => {
    const rows = buildTriangleScanlines(width, 12, "up");
    for (const row of rows) {
      expect(row).not.toBeNull();
      expect(row!.width % 2).toBe(width % 2);
      expect(row!.x).toBe((width - row!.width) / 2);
      expect(row!.x + row!.width + row!.x).toBe(width);
    }
    expect(rows.at(-1)).toEqual({ x: 0, width });
  });

  it("grows both sides together instead of alternating", () => {
    const rows = buildTriangleScanlines(11, 6, "up");
    const widths = rows.map((row) => row!.width);
    // 1,3,5… — each step adds two pixels (one per side)
    for (let i = 1; i < widths.length; i += 1) {
      const delta = widths[i] - widths[i - 1];
      expect(delta === 0 || delta === 2 || delta === 4).toBe(true);
      expect(delta % 2).toBe(0);
    }
    expect(widths[0]).toBe(1);
  });

  it("keeps left/right tips single-pixel at the extremes", () => {
    const right = buildTriangleScanlines(16, 9, "right");
    expect(right[0]?.width).toBe(1);
    expect(right[0]?.x).toBe(0);
    expect(right[8]?.width).toBe(1);
    expect(right[4]!.width).toBeGreaterThan(right[0]!.width);
  });

  it("uses two centered full-width rows for an even-height left/right triangle", () => {
    const right = buildTriangleScanlines(16, 8, "right");
    expect(right[3]).toEqual({ x: 0, width: 16 });
    expect(right[4]).toEqual({ x: 0, width: 16 });
    expect(right[0]).toEqual({ x: 0, width: 1 });
    expect(right[7]).toEqual({ x: 0, width: 1 });
  });
});
