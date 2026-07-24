import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { collectIds, findNode, findParent } from "@entities/ui-project/model/tree-ops";

import {
  makeButton,
  makeFixtureProject,
  makeLabel,
  makePanel,
  makeRect,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("store: clipboard copy", () => {
  it("copies and pastes a label under the active screen", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hello")]);
    get().setProject(project);
    get().selectNode("lbl_1");

    expect(get().copySelectedNodes()).toBe(true);
    expect(get().hasClipboard).toBe(true);

    get().selectNode(null);
    const pasted = get().pasteClipboard();
    expect(pasted).toHaveLength(1);

    const original = findNode(get().project, "lbl_1");
    const copy = findNode(get().project, pasted![0]);
    expect(copy).toBeTruthy();
    expect(copy?.id).not.toBe("lbl_1");
    expect((copy?.props as { text?: string }).text).toBe("Hello");
    expect(findParent(get().project, copy!.id)?.id).toBe("screen_main");
    expect(original).toBeTruthy();
    expect(get().project.screens[0].children).toHaveLength(2);
  });

  it("returns false when nothing copyable is selected", () => {
    get().setProject(makeFixtureProject());
    expect(get().copySelectedNodes()).toBe(false);
    expect(get().hasClipboard).toBe(false);

    get().selectNode("screen_main");
    expect(get().copySelectedNodes()).toBe(false);
    expect(get().hasClipboard).toBe(false);
  });

  it("never copies the screen root", () => {
    get().setProject(makeFixtureProject());
    get().selectNode("screen_main");
    expect(get().copySelectedNodes()).toBe(false);
    expect(get().pasteClipboard()).toBeNull();
  });

  it("does not double-copy a nested child when its ancestor is selected", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().setSelection(["pan_1", "lbl_1"], "pan_1");
    get().copySelectedNodes();
    get().selectNode("screen_main");

    const pasted = get().pasteClipboard()!;
    expect(pasted).toHaveLength(1);
    expect(findNode(get().project, pasted[0])?.children).toHaveLength(1);
  });

  it("copies multiple roots and pastes them together", () => {
    get().setProject(
      withChildren(makeFixtureProject(), [makeLabel("lbl_1"), makeButton("btn_1"), makeRect("rec_1")]),
    );
    get().setSelection(["lbl_1", "rec_1"], "rec_1");
    expect(get().copySelectedNodes()).toBe(true);

    get().selectNode("screen_main");
    const pasted = get().pasteClipboard()!;
    expect(pasted).toHaveLength(2);
    expect(findNode(get().project, pasted[0])?.type).toBe("label");
    expect(findNode(get().project, pasted[1])?.type).toBe("rect");
    expect(get().selectedNodeIds).toEqual(pasted);
    expect(get().project.screens[0].children).toHaveLength(5);
  });

  it("preserves locked state on paste", () => {
    const label = makeLabel("lbl_1", "Locked");
    label.locked = true;
    get().setProject(withChildren(makeFixtureProject(), [label]));
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    get().selectNode(null);

    const pasted = get().pasteClipboard()!;
    expect(findNode(get().project, pasted[0])?.locked).toBe(true);
  });

  it("clearClipboard empties the buffer", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    expect(get().hasClipboard).toBe(true);

    get().clearClipboard();
    expect(get().hasClipboard).toBe(false);
    expect(get().pasteClipboard()).toBeNull();
  });
});

describe("store: clipboard paste", () => {
  it("pastes a copied panel outside itself when the panel stays selected", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel, makeButton("btn_1")]));
    get().selectNode("pan_1");
    get().copySelectedNodes();

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("screen_main");
    expect(findNode(get().project, "pan_1")?.children?.map((child) => child.id)).toEqual(["lbl_1"]);
    expect(get().project.screens[0].children?.map((child) => child.id)).toEqual([
      "pan_1",
      "btn_1",
      pasted[0],
    ]);
  });

  it("pastes a copied panel outside itself when a child inside it is selected", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_inner")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().selectNode("pan_1");
    get().copySelectedNodes();
    get().selectNode("lbl_1");

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("screen_main");
    expect(findNode(get().project, "pan_1")?.children).toHaveLength(2);
  });

  it("pastes a copied panel outside itself when a nested panel inside it is selected", () => {
    const nested = makePanel("pan_inner", [makeLabel("lbl_1")]);
    const outer = makePanel("pan_outer", [nested]);
    get().setProject(withChildren(makeFixtureProject(), [outer]));
    get().selectNode("pan_outer");
    get().copySelectedNodes();
    get().selectNode("pan_inner");

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("screen_main");
    expect(findNode(get().project, "pan_outer")?.children?.map((child) => child.id)).toEqual([
      "pan_inner",
    ]);
  });

  it("still pastes into a different panel that was not copied", () => {
    const source = makePanel("pan_src", [makeLabel("lbl_1")]);
    const target = makePanel("pan_dst");
    get().setProject(withChildren(makeFixtureProject(), [source, target]));
    get().selectNode("pan_src");
    get().copySelectedNodes();
    get().selectNode("pan_dst");

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("pan_dst");
  });

  it("pastes a panel with remapped nested children", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().selectNode("pan_1");
    get().copySelectedNodes();
    get().selectNode("screen_main");

    const pasted = get().pasteClipboard()!;
    expect(pasted).toHaveLength(1);
    const copy = findNode(get().project, pasted[0])!;
    expect(copy.type).toBe("panel");
    expect(copy.id).not.toBe("pan_1");
    expect(copy.children).toHaveLength(2);
    expect(copy.children?.map((child) => child.id)).toEqual(
      expect.not.arrayContaining(["lbl_1", "btn_1"]),
    );
    expect(copy.children?.[0].type).toBe("label");
    expect(copy.children?.[1].type).toBe("button");

    const ids = collectIds(get().project);
    expect(ids.size).toBe(7); // screen + original panel/children + pasted panel/children
  });

  it("pastes as a sibling when a non-container widget is selected", () => {
    const project = withChildren(makeFixtureProject(), [
      makePanel("pan_1", [makeLabel("lbl_1")]),
      makeButton("btn_1"),
    ]);
    get().setProject(project);
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    get().selectNode("lbl_1");

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("pan_1");
  });

  it("pastes inside a selected panel", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("lbl_1"),
      makePanel("pan_1"),
    ]);
    get().setProject(project);
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    get().selectNode("pan_1");

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("pan_1");
  });

  it("pastes under the active screen when selection is empty", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    get().selectNode(null);

    const pasted = get().pasteClipboard()!;
    expect(findParent(get().project, pasted[0])?.id).toBe("screen_main");
  });

  it("can paste the same clipboard multiple times with unique ids", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    get().selectNode("lbl_1");
    get().copySelectedNodes();

    const first = get().pasteClipboard()!;
    const second = get().pasteClipboard()!;
    expect(first[0]).not.toBe(second[0]);
    expect(get().project.screens[0].children).toHaveLength(3);
  });

  it("returns null when clipboard is empty", () => {
    expect(get().pasteClipboard()).toBeNull();
  });

  it("records a single history entry for paste and restores on undo/redo", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    const beforePast = get().historyPast.length;

    const pasted = get().pasteClipboard()!;
    expect(get().historyPast.length).toBe(beforePast + 1);
    expect(findNode(get().project, pasted[0])).toBeTruthy();

    get().undo();
    expect(findNode(get().project, pasted[0])).toBeNull();
    expect(get().project.screens[0].children).toHaveLength(1);

    get().redo();
    expect(findNode(get().project, pasted[0])).toBeTruthy();
    expect(get().project.screens[0].children).toHaveLength(2);
  });
});

describe("store: clipboard duplicate", () => {
  it("duplicates into the same parent after the source with a frame offset", () => {
    const button = makeButton("btn_src");
    button.frame = { x: 10, y: 12, width: 40, height: 24 };
    get().setProject(withChildren(makeFixtureProject(), [button, makeButton("btn_1")]));
    get().selectNode("btn_src");

    const duplicated = get().duplicateSelectedNodes()!;
    expect(duplicated).toHaveLength(1);
    const copy = findNode(get().project, duplicated[0])!;
    expect(copy.frame).toEqual({ x: 18, y: 20, width: 40, height: 24 });
    expect(get().project.screens[0].children?.map((child) => child.id)).toEqual([
      "btn_src",
      duplicated[0],
      "btn_1",
    ]);
    expect(get().selectedNodeIds).toEqual(duplicated);
  });

  it("duplicates multiple selected roots in document order", () => {
    get().setProject(
      withChildren(makeFixtureProject(), [makeLabel("lbl_1"), makeButton("btn_1")]),
    );
    get().setSelection(["lbl_1", "btn_1"], "btn_1");
    const duplicated = get().duplicateSelectedNodes()!;
    expect(duplicated).toHaveLength(2);
    expect(get().project.screens[0].children).toHaveLength(4);
    expect(findNode(get().project, duplicated[0])?.type).toBe("label");
    expect(findNode(get().project, duplicated[1])?.type).toBe("button");
  });

  it("duplicates a nested panel with children under the same parent", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1", "Nested")]);
    panel.frame = { x: 2, y: 4, width: 80, height: 40 };
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().selectNode("pan_1");

    const duplicated = get().duplicateSelectedNodes()!;
    const copy = findNode(get().project, duplicated[0])!;
    expect(copy.type).toBe("panel");
    expect(copy.children).toHaveLength(1);
    expect(copy.children?.[0].id).not.toBe("lbl_1");
    expect((copy.children?.[0].props as { text?: string }).text).toBe("Nested");
    expect(copy.frame).toEqual({ x: 10, y: 12, width: 80, height: 40 });
    expect(findParent(get().project, copy.id)?.id).toBe("screen_main");
  });

  it("returns null when only the screen is selected", () => {
    get().setProject(makeFixtureProject());
    get().selectNode("screen_main");
    expect(get().duplicateSelectedNodes()).toBeNull();
  });

  it("records history for duplicate and undoes it", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    get().selectNode("lbl_1");
    const beforePast = get().historyPast.length;

    const duplicated = get().duplicateSelectedNodes()!;
    expect(get().historyPast.length).toBe(beforePast + 1);

    get().undo();
    expect(findNode(get().project, duplicated[0])).toBeNull();
    expect(get().project.screens[0].children).toHaveLength(1);
  });

  it("does not write to clipboard when duplicating", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    get().selectNode("lbl_1");
    get().clearClipboard();
    get().duplicateSelectedNodes();
    expect(get().hasClipboard).toBe(false);
  });
});
