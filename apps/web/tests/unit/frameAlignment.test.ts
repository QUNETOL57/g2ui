import { describe, expect, it } from "vitest";

import {
  alignFrameInParent,
  canAlignFrameInParent,
  detectHorizontalAlign,
  detectVerticalAlign,
  parentContentBounds,
} from "@entities/ui-project/lib/frameAlignment";

import { makeFixtureProject, makeLabel, makePanel, withChildren } from "../fixtures/projects";

describe("frameAlignment", () => {
  const panel = makePanel("pan_1");
  panel.frame = { x: 0, y: 0, width: 100, height: 80 };
  panel.style = { drawBorder: true, borderWidth: 2 };

  it("computes parent content bounds with border inset", () => {
    expect(parentContentBounds(panel)).toEqual({
      inset: 2,
      width: 96,
      height: 76,
    });
  });

  it("aligns child frame within parent content", () => {
    const child = { x: 0, y: 0, width: 20, height: 10 };
    const bounds = parentContentBounds(panel);
    expect(alignFrameInParent(child, bounds, "left", "top")).toEqual({ x: 2, y: 2 });
    expect(alignFrameInParent(child, bounds, "center", "center")).toEqual({ x: 40, y: 35 });
    expect(alignFrameInParent(child, bounds, "right", "bottom")).toEqual({ x: 78, y: 68 });
  });

  it("detects the closest alignment for the current frame", () => {
    const bounds = parentContentBounds(panel);
    const frame = { x: 40, y: 35, width: 20, height: 10 };
    expect(detectHorizontalAlign(frame, bounds)).toBe("center");
    expect(detectVerticalAlign(frame, bounds)).toBe("center");
  });

  it("allows alignment only when parent uses absolute layout", () => {
    expect(canAlignFrameInParent(panel)).toBe(false);
    const absolutePanel = { ...panel, layout: { mode: "absolute" as const, padding: 0, gap: 0 } };
    expect(canAlignFrameInParent(absolutePanel)).toBe(true);
  });

  it("uses screen size when parent is the screen", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    const screen = project.screens[0];
    expect(parentContentBounds(screen, project)).toEqual({
      inset: 0,
      width: 160,
      height: 128,
    });
  });
});
