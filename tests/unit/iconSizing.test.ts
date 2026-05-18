import { describe, expect, it } from "vitest";

import {
  DEFAULT_ICON_ID,
  getIconScaleForFrame,
  getResolvedIconDefinition,
  normalizeIconFrame,
  normalizeIconNodeFrame,
} from "@entities/icon/iconSizing";

import { makeIcon, makeLabel } from "../fixtures/projects";

describe("getResolvedIconDefinition", () => {
  it("returns the requested icon if it exists", () => {
    const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
    expect(icon.id).toBe(DEFAULT_ICON_ID);
    expect(icon.width).toBeGreaterThan(0);
  });

  it("falls back to default for unknown ids", () => {
    const icon = getResolvedIconDefinition("no_such_icon_for_real");
    expect(icon.id).toBe(DEFAULT_ICON_ID);
  });

  it("handles null/undefined", () => {
    expect(getResolvedIconDefinition(null).id).toBe(DEFAULT_ICON_ID);
    expect(getResolvedIconDefinition(undefined).id).toBe(DEFAULT_ICON_ID);
  });
});

describe("getIconScaleForFrame", () => {
  it("returns the integer floor of fit ratio with minimum 1", () => {
    const icon = { id: "x", group: "G", width: 4, height: 4, rows: [] };
    expect(getIconScaleForFrame(icon, { width: 16, height: 16 })).toBe(4);
    expect(getIconScaleForFrame(icon, { width: 7, height: 12 })).toBe(1);
    expect(getIconScaleForFrame(icon, { width: 2, height: 2 })).toBe(1);
  });
});

describe("normalizeIconFrame", () => {
  it("snaps width/height to integer multiples of the icon size", () => {
    const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
    const frame = normalizeIconFrame(DEFAULT_ICON_ID, {
      x: 0,
      y: 0,
      width: icon.width * 3 + 1,
      height: icon.height * 3 + 1,
    });
    expect(frame.width).toBe(icon.width * 3);
    expect(frame.height).toBe(icon.height * 3);
  });

  it("respects right anchor", () => {
    const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
    const start = { x: 10, y: 10, width: icon.width * 4, height: icon.height * 4 };
    const next = normalizeIconFrame(DEFAULT_ICON_ID, {
      x: start.x,
      y: start.y,
      width: icon.width * 2,
      height: icon.height * 2,
    }, { anchorX: "right" });
    expect(next.x + next.width).toBe(start.x + icon.width * 2);
  });

  it("respects bottom anchor", () => {
    const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
    const next = normalizeIconFrame(DEFAULT_ICON_ID, {
      x: 0,
      y: 100,
      width: icon.width * 2,
      height: icon.height * 2,
    }, { anchorY: "bottom" });
    expect(next.y + next.height).toBe(100 + icon.height * 2);
  });

  it("clamps scale to maxWidth/maxHeight", () => {
    const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
    const next = normalizeIconFrame(DEFAULT_ICON_ID, {
      x: 0,
      y: 0,
      width: icon.width * 10,
      height: icon.height * 10,
    }, { maxWidth: icon.width * 3, maxHeight: icon.height * 3 });
    expect(next.width).toBeLessThanOrEqual(icon.width * 3);
    expect(next.height).toBeLessThanOrEqual(icon.height * 3);
  });
});

describe("normalizeIconNodeFrame", () => {
  it("returns the frame unchanged for non-icon nodes", () => {
    const node = makeLabel("a");
    const frame = { x: 1, y: 2, width: 3, height: 4 };
    expect(normalizeIconNodeFrame(node, frame)).toEqual(frame);
  });

  it("normalizes icon node frames", () => {
    const node = makeIcon("i", DEFAULT_ICON_ID);
    const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
    const frame = normalizeIconNodeFrame(node, { x: 0, y: 0, width: icon.width + 1, height: icon.height + 1 });
    expect(frame.width % icon.width).toBe(0);
    expect(frame.height % icon.height).toBe(0);
  });
});
