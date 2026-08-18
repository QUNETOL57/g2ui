import { describe, expect, it } from "vitest";

import { TOOLTIP_GAP, TOOLTIP_VIEWPORT_MARGIN, placeTooltip } from "@shared/lib/placeTooltip";

const viewport = { width: 800, height: 600 };
const box = { width: 200, height: 24 };

describe("placeTooltip", () => {
  it("centers the tooltip above the anchor when there is room", () => {
    const pos = placeTooltip({ left: 300, top: 200, width: 24, height: 24 }, box, viewport);
    expect(pos.left).toBe(300 + 12 - 100);
    expect(pos.top).toBe(200 - box.height - TOOLTIP_GAP);
  });

  it("keeps the tooltip inside the viewport near the left edge", () => {
    const pos = placeTooltip({ left: 4, top: 400, width: 24, height: 24 }, box, viewport);
    expect(pos.left).toBe(TOOLTIP_VIEWPORT_MARGIN);
    expect(pos.left + box.width).toBeLessThanOrEqual(viewport.width - TOOLTIP_VIEWPORT_MARGIN);
  });

  it("keeps the tooltip inside the viewport near the right edge", () => {
    const pos = placeTooltip({ left: 780, top: 400, width: 24, height: 24 }, box, viewport);
    expect(pos.left).toBe(viewport.width - box.width - TOOLTIP_VIEWPORT_MARGIN);
    expect(pos.left).toBeGreaterThanOrEqual(TOOLTIP_VIEWPORT_MARGIN);
  });

  it("flips below the anchor when there is no room above", () => {
    const pos = placeTooltip({ left: 300, top: 10, width: 24, height: 24 }, box, viewport);
    expect(pos.top).toBe(10 + 24 + TOOLTIP_GAP);
    expect(pos.top).toBeGreaterThanOrEqual(TOOLTIP_VIEWPORT_MARGIN);
  });

  it("clamps vertically when the tooltip would leave the bottom edge", () => {
    const tall = { width: 120, height: 400 };
    const pos = placeTooltip({ left: 300, top: 500, width: 24, height: 80 }, tall, viewport);
    expect(pos.top + tall.height).toBeLessThanOrEqual(viewport.height - TOOLTIP_VIEWPORT_MARGIN);
    expect(pos.top).toBeGreaterThanOrEqual(TOOLTIP_VIEWPORT_MARGIN);
  });
});
