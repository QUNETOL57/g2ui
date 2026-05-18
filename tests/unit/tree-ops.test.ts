import { describe, expect, it } from "vitest";

import {
  clampIndex,
  cloneProject,
  collectIds,
  containsId,
  defaultFrameFor,
  findNode,
  findParent,
  findScreenOf,
  insertChild,
  isAncestor,
  normalizeProjectTextFrames,
  normalizeTextNodeFrame,
  removeNode,
} from "@entities/ui-project/model/tree-ops";

import {
  makeButton,
  makeFixtureProject,
  makeIcon,
  makeLabel,
  makePanel,
  withChildren,
} from "../fixtures/projects";

describe("cloneProject", () => {
  it("produces a deep copy", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("a")]);
    const copy = cloneProject(project);
    expect(copy).not.toBe(project);
    expect(copy.screens).not.toBe(project.screens);
    expect(copy.screens[0].children).not.toBe(project.screens[0].children);
    expect(copy).toEqual(project);
  });
});

describe("collectIds", () => {
  it("walks the tree and gathers all ids", () => {
    const panel = makePanel("p_1", [makeLabel("l_a"), makeLabel("l_b")]);
    const project = withChildren(makeFixtureProject(), [panel, makeButton("b_1")]);
    const ids = collectIds(project);
    expect(ids).toEqual(new Set(["screen_main", "p_1", "l_a", "l_b", "b_1"]));
  });
});

describe("findNode", () => {
  it("finds top-level and nested nodes", () => {
    const panel = makePanel("p_1", [makeLabel("l_a")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    expect(findNode(project, "screen_main")?.id).toBe("screen_main");
    expect(findNode(project, "p_1")?.id).toBe("p_1");
    expect(findNode(project, "l_a")?.id).toBe("l_a");
    expect(findNode(project, "missing")).toBeNull();
  });
});

describe("findParent", () => {
  it("returns the parent of a child", () => {
    const panel = makePanel("p_1", [makeLabel("l_a")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    expect(findParent(project, "l_a")?.id).toBe("p_1");
    expect(findParent(project, "p_1")?.id).toBe("screen_main");
  });

  it("returns null for screen (no parent)", () => {
    const project = makeFixtureProject();
    expect(findParent(project, "screen_main")).toBeNull();
    expect(findParent(project, "unknown")).toBeNull();
  });
});

describe("containsId & isAncestor", () => {
  it("detects ancestry", () => {
    const panel = makePanel("p_1", [makeLabel("l_a")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    expect(containsId(panel, "l_a")).toBe(true);
    expect(containsId(panel, "x")).toBe(false);
    expect(isAncestor(project, "p_1", "l_a")).toBe(true);
    expect(isAncestor(project, "l_a", "p_1")).toBe(false);
    expect(isAncestor(project, "unknown", "l_a")).toBe(false);
  });
});

describe("findScreenOf", () => {
  it("finds the screen owning a node", () => {
    const panel = makePanel("p_1", [makeLabel("l_a")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    expect(findScreenOf(project, "l_a")?.id).toBe("screen_main");
    expect(findScreenOf(project, "p_1")?.id).toBe("screen_main");
    expect(findScreenOf(project, "screen_main")?.id).toBe("screen_main");
    expect(findScreenOf(project, "missing")).toBeNull();
  });
});

describe("insertChild & removeNode", () => {
  it("inserts a new child into parent", () => {
    const project = makeFixtureProject();
    insertChild(project, "screen_main", makeLabel("new_1"));
    expect(project.screens[0].children).toHaveLength(1);
    expect(project.screens[0].children?.[0].id).toBe("new_1");
  });

  it("creates children array if missing on parent", () => {
    const project = makeFixtureProject();
    project.screens[0].children = undefined;
    insertChild(project, "screen_main", makeLabel("new_1"));
    expect(project.screens[0].children).toHaveLength(1);
  });

  it("ignores insert into missing parent", () => {
    const project = makeFixtureProject();
    expect(() => insertChild(project, "missing", makeLabel("new_1"))).not.toThrow();
    expect(project.screens[0].children).toEqual([]);
  });

  it("removes a node and returns it", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("a"),
      makeLabel("b"),
    ]);
    const removed = removeNode(project, "a");
    expect(removed?.id).toBe("a");
    expect(project.screens[0].children).toHaveLength(1);
  });

  it("removeNode returns null for missing node", () => {
    const project = makeFixtureProject();
    expect(removeNode(project, "unknown")).toBeNull();
    expect(removeNode(project, "screen_main")).toBeNull();
  });
});

describe("clampIndex", () => {
  it("clamps to [0, max]", () => {
    expect(clampIndex(-5, 3)).toBe(0);
    expect(clampIndex(2, 3)).toBe(2);
    expect(clampIndex(10, 3)).toBe(3);
    expect(clampIndex(0, 0)).toBe(0);
  });
});

describe("defaultFrameFor", () => {
  it("returns sensible defaults for each widget type", () => {
    const project = makeFixtureProject();
    expect(defaultFrameFor("button", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 80,
      height: 24,
    });
    expect(defaultFrameFor("rect", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 40,
      height: 24,
    });
    expect(defaultFrameFor("line", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 60,
      height: 1,
    });
    expect(defaultFrameFor("image", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 32,
      height: 32,
    });
  });

  it("panel takes parent width but capped to 60 height", () => {
    const project = makeFixtureProject();
    const frame = defaultFrameFor("panel", "screen_main", project);
    expect(frame.x).toBe(0);
    expect(frame.y).toBe(0);
    expect(frame.width).toBe(160);
    expect(frame.height).toBe(60);
  });

  it("label width is bounded by parent and is a fixed line height", () => {
    const project = makeFixtureProject();
    const frame = defaultFrameFor("label", "screen_main", project);
    expect(frame.x).toBe(8);
    expect(frame.y).toBe(8);
    expect(frame.width).toBeLessThanOrEqual(120);
    expect(frame.height).toBeGreaterThan(0);
  });

  it("icon default frame matches the default icon size", () => {
    const project = makeFixtureProject();
    const frame = defaultFrameFor("icon", "screen_main", project);
    expect(frame.x).toBe(8);
    expect(frame.y).toBe(8);
    expect(frame.width).toBeGreaterThan(0);
    expect(frame.height).toBeGreaterThan(0);
  });

  it("falls back to display size when parent has no frame", () => {
    const project = makeFixtureProject();
    project.screens[0].frame = undefined;
    const frame = defaultFrameFor("panel", "screen_main", project);
    expect(frame.width).toBe(project.display.width);
  });
});

describe("normalizeTextNodeFrame", () => {
  it("normalizes label height to the line height of the font", () => {
    const node = makeLabel("l_a");
    const normalized = normalizeTextNodeFrame(node, { x: 0, y: 0, width: 100, height: 999 });
    expect(normalized.height).not.toBe(999);
    expect(normalized.height).toBeGreaterThan(0);
  });

  it("returns the original frame for non-label nodes", () => {
    const node = makeIcon("ic_a");
    const frame = { x: 1, y: 2, width: 3, height: 4 };
    expect(normalizeTextNodeFrame(node, frame)).toEqual(frame);
  });
});

describe("normalizeProjectTextFrames", () => {
  it("walks all labels recursively and normalizes them", () => {
    const inner = makeLabel("deep");
    inner.frame = { x: 0, y: 0, width: 10, height: 999 };
    const panel = makePanel("p_1", [inner]);
    const project = withChildren(makeFixtureProject(), [panel]);
    normalizeProjectTextFrames(project);
    expect(findNode(project, "deep")?.frame?.height).not.toBe(999);
  });
});
