import { describe, expect, it } from "vitest";

import {
  findLayoutNode,
  findParentLayoutNode,
} from "@widgets/canvas-workspace/lib/layoutNodeOps";
import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";

function makeLayout(): LayoutNode {
  const childA: LayoutNode = {
    node: { id: "a", type: "label" },
    rect: { x: 0, y: 0, width: 10, height: 10 },
    children: [],
  };
  const childB: LayoutNode = {
    node: { id: "b", type: "label" },
    rect: { x: 10, y: 0, width: 10, height: 10 },
    children: [],
  };
  const panel: LayoutNode = {
    node: { id: "p", type: "panel" },
    rect: { x: 0, y: 0, width: 50, height: 20 },
    children: [childA, childB],
  };
  return {
    node: { id: "screen", type: "screen" },
    rect: { x: 0, y: 0, width: 100, height: 100 },
    children: [panel],
  };
}

describe("findLayoutNode", () => {
  it("returns the root when id matches", () => {
    expect(findLayoutNode(makeLayout(), "screen")?.node.id).toBe("screen");
  });

  it("descends into children", () => {
    expect(findLayoutNode(makeLayout(), "a")?.node.id).toBe("a");
    expect(findLayoutNode(makeLayout(), "b")?.node.id).toBe("b");
  });

  it("returns null when id is null or not found", () => {
    expect(findLayoutNode(makeLayout(), null)).toBeNull();
    expect(findLayoutNode(makeLayout(), "missing")).toBeNull();
  });
});

describe("findParentLayoutNode", () => {
  it("returns parent layout node", () => {
    expect(findParentLayoutNode(makeLayout(), "a")?.node.id).toBe("p");
    expect(findParentLayoutNode(makeLayout(), "p")?.node.id).toBe("screen");
  });

  it("returns null for the root", () => {
    expect(findParentLayoutNode(makeLayout(), "screen")).toBeNull();
  });

  it("returns null when id missing or null", () => {
    expect(findParentLayoutNode(makeLayout(), null)).toBeNull();
    expect(findParentLayoutNode(makeLayout(), "missing")).toBeNull();
  });
});
