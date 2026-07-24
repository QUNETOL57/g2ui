import { describe, expect, it } from "vitest";

import {
  clampIndex,
  cloneProject,
  cloneWidgetSubtree,
  collectIds,
  containsId,
  deepCloneWidget,
  defaultFrameFor,
  findNode,
  findParent,
  findScreenOf,
  fitTextNodeFrame,
  insertChild,
  insertChildAfter,
  isAncestor,
  lockWidgetSubtree,
  normalizeProjectTextFrames,
  normalizeTextNodeFrame,
  offsetWidgetFrame,
  pruneCopySelection,
  removeNode,
  resolvePasteParentOutsideClipboard,
} from "@entities/ui-project/model/tree-ops";

import {
  makeButton,
  makeFixtureProject,
  makeIcon,
  makeLabel,
  makePanel,
  makeCircle,
  makeTriangle,
  makeFreehand,
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

  it("deep-copies drawing widgets", () => {
    const project = withChildren(makeFixtureProject(), [
      makeCircle("cir_1"),
      makeTriangle("tri_1"),
      makeFreehand("fre_1"),
    ]);
    const copy = cloneProject(project);
    expect(copy.screens[0].children?.map((node) => node.type)).toEqual([
      "circle",
      "triangle",
      "freehand",
    ]);
    expect(copy.screens[0].children?.[2].props).toEqual(project.screens[0].children?.[2].props);
    copy.screens[0].children![0].frame!.x = 99;
    expect(project.screens[0].children![0].frame!.x).toBe(4);
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
    expect(defaultFrameFor("circle", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 32,
      height: 32,
    });
    expect(defaultFrameFor("triangle", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 36,
      height: 32,
    });
    expect(defaultFrameFor("freehand", "screen_main", project)).toEqual({
      x: 8,
      y: 8,
      width: 1,
      height: 1,
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

describe("fitTextNodeFrame", () => {
  it("shrinks an oversized label frame to the text bounds", () => {
    const node = makeLabel("l_a", "Hi");
    const fitted = fitTextNodeFrame(node, { x: 3, y: 4, width: 120, height: 80 });
    expect(fitted.x).toBe(3);
    expect(fitted.y).toBe(4);
    expect(fitted.width).toBeLessThan(120);
    expect(fitted.height).toBeLessThan(80);
    expect(fitted.height).toBe(normalizeTextNodeFrame(node, fitted).height);
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

describe("cloneWidgetSubtree", () => {
  it("remaps nested ids and keeps structure", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_1")]);
    const used = new Set(["screen_main", "pan_1", "lbl_1", "btn_1"]);
    const clone = cloneWidgetSubtree(panel, used);
    expect(clone.id).not.toBe("pan_1");
    expect(clone.children?.map((child) => child.id)).toEqual(
      expect.not.arrayContaining(["lbl_1", "btn_1"]),
    );
    expect(clone.children).toHaveLength(2);
    expect(clone.children?.[0].type).toBe("label");
    expect(clone.children?.[1].type).toBe("button");
    expect(used.has(clone.id)).toBe(true);
  });

  it("rejects screen nodes", () => {
    const screen = makeFixtureProject().screens[0];
    expect(() => cloneWidgetSubtree(screen, new Set())).toThrow(/screen/i);
  });
});

describe("deepCloneWidget", () => {
  it("does not share nested references", () => {
    const label = makeLabel("lbl_1");
    const clone = deepCloneWidget(label);
    clone.frame!.x = 99;
    expect(label.frame!.x).toBe(8);
  });
});

describe("pruneCopySelection", () => {
  it("drops the screen root and nested descendants of selected ancestors", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    const project = withChildren(makeFixtureProject(), [panel, makeButton("btn_1")]);
    expect(
      pruneCopySelection(project, ["screen_main", "pan_1", "lbl_1", "btn_1"], "screen_main"),
    ).toEqual(["pan_1", "btn_1"]);
  });

  it("returns an empty list for empty or screen-only selection", () => {
    const project = makeFixtureProject();
    expect(pruneCopySelection(project, [], "screen_main")).toEqual([]);
    expect(pruneCopySelection(project, ["screen_main"], "screen_main")).toEqual([]);
    expect(pruneCopySelection(project, ["missing"], "screen_main")).toEqual([]);
  });

  it("keeps document order for multiple roots", () => {
    const project = withChildren(makeFixtureProject(), [
      makeButton("btn_1"),
      makeLabel("lbl_1"),
      makePanel("pan_1"),
    ]);
    expect(pruneCopySelection(project, ["pan_1", "btn_1", "lbl_1"], "screen_main")).toEqual([
      "btn_1",
      "lbl_1",
      "pan_1",
    ]);
  });
});

describe("insertChildAfter", () => {
  it("inserts the child immediately after the sibling", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1"), makeLabel("lbl_2")]);
    const ok = insertChildAfter(project, "lbl_1", makeButton("btn_1"));
    expect(ok).toBe(true);
    expect(project.screens[0].children?.map((child) => child.id)).toEqual([
      "lbl_1",
      "btn_1",
      "lbl_2",
    ]);
  });

  it("returns false when the sibling is missing", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    expect(insertChildAfter(project, "missing", makeButton("btn_1"))).toBe(false);
    expect(project.screens[0].children).toHaveLength(1);
  });
});

describe("offsetWidgetFrame", () => {
  it("offsets only the root frame", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    panel.frame = { x: 4, y: 6, width: 40, height: 20 };
    panel.children![0].frame = { x: 1, y: 2, width: 10, height: 7 };
    offsetWidgetFrame(panel, 8, 8);
    expect(panel.frame).toEqual({ x: 12, y: 14, width: 40, height: 20 });
    expect(panel.children![0].frame).toEqual({ x: 1, y: 2, width: 10, height: 7 });
  });

  it("no-ops when the node has no frame", () => {
    const node = makeLabel("lbl_1");
    delete node.frame;
    offsetWidgetFrame(node, 8, 8);
    expect(node.frame).toBeUndefined();
  });
});

describe("cloneWidgetSubtree uniqueness", () => {
  it("avoids colliding with already used ids across multiple clones", () => {
    const used = new Set(["lab_1", "lab_2"]);
    const first = cloneWidgetSubtree(makeLabel("source"), used);
    const second = cloneWidgetSubtree(makeLabel("source"), used);
    expect(first.id).not.toBe(second.id);
    expect(used.has(first.id)).toBe(true);
    expect(used.has(second.id)).toBe(true);
  });
});

describe("resolvePasteParentOutsideClipboard", () => {
  it("lifts the target out of a clipboard panel when pasting into that panel", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    expect(
      resolvePasteParentOutsideClipboard(project, "pan_1", [panel], "screen_main"),
    ).toBe("screen_main");
  });

  it("lifts the target when the candidate parent is nested inside a clipboard panel", () => {
    const nested = makePanel("pan_inner");
    const outer = makePanel("pan_outer", [nested]);
    const project = withChildren(makeFixtureProject(), [outer]);
    expect(
      resolvePasteParentOutsideClipboard(project, "pan_inner", [outer], "screen_main"),
    ).toBe("screen_main");
  });

  it("keeps a paste target that is outside every clipboard panel", () => {
    const source = makePanel("pan_src");
    const target = makePanel("pan_dst");
    const project = withChildren(makeFixtureProject(), [source, target]);
    expect(
      resolvePasteParentOutsideClipboard(project, "pan_dst", [source], "screen_main"),
    ).toBe("pan_dst");
  });

  it("does not lift when the clipboard root is not a panel", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    const label = makeLabel("lbl_src");
    const project = withChildren(makeFixtureProject(), [panel, label]);
    expect(
      resolvePasteParentOutsideClipboard(project, "pan_1", [label], "screen_main"),
    ).toBe("pan_1");
  });
});

describe("lockWidgetSubtree", () => {
  it("locks the node and every nested descendant", () => {
    const nested = makePanel("pan_inner", [makeLabel("lbl_deep")]);
    const panel = makePanel("pan_1", [makeButton("btn_1"), nested]);
    lockWidgetSubtree(panel);
    expect(panel.locked).toBe(true);
    expect(panel.children?.[0].locked).toBe(true);
    expect(panel.children?.[1].locked).toBe(true);
    expect(panel.children?.[1].children?.[0].locked).toBe(true);
  });
});
