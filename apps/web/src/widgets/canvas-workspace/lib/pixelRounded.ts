const insetCache = new Map<number, number[]>();

/** Pixel corner insets for a solid quarter-circle (matches SquareLine / LVGL-style preview). */
export function computeCornerInsets(radius: number): number[] {
  const r = Math.floor(radius);
  if (r <= 0) return [];
  const cached = insetCache.get(r);
  if (cached) return cached;

  if (r === 1) {
    insetCache.set(r, [1]);
    return [1];
  }

  const insets: number[] = [];
  for (let y = 0; y < r; y += 1) {
    let inset = r;
    for (let x = 0; x < r; x += 1) {
      const dx = r - x;
      const dy = r - y;
      if (dx * dx + dy * dy <= r * r) {
        inset = x;
        break;
      }
    }
    insets.push(inset);
  }

  insets[0] = Math.max(0, insets[0] - 1);
  insets[r - 1] = 0;

  insetCache.set(r, insets);
  return insets;
}

/** Inner fill scanline for a bordered pixel-rounded box (inset matches the outer shape). */
export function innerFillScanline(
  svgY: number,
  width: number,
  height: number,
  radius: number,
  borderWidth: number,
): { x: number; width: number } {
  const w = Math.max(0, Math.round(width));
  const bw = Math.max(0, Math.round(borderWidth));
  const innerW = Math.max(0, w - bw * 2);
  const inset = roundedRowInset(svgY, w, height, radius);
  return {
    x: bw + inset,
    width: Math.max(0, innerW - inset * 2),
  };
}

/** Left inset (px) for a scanline inside a pixel-rounded rectangle corner. */
export function roundedRowInset(y: number, width: number, height: number, radius: number): number {
  const r = Math.min(Math.floor(radius), Math.floor(width / 2), Math.floor(height / 2));
  if (r <= 0) return 0;

  const insets = computeCornerInsets(r);
  const cornerRows = insets.length;

  let topInset = 0;
  if (y < cornerRows) topInset = insets[y];

  let bottomInset = 0;
  const bottomStart = height - cornerRows;
  if (y >= bottomStart) {
    bottomInset = insets[cornerRows - 1 - (y - bottomStart)];
  }

  return Math.max(topInset, bottomInset);
}
