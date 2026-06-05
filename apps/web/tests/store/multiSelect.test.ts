import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";

import { makeLabel, makePanel, makeFixtureProject, withChildren } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore(
    withChildren(makeFixtureProject(), [
      makeLabel("lab_1"),
      makeLabel("lab_2"),
      makeLabel("lab_3"),
      makePanel("pan_1"),
    ]),
  );
});

describe("store: multi-selection", () => {
  it("selectNode resets the multi-selection to a single node", () => {
    get().setSelection(["lab_1", "lab_2"]);
    get().selectNode("lab_3");
    expect(get().selectedNodeId).toBe("lab_3");
    expect(get().selectedNodeIds).toEqual(["lab_3"]);
  });

  it("toggleNodeSelection adds and removes nodes and tracks the primary", () => {
    get().selectNode("lab_1");
    get().toggleNodeSelection("lab_2");
    expect(get().selectedNodeIds).toEqual(["lab_1", "lab_2"]);
    expect(get().selectedNodeId).toBe("lab_2");

    get().toggleNodeSelection("lab_2");
    expect(get().selectedNodeIds).toEqual(["lab_1"]);
    expect(get().selectedNodeId).toBe("lab_1");
  });

  it("setSelection sets the list and defaults the primary to the last id", () => {
    get().setSelection(["lab_1", "lab_2", "lab_3"]);
    expect(get().selectedNodeIds).toEqual(["lab_1", "lab_2", "lab_3"]);
    expect(get().selectedNodeId).toBe("lab_3");
  });
});

describe("store: deleteNodes", () => {
  it("removes every selected node in one history step", () => {
    get().setSelection(["lab_1", "lab_3"]);
    const pastBefore = get().historyPast.length;
    get().deleteNodes(["lab_1", "lab_3"]);
    expect(findNode(get().project, "lab_1")).toBeNull();
    expect(findNode(get().project, "lab_3")).toBeNull();
    expect(findNode(get().project, "lab_2")).toBeTruthy();
    expect(get().selectedNodeIds).toEqual([]);
    expect(get().historyPast.length).toBe(pastBefore + 1);
  });

  it("never deletes the active screen", () => {
    get().deleteNodes(["screen_main", "lab_1"]);
    expect(findNode(get().project, "screen_main")).toBeTruthy();
    expect(findNode(get().project, "lab_1")).toBeNull();
  });
});

describe("store: moveNodesToTarget", () => {
  it("moves multiple nodes into a panel, preserving their order", () => {
    get().moveNodesToTarget(["lab_1", "lab_3"], "pan_1", "inside");
    const panel = findNode(get().project, "pan_1");
    expect(panel?.children?.map((c) => c.id)).toEqual(["lab_1", "lab_3"]);
    const rootIds = get().project.screens[0].children?.map((c) => c.id);
    expect(rootIds).toEqual(["lab_2", "pan_1"]);
    expect(get().selectedNodeIds).toEqual(["lab_1", "lab_3"]);
  });

  it("does not move a node into its own descendant", () => {
    resetEditorStore(
      withChildren(makeFixtureProject(), [makePanel("pan_1", [makeLabel("inner")])]),
    );
    get().moveNodesToTarget(["pan_1"], "inner", "inside");
    const root = get().project.screens[0].children?.map((c) => c.id);
    expect(root).toEqual(["pan_1"]);
  });
});
