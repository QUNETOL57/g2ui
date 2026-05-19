import { describe, expect, it } from "vitest";

import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import type { WidgetNode } from "@entities/ui-project";

import { makeButton, makeLabel, makePanel } from "../fixtures/projects";

function rootFrame(width = 160, height = 128) {
  return {
    id: "screen_main",
    type: "screen" as const,
    width,
    height,
    frame: { x: 0, y: 0, width, height },
  };
}

describe("layoutTree (absolute)", () => {
  it("returns the root frame as-is when no children", () => {
    const root: WidgetNode = { ...rootFrame(), layout: { mode: "absolute" }, children: [] };
    const tree = layoutTree(root, 160, 128);
    expect(tree.rect).toEqual({ x: 0, y: 0, width: 160, height: 128 });
    expect(tree.children).toEqual([]);
  });

  it("falls back to parent dimensions when root has no frame", () => {
    const root: WidgetNode = { ...rootFrame(), frame: undefined, children: [] };
    const tree = layoutTree(root, 320, 240);
    expect(tree.rect).toEqual({ x: 0, y: 0, width: 320, height: 240 });
  });

  it("positions absolute children using their frames + parent origin", () => {
    const child = { ...makeLabel("l1"), frame: { x: 10, y: 20, width: 40, height: 10 } };
    const root: WidgetNode = {
      ...rootFrame(),
      layout: { mode: "absolute" },
      children: [child],
    };
    const tree = layoutTree(root, 160, 128);
    expect(tree.children[0].rect).toEqual({ x: 10, y: 20, width: 40, height: 10 });
  });
});

describe("layoutTree (row/column)", () => {
  it("lays out children in a row with gap and padding", () => {
    const a = { ...makeLabel("a"), frame: { x: 0, y: 0, width: 20, height: 10 } };
    const b = { ...makeLabel("b"), frame: { x: 0, y: 0, width: 30, height: 10 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 40 },
      layout: { mode: "row", padding: 4, gap: 2, align: "start" },
      children: [a, b],
    };
    const tree = layoutTree(panel, 100, 40);
    expect(tree.children[0].rect).toEqual({ x: 4, y: 4, width: 20, height: 10 });
    expect(tree.children[1].rect).toEqual({ x: 26, y: 4, width: 30, height: 10 });
  });

  it("lays out children in a column", () => {
    const a = { ...makeLabel("a"), frame: { x: 0, y: 0, width: 20, height: 10 } };
    const b = { ...makeLabel("b"), frame: { x: 0, y: 0, width: 20, height: 14 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 50 },
      layout: { mode: "column", padding: 2, gap: 4, align: "start" },
      children: [a, b],
    };
    const tree = layoutTree(panel, 100, 50);
    expect(tree.children[0].rect.y).toBe(2);
    expect(tree.children[1].rect.y).toBe(2 + 10 + 4);
  });

  it("centers children on the cross-axis when align=center", () => {
    const a = { ...makeLabel("a"), frame: { x: 0, y: 0, width: 20, height: 10 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 50 },
      layout: { mode: "row", padding: 0, gap: 0, align: "center" },
      children: [a],
    };
    const tree = layoutTree(panel, 100, 50);
    expect(tree.children[0].rect.y).toBe(Math.floor((50 - 10) / 2));
  });

  it("aligns children to end on the cross-axis when align=end", () => {
    const a = { ...makeButton("b"), frame: { x: 0, y: 0, width: 20, height: 10 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 50 },
      layout: { mode: "row", padding: 0, gap: 0, align: "end" },
      children: [a],
    };
    const tree = layoutTree(panel, 100, 50);
    expect(tree.children[0].rect.y).toBe(50 - 10);
  });

  it("stretches children on the cross-axis when align=stretch", () => {
    const a = { ...makeLabel("a"), frame: { x: 0, y: 0, width: 20, height: 10 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 50 },
      layout: { mode: "row", padding: 0, gap: 0, align: "stretch" },
      children: [a],
    };
    const tree = layoutTree(panel, 100, 50);
    expect(tree.children[0].rect.height).toBe(50);
  });

  it("ensures main axis size has at least 1px", () => {
    const a = { ...makeLabel("a"), frame: { x: 0, y: 0, width: 0, height: 10 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 50 },
      layout: { mode: "row", padding: 0, gap: 0, align: "start" },
      children: [a],
    };
    const tree = layoutTree(panel, 100, 50);
    expect(tree.children[0].rect.width).toBe(1);
  });

  it("treats missing layout mode as absolute", () => {
    const a = { ...makeLabel("a"), frame: { x: 5, y: 5, width: 20, height: 10 } };
    const panel: WidgetNode = {
      ...makePanel("p1"),
      frame: { x: 0, y: 0, width: 100, height: 50 },
      layout: undefined,
      children: [a],
    };
    const tree = layoutTree(panel, 100, 50);
    expect(tree.children[0].rect).toEqual({ x: 5, y: 5, width: 20, height: 10 });
  });
});
