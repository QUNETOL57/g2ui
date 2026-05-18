import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";

import {
  makeButton,
  makeFixtureProject,
  makeIcon,
  makeLabel,
  makePanel,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("store: initial state", () => {
  it("starts with a blank project and clean history", () => {
    const s = get();
    expect(s.project.screens[0].id).toBe("screen_main");
    expect(s.activeScreenId).toBe("screen_main");
    expect(s.selectedNodeId).toBeNull();
    expect(s.historyPast).toEqual([]);
    expect(s.historyFuture).toEqual([]);
    expect(s.lastError).toBeNull();
  });
});

describe("store: setProject / loadHelloSample", () => {
  it("setProject replaces project and snapshots previous state to history", () => {
    const prevId = get().project.id;
    const next = makeFixtureProject({ id: "loaded", name: "Loaded" });
    get().setProject(next);
    const s = get();
    expect(s.project.id).toBe("loaded");
    expect(s.activeScreenId).toBe(next.initialScreenId);
    expect(s.selectedNodeId).toBeNull();
    expect(s.historyPast).toHaveLength(1);
    expect(s.historyPast[0].project.id).toBe(prevId);
  });

  it("loadHelloSample loads the hello sample", () => {
    get().loadHelloSample();
    const s = get();
    expect(s.project).toBeDefined();
    expect(s.project.screens.length).toBeGreaterThan(0);
  });
});

describe("store: selection & active screen", () => {
  it("selectNode updates selectedNodeId and clears draftFrame", () => {
    get().selectNode("x");
    expect(get().selectedNodeId).toBe("x");
    get().setDraftFrame({ nodeId: "x", frame: { x: 0, y: 0, width: 5, height: 5 } });
    expect(get().draftFrame).not.toBeNull();
    get().selectNode(null);
    expect(get().selectedNodeId).toBeNull();
    expect(get().draftFrame).toBeNull();
  });

  it("setActiveScreen updates activeScreenId and resets selection", () => {
    get().setActiveScreen("screen_other");
    expect(get().activeScreenId).toBe("screen_other");
    expect(get().selectedNodeId).toBeNull();
  });
});

describe("store: setDisplaySize", () => {
  it("ignores invalid sizes", () => {
    const before = get().project.display.width;
    get().setDisplaySize(0, 100);
    get().setDisplaySize(100, -1);
    expect(get().project.display.width).toBe(before);
  });

  it("ignores no-op sizes", () => {
    const before = get().historyPast.length;
    const { width, height } = get().project.display;
    get().setDisplaySize(width, height);
    expect(get().historyPast).toHaveLength(before);
  });

  it("updates display and resizes screens of matching dimensions", () => {
    get().setDisplaySize(320, 240);
    const s = get();
    expect(s.project.display.width).toBe(320);
    expect(s.project.display.height).toBe(240);
    expect(s.project.screens[0].width).toBe(320);
    expect(s.project.screens[0].height).toBe(240);
  });
});

describe("store: addWidget / deleteNode", () => {
  it("adds a widget under the given parent and selects it", () => {
    const id = get().addWidget("screen_main", "label");
    expect(id).toBeTruthy();
    const node = findNode(get().project, id!);
    expect(node?.type).toBe("label");
    expect(get().selectedNodeId).toBe(id);
    expect(get().historyPast).toHaveLength(1);
  });

  it("does not delete the screen if it is the active root", () => {
    get().deleteNode("screen_main");
    expect(get().project.screens.length).toBe(1);
  });

  it("deletes a child node and clears selection if it was selected", () => {
    const id = get().addWidget("screen_main", "label")!;
    get().selectNode(id);
    get().deleteNode(id);
    expect(findNode(get().project, id)).toBeNull();
    expect(get().selectedNodeId).toBeNull();
  });

  it("does nothing when deleting non-existent node", () => {
    const initialPast = get().historyPast.length;
    get().deleteNode("ghost");
    expect(get().historyPast).toHaveLength(initialPast);
  });
});

describe("store: moveNode / moveNodeToIndex / moveNodeToParentIndex", () => {
  it("moveNode swaps siblings up/down within their parent", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("a"),
      makeLabel("b"),
      makeLabel("c"),
    ]);
    get().setProject(project);
    get().moveNode("b", "up");
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(["b", "a", "c"]);
    get().moveNode("a", "down");
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });

  it("moveNode does nothing past edges", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("a"),
      makeLabel("b"),
    ]);
    get().setProject(project);
    const before = get().project.screens[0].children?.map((c) => c.id);
    get().moveNode("a", "up");
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(before);
    get().moveNode("b", "down");
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(before);
  });

  it("moveNodeToIndex reorders within the same parent", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("a"),
      makeLabel("b"),
      makeLabel("c"),
    ]);
    get().setProject(project);
    get().moveNodeToIndex("c", 0);
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(["c", "a", "b"]);
  });

  it("moveNodeToIndex clamps to valid range", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("a"), makeLabel("b")]);
    get().setProject(project);
    get().moveNodeToIndex("a", 99);
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("moveNodeToParentIndex reparents a node", () => {
    const panel = makePanel("pn", []);
    const project = withChildren(makeFixtureProject(), [panel, makeLabel("lbl_1")]);
    get().setProject(project);
    get().moveNodeToParentIndex("lbl_1", "pn", 0);
    const newPanel = findNode(get().project, "pn");
    expect(newPanel?.children?.[0]?.id).toBe("lbl_1");
    expect(get().selectedNodeId).toBe("lbl_1");
  });

  it("moveNodeToParentIndex refuses to move into self", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pn", [makeLabel("a")])]);
    get().setProject(project);
    get().moveNodeToParentIndex("pn", "pn", 0);
    expect(findNode(get().project, "pn")?.id).toBe("pn");
  });

  it("moveNodeToParentIndex refuses to move into descendant", () => {
    const panel = makePanel("pn", [makeLabel("a")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    get().setProject(project);
    get().moveNodeToParentIndex("pn", "a", 0);
    expect(findNode(get().project, "pn")).toBeTruthy();
  });
});

describe("store: reparentNode / absolutizeLayout", () => {
  it("reparentNode moves node to a different parent", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("p1"), makeLabel("l")]);
    get().setProject(project);
    get().reparentNode("l", "p1");
    expect(findNode(get().project, "p1")?.children?.[0]?.id).toBe("l");
  });

  it("reparentNode refuses to reparent into descendant", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("p1", [makeLabel("inner")])]);
    get().setProject(project);
    get().reparentNode("p1", "inner");
    expect(findNode(get().project, "p1")?.children?.[0]?.id).toBe("inner");
  });

  it("absolutizeLayout switches parent layout to absolute and applies child frames", () => {
    const panel = makePanel("p1", [makeLabel("a"), makeLabel("b")]);
    panel.layout = { mode: "row" };
    const project = withChildren(makeFixtureProject(), [panel]);
    get().setProject(project);
    get().absolutizeLayout("p1", [
      { id: "a", frame: { x: 5, y: 5, width: 10, height: 7 } },
      { id: "b", frame: { x: 50, y: 0, width: 12, height: 7 } },
    ]);
    const updated = findNode(get().project, "p1");
    expect(updated?.layout?.mode).toBe("absolute");
    expect(findNode(get().project, "a")?.frame?.x).toBe(5);
    expect(findNode(get().project, "b")?.frame?.x).toBe(50);
  });
});

describe("store: updateNode / updateFrame / updateProps / updateLayout / updateStyle", () => {
  it("updateNode merges patch into node", () => {
    const id = get().addWidget("screen_main", "label")!;
    get().updateNode(id, { name: "renamed", visible: false });
    const node = findNode(get().project, id);
    expect(node?.name).toBe("renamed");
    expect(node?.visible).toBe(false);
  });

  it("updateFrame replaces frame coords", () => {
    const id = get().addWidget("screen_main", "button")!;
    get().updateFrame(id, { x: 11, y: 22 });
    const f = findNode(get().project, id)?.frame;
    expect(f?.x).toBe(11);
    expect(f?.y).toBe(22);
  });

  it("updateFrame normalizes icon frames to integer multiples", async () => {
    const { getResolvedIconDefinition } = await import("@entities/icon/iconSizing");
    const icon = getResolvedIconDefinition("earth");
    const project = withChildren(makeFixtureProject(), [makeIcon("ic", "earth")]);
    get().setProject(project);
    get().updateFrame("ic", {
      width: icon.width * 3 + 1,
      height: icon.height * 3 + 1,
    });
    const after = findNode(get().project, "ic")!;
    expect(after.frame!.width % icon.width).toBe(0);
    expect(after.frame!.height % icon.height).toBe(0);
  });

  it("updateProps merges and snaps icon frame to size of new icon", () => {
    const id = get().addWidget("screen_main", "icon")!;
    get().updateProps(id, { iconId: "earth" });
    const node = findNode(get().project, id);
    expect((node?.props as { iconId: string }).iconId).toBe("earth");
    expect(node?.frame?.width).toBeGreaterThan(0);
  });

  it("updateProps re-normalizes label frame", () => {
    const id = get().addWidget("screen_main", "label")!;
    get().updateProps(id, { text: "Goodbye", fontSize: 7 });
    const node = findNode(get().project, id);
    expect((node?.props as { text: string }).text).toBe("Goodbye");
    expect(node?.frame?.height).toBeGreaterThan(0);
  });

  it("updateLayout merges layout patch with sensible defaults", () => {
    const id = get().addWidget("screen_main", "panel")!;
    get().updateLayout(id, { mode: "row", padding: 4, gap: 2 });
    const layout = findNode(get().project, id)?.layout;
    expect(layout?.mode).toBe("row");
    expect(layout?.padding).toBe(4);
    expect(layout?.gap).toBe(2);
    expect(layout?.align).toBeDefined();
  });

  it("updateStyle merges style patch", () => {
    const id = get().addWidget("screen_main", "button")!;
    get().updateStyle(id, { drawBackground: true, background: { kind: "hex", value: "#abcdef" } });
    const style = findNode(get().project, id)?.style;
    expect(style?.drawBackground).toBe(true);
    expect(style?.background).toEqual({ kind: "hex", value: "#abcdef" });
  });

  it("no-ops for non-existent ids", () => {
    expect(() => get().updateNode("ghost", { name: "x" })).not.toThrow();
    expect(() => get().updateFrame("ghost", { x: 0 })).not.toThrow();
    expect(() => get().updateProps("ghost", {})).not.toThrow();
    expect(() => get().updateLayout("ghost", {})).not.toThrow();
    expect(() => get().updateStyle("ghost", {})).not.toThrow();
  });
});

describe("store: undo / redo", () => {
  it("undo restores previous project state and redo re-applies", () => {
    const id1 = get().addWidget("screen_main", "label")!;
    const id2 = get().addWidget("screen_main", "button")!;
    expect(findNode(get().project, id1)).toBeTruthy();
    expect(findNode(get().project, id2)).toBeTruthy();

    get().undo();
    expect(findNode(get().project, id2)).toBeNull();
    expect(findNode(get().project, id1)).toBeTruthy();

    get().redo();
    expect(findNode(get().project, id2)).toBeTruthy();
  });

  it("undo is no-op when history is empty", () => {
    const before = get().project;
    get().undo();
    expect(get().project).toEqual(before);
  });

  it("redo is no-op when future is empty", () => {
    get().addWidget("screen_main", "label");
    const after = get().project;
    get().redo();
    expect(get().project).toEqual(after);
  });

  it("new mutation clears redo future", () => {
    get().addWidget("screen_main", "label");
    get().undo();
    expect(get().historyFuture.length).toBeGreaterThan(0);
    get().addWidget("screen_main", "button");
    expect(get().historyFuture).toEqual([]);
  });
});

describe("store: import / export JSON", () => {
  it("exportJson produces valid JSON of the current project", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("a"), makeButton("b")]);
    get().setProject(project);
    const json = get().exportJson();
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("fixture");
    expect(parsed.screens[0].children).toHaveLength(2);
  });

  it("importJson loads a valid project and clears lastError", () => {
    const project = makeFixtureProject({ id: "imported" });
    const ok = get().importJson(JSON.stringify(project));
    expect(ok).toBe(true);
    expect(get().project.id).toBe("imported");
    expect(get().lastError).toBeNull();
  });

  it("importJson sets lastError for invalid project", () => {
    const ok = get().importJson('{"bogus": true}');
    expect(ok).toBe(false);
    expect(get().lastError).toBeTruthy();
  });

  it("importJson sets lastError for malformed JSON", () => {
    const ok = get().importJson("not json");
    expect(ok).toBe(false);
    expect(get().lastError).toBeTruthy();
  });
});
