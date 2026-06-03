import type { Frame, LineProps } from "@entities/ui-project";

export const MAX_ZOOM = 15;
export const MIN_ZOOM = 1;
export const ZOOM_STEP = 0.5;
export const WHEEL_ZOOM_STEP = 0.25;
export const PIXEL_GRID_VISIBLE_ZOOM = 5;
export const RULER_SIZE = 24;

export type ResizeHandle = "n" | "e" | "s" | "w" | "nw" | "ne" | "sw" | "se";
export type LineHandle = "start" | "end";

export interface Point {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function normalizeZoom(value: number): number {
  const clamped = clampZoom(value);
  if (clamped >= PIXEL_GRID_VISIBLE_ZOOM) return Math.round(clamped);
  return Math.round(clamped * 4) / 4;
}

export function nextWheelZoom(currentZoom: number, direction: 1 | -1): number {
  if (currentZoom >= PIXEL_GRID_VISIBLE_ZOOM) {
    return clampZoom(currentZoom + direction * WHEEL_ZOOM_STEP);
  }
  const next = currentZoom + direction * WHEEL_ZOOM_STEP;
  if (direction > 0 && next >= PIXEL_GRID_VISIBLE_ZOOM) return PIXEL_GRID_VISIBLE_ZOOM;
  return normalizeZoom(next);
}

export function sameFrame(a: Frame, b: Frame): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

export function borderInsetFor(
  node: { style?: { drawBorder?: boolean; borderWidth?: number } } | null | undefined,
): number {
  if (!node?.style?.drawBorder) return 0;
  return Math.max(0, node.style.borderWidth ?? 1);
}

export function lineStrokeWidthFor(
  node: { style?: { borderWidth?: number }; props?: unknown } | null | undefined,
): number {
  const props = (node?.props ?? {}) as Partial<LineProps>;
  return Math.max(1, node?.style?.borderWidth ?? props.strokeWidth ?? 1);
}

export function visualRectForNode(
  node: { type: string; style?: { borderWidth?: number }; props?: unknown } | null,
  rect: Frame,
): Frame {
  if (node?.type !== "line") return rect;
  return { ...rect, height: Math.max(rect.height, lineStrokeWidthFor(node)) };
}

export function lineEndpointsForRect(
  node: { props?: unknown; style?: { borderWidth?: number } },
  rect: Frame,
): { start: Point; end: Point } {
  const props = (node.props ?? {}) as Partial<LineProps>;
  const strokeWidth = lineStrokeWidthFor(node);
  const visualHeight = Math.max(rect.height, strokeWidth);
  const fallbackY = Math.floor(visualHeight / 2);
  const pad = Math.floor(strokeWidth / 2);
  const maxY = Math.max(pad, visualHeight - Math.ceil(strokeWidth / 2));
  const visibleY = (value: number | undefined) =>
    Math.min(maxY, Math.max(pad, Math.round(value ?? fallbackY)));
  return {
    start: {
      x: rect.x + Math.round(props.x1 ?? 0),
      y: rect.y + visibleY(props.y1),
    },
    end: {
      x: rect.x + Math.round(props.x2 ?? Math.max(0, rect.width - 1)),
      y: rect.y + visibleY(props.y2),
    },
  };
}

export function clampPointToContent(point: Point, parentRect: Frame, inset: number): Point {
  return {
    x: clamp(point.x, parentRect.x + inset, parentRect.x + parentRect.width - inset),
    y: clamp(point.y, parentRect.y + inset, parentRect.y + parentRect.height - inset),
  };
}

export function lineFrameFromEndpoints(
  start: Point,
  end: Point,
  parentRect: Frame,
  strokeWidth: number,
): { frame: Frame; props: Partial<LineProps> } {
  const strokeOffset = Math.floor(strokeWidth / 2);
  const strokeEndOffset = Math.ceil(strokeWidth / 2) - 1;
  const left = Math.min(start.x, end.x) - strokeOffset;
  const top = Math.min(start.y, end.y) - strokeOffset;
  const right = Math.max(start.x, end.x) + strokeEndOffset;
  const bottom = Math.max(start.y, end.y) + strokeEndOffset;
  const width = Math.max(1, right - left + 1);
  const height = Math.max(1, bottom - top + 1);
  return {
    frame: {
      x: left - parentRect.x,
      y: top - parentRect.y,
      width,
      height,
    },
    props: {
      x1: start.x - left,
      y1: start.y - top,
      x2: end.x - left,
      y2: end.y - top,
    },
  };
}
