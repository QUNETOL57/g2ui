export const TOOLTIP_VIEWPORT_MARGIN = 8;
export const TOOLTIP_GAP = 8;

export interface TooltipAnchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TooltipBox {
  width: number;
  height: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

/** Places a tooltip above the anchor, flipping below if needed, clamped to the viewport. */
export function placeTooltip(
  anchor: TooltipAnchor,
  box: TooltipBox,
  viewport: ViewportSize,
  margin = TOOLTIP_VIEWPORT_MARGIN,
  gap = TOOLTIP_GAP,
): { left: number; top: number } {
  const maxLeft = viewport.width - box.width - margin;
  let left = anchor.left + anchor.width / 2 - box.width / 2;
  left = clamp(left, margin, maxLeft);

  let top = anchor.top - box.height - gap;
  if (top < margin) {
    top = anchor.top + anchor.height + gap;
  }
  const maxTop = viewport.height - box.height - margin;
  top = clamp(top, margin, maxTop);

  return { left, top };
}
