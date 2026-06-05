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
  if (r === 4 && insets[r - 1] === 1 && insets[r - 2] === 1) {
    insets.push(0);
  } else {
    insets[r - 1] = 0;
  }

  insetCache.set(r, insets);
  return insets;
}

/** Left inset (px) for a scanline inside a pixel-rounded rectangle corner. */
export function roundedRowInset(y: number, width: number, height: number, radius: number): number {
  const r = Math.min(Math.floor(radius), Math.floor(width / 2), Math.floor(height / 2));
  if (r <= 0) return 0;

  const insets = computeCornerInsets(r);
  if (y < insets.length) return insets[y];

  const bottomStart = height - insets.length;
  if (y >= bottomStart) return insets[y - bottomStart];

  return 0;
}
