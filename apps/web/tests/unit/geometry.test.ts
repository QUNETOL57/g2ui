import { describe, expect, it } from "vitest";

import {
  MAX_ZOOM,
  MIN_ZOOM,
  PIXEL_GRID_VISIBLE_ZOOM,
  RULER_SIZE,
  ZOOM_STEP,
  ZOOM_STEP_COARSE,
  borderInsetFor,
  clamp,
  clampPointToContent,
  clampZoom,
  formatZoomLabel,
  lineEndpointsForRect,
  lineFrameFromEndpoints,
  lineStrokeWidthFor,
  nextWheelZoom,
  normalizeZoom,
  renderZoomFor,
  sameFrame,
  visualRectForNode,
  zoomToProgress,
} from "@widgets/canvas-workspace/lib/geometry";

describe("clamp", () => {
  it("clamps a value into [min, max]", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe("zoom constants", () => {
  it("exposes coherent zoom range", () => {
    expect(MIN_ZOOM).toBeLessThan(MAX_ZOOM);
    expect(PIXEL_GRID_VISIBLE_ZOOM).toBeGreaterThanOrEqual(MIN_ZOOM);
    expect(PIXEL_GRID_VISIBLE_ZOOM).toBeLessThanOrEqual(MAX_ZOOM);
    expect(ZOOM_STEP).toBe(0.5);
    expect(ZOOM_STEP_COARSE).toBe(1);
    expect(RULER_SIZE).toBeGreaterThan(0);
  });
});

describe("clampZoom", () => {
  it("clamps into the allowed zoom range", () => {
    expect(clampZoom(-1)).toBe(MIN_ZOOM);
    expect(clampZoom(MAX_ZOOM + 1)).toBe(MAX_ZOOM);
    expect(clampZoom(2)).toBe(2);
  });
});

describe("normalizeZoom", () => {
  it("rounds to integer at and above the pixel-grid threshold", () => {
    expect(normalizeZoom(PIXEL_GRID_VISIBLE_ZOOM + 0.4)).toBe(PIXEL_GRID_VISIBLE_ZOOM);
    expect(normalizeZoom(PIXEL_GRID_VISIBLE_ZOOM + 0.6)).toBe(PIXEL_GRID_VISIBLE_ZOOM + 1);
  });

  it("rounds to 0.5 below the pixel-grid threshold", () => {
    expect(normalizeZoom(1.2)).toBe(1);
    expect(normalizeZoom(1.3)).toBe(1.5);
    expect(normalizeZoom(2.74)).toBe(2.5);
    expect(normalizeZoom(2.75)).toBe(3);
  });

  it("clamps before rounding", () => {
    expect(normalizeZoom(-5)).toBe(MIN_ZOOM);
    expect(normalizeZoom(100)).toBe(MAX_ZOOM);
  });
});

describe("nextWheelZoom", () => {
  it("steps in 0.5 increments below the threshold", () => {
    expect(nextWheelZoom(1, 1)).toBeCloseTo(1.5, 5);
    expect(nextWheelZoom(2.5, 1)).toBeCloseTo(3, 5);
    expect(nextWheelZoom(3, -1)).toBeCloseTo(2.5, 5);
  });

  it("walks the full 0.5 ladder from MIN up to the threshold", () => {
    const steps: number[] = [];
    let zoom = MIN_ZOOM;
    for (let i = 0; i < 20 && zoom < PIXEL_GRID_VISIBLE_ZOOM; i += 1) {
      zoom = nextWheelZoom(zoom, 1);
      steps.push(zoom);
    }
    expect(steps).toEqual([1.5, 2, 2.5, 3, 3.5, 4, 4.5, PIXEL_GRID_VISIBLE_ZOOM]);
  });

  it("snaps to the threshold when crossing upward", () => {
    expect(nextWheelZoom(PIXEL_GRID_VISIBLE_ZOOM - 0.5, 1)).toBe(PIXEL_GRID_VISIBLE_ZOOM);
  });

  it("steps in 1.0 increments at and above the threshold", () => {
    expect(nextWheelZoom(PIXEL_GRID_VISIBLE_ZOOM, 1)).toBe(PIXEL_GRID_VISIBLE_ZOOM + 1);
    expect(nextWheelZoom(PIXEL_GRID_VISIBLE_ZOOM + 2, 1)).toBe(PIXEL_GRID_VISIBLE_ZOOM + 3);
  });

  it("steps down by 1.0 above the threshold and snaps back to it", () => {
    expect(nextWheelZoom(PIXEL_GRID_VISIBLE_ZOOM + 2, -1)).toBe(PIXEL_GRID_VISIBLE_ZOOM + 1);
    expect(nextWheelZoom(PIXEL_GRID_VISIBLE_ZOOM + 1, -1)).toBe(PIXEL_GRID_VISIBLE_ZOOM);
  });

  it("switches back to 0.5 steps when leaving the threshold downward", () => {
    expect(nextWheelZoom(PIXEL_GRID_VISIBLE_ZOOM, -1)).toBe(PIXEL_GRID_VISIBLE_ZOOM - 0.5);
  });

  it("clamps to MIN and MAX", () => {
    expect(nextWheelZoom(MAX_ZOOM, 1)).toBe(MAX_ZOOM);
    expect(nextWheelZoom(MIN_ZOOM, -1)).toBe(MIN_ZOOM);
  });

  it("walks the full ladder down from MAX to MIN", () => {
    const steps: number[] = [];
    let zoom = MAX_ZOOM;
    for (let i = 0; i < 50 && zoom > MIN_ZOOM; i += 1) {
      const next = nextWheelZoom(zoom, -1);
      expect(next).toBeLessThan(zoom);
      zoom = next;
      steps.push(zoom);
    }
    expect(zoom).toBe(MIN_ZOOM);
    expect(steps.includes(PIXEL_GRID_VISIBLE_ZOOM)).toBe(true);
  });

  it("is monotonic going up from MIN to MAX", () => {
    let zoom = MIN_ZOOM;
    for (let i = 0; i < 50 && zoom < MAX_ZOOM; i += 1) {
      const next = nextWheelZoom(zoom, 1);
      expect(next).toBeGreaterThan(zoom);
      zoom = next;
    }
    expect(zoom).toBe(MAX_ZOOM);
  });
});

describe("renderZoomFor", () => {
  it("keeps fractional zoom below the pixel-grid threshold", () => {
    expect(renderZoomFor(2.5)).toBe(2.5);
    expect(renderZoomFor(MIN_ZOOM)).toBe(MIN_ZOOM);
    expect(renderZoomFor(PIXEL_GRID_VISIBLE_ZOOM - 0.5)).toBe(PIXEL_GRID_VISIBLE_ZOOM - 0.5);
  });

  it("snaps to an integer at and above the threshold", () => {
    expect(renderZoomFor(PIXEL_GRID_VISIBLE_ZOOM)).toBe(PIXEL_GRID_VISIBLE_ZOOM);
    expect(renderZoomFor(PIXEL_GRID_VISIBLE_ZOOM + 0.4)).toBe(PIXEL_GRID_VISIBLE_ZOOM);
    expect(renderZoomFor(6.6)).toBe(7);
  });
});

describe("zoomToProgress", () => {
  it("maps the zoom range onto 0..100", () => {
    expect(zoomToProgress(MIN_ZOOM)).toBe(0);
    expect(zoomToProgress(MAX_ZOOM)).toBe(100);
    expect(zoomToProgress((MIN_ZOOM + MAX_ZOOM) / 2)).toBeCloseTo(50, 5);
  });

  it("clamps out-of-range zoom into 0..100", () => {
    expect(zoomToProgress(MIN_ZOOM - 5)).toBe(0);
    expect(zoomToProgress(MAX_ZOOM + 5)).toBe(100);
  });
});

describe("formatZoomLabel", () => {
  it("shows one decimal for fractional zoom", () => {
    expect(formatZoomLabel(2.5)).toBe("2.5×");
    expect(formatZoomLabel(1)).toBe("1×");
  });

  it("shows no decimals at and above the pixel-grid threshold", () => {
    expect(formatZoomLabel(PIXEL_GRID_VISIBLE_ZOOM)).toBe(`${PIXEL_GRID_VISIBLE_ZOOM}×`);
    expect(formatZoomLabel(6.4)).toBe("6×");
    expect(formatZoomLabel(MAX_ZOOM)).toBe(`${MAX_ZOOM}×`);
  });
});

describe("sameFrame", () => {
  it("returns true for identical frames", () => {
    expect(sameFrame({ x: 1, y: 2, width: 3, height: 4 }, { x: 1, y: 2, width: 3, height: 4 })).toBe(true);
  });

  it("returns false when any field differs", () => {
    expect(sameFrame({ x: 0, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: 1, height: 2 })).toBe(false);
    expect(sameFrame({ x: 0, y: 0, width: 1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 })).toBe(false);
  });
});

describe("borderInsetFor", () => {
  it("returns 0 when no border drawn", () => {
    expect(borderInsetFor(null)).toBe(0);
    expect(borderInsetFor({})).toBe(0);
    expect(borderInsetFor({ style: { drawBorder: false, borderWidth: 5 } })).toBe(0);
  });

  it("returns border width when drawn", () => {
    expect(borderInsetFor({ style: { drawBorder: true, borderWidth: 3 } })).toBe(3);
    expect(borderInsetFor({ style: { drawBorder: true } })).toBe(1);
  });
});

describe("lineStrokeWidthFor", () => {
  it("falls back to 1 when nothing is set", () => {
    expect(lineStrokeWidthFor(null)).toBe(1);
    expect(lineStrokeWidthFor({})).toBe(1);
  });

  it("uses style.borderWidth when present", () => {
    expect(lineStrokeWidthFor({ style: { borderWidth: 3 } })).toBe(3);
  });

  it("uses props.strokeWidth when borderWidth is missing", () => {
    expect(lineStrokeWidthFor({ props: { strokeWidth: 4 } })).toBe(4);
  });

  it("enforces minimum of 1", () => {
    expect(lineStrokeWidthFor({ style: { borderWidth: 0 } })).toBe(1);
  });
});

describe("visualRectForNode", () => {
  it("returns input rect unchanged for non-line nodes", () => {
    const rect = { x: 0, y: 0, width: 10, height: 1 };
    expect(visualRectForNode({ type: "rect" }, rect)).toEqual(rect);
  });

  it("enlarges line height to at least stroke width", () => {
    const rect = { x: 0, y: 0, width: 10, height: 1 };
    const result = visualRectForNode({ type: "line", style: { borderWidth: 3 } }, rect);
    expect(result.height).toBe(3);
  });
});

describe("lineEndpointsForRect", () => {
  it("uses provided x/y values", () => {
    const endpoints = lineEndpointsForRect(
      { props: { x1: 1, y1: 0, x2: 8, y2: 4 } },
      { x: 10, y: 20, width: 9, height: 5 },
    );
    expect(endpoints.start.x).toBe(11);
    expect(endpoints.end.x).toBe(18);
  });

  it("defaults x1/y1 to 0/center and x2 to right edge", () => {
    const endpoints = lineEndpointsForRect(
      { props: {} },
      { x: 0, y: 0, width: 10, height: 5 },
    );
    expect(endpoints.start.x).toBe(0);
    expect(endpoints.end.x).toBe(9);
  });

  it("clamps y inside the stroke padding", () => {
    const endpoints = lineEndpointsForRect(
      { props: { x1: 0, y1: 99, x2: 10, y2: -99 }, style: { borderWidth: 3 } },
      { x: 0, y: 0, width: 10, height: 5 },
    );
    expect(endpoints.start.y).toBeGreaterThanOrEqual(1);
    expect(endpoints.end.y).toBeGreaterThanOrEqual(1);
    expect(endpoints.start.y).toBeLessThanOrEqual(4);
  });
});

describe("clampPointToContent", () => {
  it("clamps a point to inside parent rect minus inset", () => {
    const parent = { x: 0, y: 0, width: 100, height: 80 };
    expect(clampPointToContent({ x: -10, y: -10 }, parent, 2)).toEqual({ x: 2, y: 2 });
    expect(clampPointToContent({ x: 500, y: 500 }, parent, 2)).toEqual({ x: 98, y: 78 });
    expect(clampPointToContent({ x: 50, y: 50 }, parent, 2)).toEqual({ x: 50, y: 50 });
  });
});

describe("lineFrameFromEndpoints", () => {
  it("produces a frame containing both points", () => {
    const { frame, props } = lineFrameFromEndpoints(
      { x: 10, y: 5 },
      { x: 20, y: 15 },
      { x: 0, y: 0, width: 100, height: 100 },
      1,
    );
    expect(frame.x).toBe(10);
    expect(frame.y).toBe(5);
    expect(frame.width).toBe(11);
    expect(frame.height).toBe(11);
    expect(props.x1).toBe(0);
    expect(props.y1).toBe(0);
    expect(props.x2).toBe(10);
    expect(props.y2).toBe(10);
  });

  it("supports thicker strokes by offsetting frame", () => {
    const { frame } = lineFrameFromEndpoints(
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 0, y: 0, width: 100, height: 100 },
      3,
    );
    expect(frame.x).toBe(9);
    expect(frame.y).toBe(9);
    expect(frame.width).toBeGreaterThan(10);
    expect(frame.height).toBeGreaterThanOrEqual(3);
  });

  it("produces a minimum 1x1 frame for degenerate lines", () => {
    const { frame } = lineFrameFromEndpoints(
      { x: 5, y: 5 },
      { x: 5, y: 5 },
      { x: 0, y: 0, width: 10, height: 10 },
      1,
    );
    expect(frame.width).toBeGreaterThanOrEqual(1);
    expect(frame.height).toBeGreaterThanOrEqual(1);
  });
});
