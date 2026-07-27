import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";

import {
  makeButton,
  makeCircle,
  makeFixtureProject,
  makeFreehand,
  makeIcon,
  makeLabel,
  makeLine,
  makePanel,
  makeRect,
  makeSecondScreen,
  makeTriangle,
  withChildren,
  withScreens,
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

  it("starts with select tool and default marker style", () => {
    expect(get().activeTool).toBe("select");
    expect(get().markerStyle).toEqual({
      color: { kind: "hex", value: "#FFFFFF" },
      width: 1,
    });
  });
});

describe("store: setProject / loadHelloSample", () => {
  it("setProject replaces project and snapshots previous state to history", () => {
    const prevId = get().project.id;
    const next = makeFixtureProject({ id: "loaded", name: "Loaded" });
    get().setProject(next);
    const s = get();
    expect(s.project.id).toBe("loaded");
    expect(s.activeScreenId).toBe(next.screens[0]?.id);
    expect(s.selectedNodeId).toBeNull();
    expect(s.historyPast).toHaveLength(1);
    expect(s.historyPast[0].project.id).toBe(prevId);
  });

  it("setProject activates the first screen in the list", () => {
    const project = withScreens(makeFixtureProject(), [
      makeSecondScreen("screen_top", "Top"),
      makeSecondScreen("screen_other", "Other"),
    ]);
    project.initialScreenId = "screen_other";

    get().setProject(project);
    expect(get().activeScreenId).toBe("screen_top");
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

  it("adds a widget in front of its existing siblings", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("existing")]));

    const id = get().addWidget("screen_main", "button");

    expect(get().project.screens[0].children?.map((child) => child.id)).toEqual([
      id,
      "existing",
    ]);
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

  it("fitNodeFrameToContent tightens label and icon frames", async () => {
    const { getResolvedIconDefinition } = await import("@entities/icon/iconSizing");
    const label = makeLabel("lbl_1", "Hi");
    label.frame = { x: 1, y: 2, width: 100, height: 50 };
    label.props = { ...(label.props ?? {}), textAutoSize: false };
    const icon = makeIcon("ic_1", "earth");
    const earth = getResolvedIconDefinition("earth");
    icon.frame = { x: 0, y: 0, width: earth.width * 5, height: earth.height * 5 };
    get().setProject(withChildren(makeFixtureProject(), [label, icon]));

    get().fitNodeFrameToContent("lbl_1");
    const fittedLabel = findNode(get().project, "lbl_1")!;
    expect(fittedLabel.frame!.width).toBeLessThan(100);
    expect(fittedLabel.frame!.height).toBeLessThan(50);
    expect((fittedLabel.props as { textAutoSize?: boolean }).textAutoSize).toBeUndefined();

    get().fitNodeFrameToContent("ic_1");
    expect(findNode(get().project, "ic_1")!.frame).toEqual({
      x: 0,
      y: 0,
      width: earth.width * 5,
      height: earth.height * 5,
    });
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

  it("can update props without writing history", () => {
    const id = get().addWidget("screen_main", "label")!;
    const historyLength = get().historyPast.length;
    get().updateProps(id, { text: "Draft" }, { history: false });
    const node = findNode(get().project, id);
    expect((node?.props as { text: string }).text).toBe("Draft");
    expect(get().historyPast).toHaveLength(historyLength);
  });

  it("commits a silent edit batch as one undo step", () => {
    const id = get().addWidget("screen_main", "label")!;
    get().beginHistoryBatch();
    get().updateProps(id, { text: "D" }, { history: false });
    get().updateProps(id, { text: "Dr" }, { history: false });
    get().updateProps(id, { text: "Draft" }, { history: false });
    get().commitHistoryBatch();

    const historyLength = get().historyPast.length;
    expect(historyLength).toBe(2);
    expect((findNode(get().project, id)?.props as { text: string }).text).toBe("Draft");

    get().undo();
    expect((findNode(get().project, id)?.props as { text: string }).text).toBe("Label");
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

  it("updateNode bakes shape rotation into the frame and clears CSS rotation", () => {
    const rect = { ...makeRect("rc_1"), frame: { x: 0, y: 0, width: 40, height: 20 } };
    get().setProject(withChildren(makeFixtureProject(), [rect]));

    get().updateNode("rc_1", { rotation: 45 });
    const node = findNode(get().project, "rc_1")!;
    expect(node.rotation).toBe(0);
    expect(node.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });
  });
});

describe("store: rotateSelectedNodes", () => {
  it("bakes 90° clockwise into selected shape frames", () => {
    const rect = { ...makeRect("rc_1"), frame: { x: 0, y: 0, width: 40, height: 20 } };
    const line = {
      ...makeLine("ln_1"),
      frame: { x: 0, y: 10, width: 20, height: 1 },
      props: { x1: 0, y1: 0, x2: 19, y2: 0, strokeWidth: 1 },
    };
    get().setProject(withChildren(makeFixtureProject(), [rect, line]));
    get().setSelection(["rc_1", "ln_1"]);

    expect(get().rotateSelectedNodes()).toBe(true);
    expect(findNode(get().project, "rc_1")?.rotation).toBe(0);
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });
    expect(findNode(get().project, "ln_1")?.rotation).toBe(0);
    expect(findNode(get().project, "ln_1")!.frame!.height).toBeGreaterThan(
      findNode(get().project, "ln_1")!.frame!.width,
    );
  });

  it("rotates counter-clockwise by rebuilding geometry", () => {
    const circle = { ...makeCircle("cir_1"), frame: { x: 0, y: 0, width: 40, height: 20 } };
    get().setProject(withChildren(makeFixtureProject(), [circle]));
    get().selectNode("cir_1");

    expect(get().rotateSelectedNodes(-1)).toBe(true);
    expect(findNode(get().project, "cir_1")?.rotation).toBe(0);
    expect(findNode(get().project, "cir_1")?.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });
  });

  it("skips locked nodes and non-rotatable types", () => {
    get().setProject(
      withChildren(makeFixtureProject(), [
        { ...makeTriangle("tri_1"), props: { direction: "up" }, frame: { x: 0, y: 0, width: 36, height: 20 } },
        { ...makeRect("rc_1"), frame: { x: 0, y: 0, width: 40, height: 20 }, locked: true },
        makeLabel("lbl_1"),
        makeFreehand("fre_1"),
      ]),
    );
    get().setSelection(["tri_1", "rc_1", "lbl_1", "fre_1"]);

    expect(get().rotateSelectedNodes(1)).toBe(true);
    expect(findNode(get().project, "tri_1")?.rotation).toBe(0);
    expect((findNode(get().project, "tri_1")?.props as { direction?: string }).direction).toBe("right");
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 0, y: 0, width: 40, height: 20 });
    expect(findNode(get().project, "lbl_1")?.rotation).toBeUndefined();
    expect(findNode(get().project, "fre_1")?.rotation).toBeUndefined();
  });

  it("returns false when nothing rotatable is selected", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeButton("btn_1")]));
    get().selectNode("btn_1");
    expect(get().rotateSelectedNodes()).toBe(false);

    get().selectNode(null);
    expect(get().rotateSelectedNodes()).toBe(false);
  });

  it("records history so baked rotation can be undone", () => {
    const rect = { ...makeRect("rc_1"), frame: { x: 0, y: 0, width: 40, height: 20 } };
    get().setProject(withChildren(makeFixtureProject(), [rect]));
    get().selectNode("rc_1");
    get().rotateSelectedNodes(1);
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });

    get().undo();
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 0, y: 0, width: 40, height: 20 });

    get().redo();
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });
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

describe("store: marker tool and freehand strokes", () => {
  it("starts with select tool and default marker style", () => {
    expect(get().activeTool).toBe("select");
    expect(get().markerStyle).toEqual({
      color: { kind: "hex", value: "#FFFFFF" },
      width: 1,
    });
  });

  it("setActiveTool switches between select and marker", () => {
    get().setActiveTool("marker");
    expect(get().activeTool).toBe("marker");
    get().setActiveTool("select");
    expect(get().activeTool).toBe("select");
  });

  it("updateMarkerStyle clamps width to at least 1", () => {
    get().updateMarkerStyle({ width: 0 });
    expect(get().markerStyle.width).toBe(1);
    get().updateMarkerStyle({ width: 3.7 });
    expect(get().markerStyle.width).toBe(4);
    get().updateMarkerStyle({ color: { kind: "hex", value: "#FF0000" } });
    expect(get().markerStyle.color).toEqual({ kind: "hex", value: "#FF0000" });
  });

  it("addWidget resets activeTool to select", () => {
    get().setActiveTool("marker");
    get().addWidget("screen_main", "circle");
    expect(get().activeTool).toBe("select");
  });

  it("addFreehandStroke creates a normalized freehand node and selects it", () => {
    get().updateMarkerStyle({ color: { kind: "hex", value: "#00FF00" }, width: 2 });
    const id = get().addFreehandStroke("screen_main", [
      { x: 10, y: 10 },
      { x: 12, y: 10 },
      { x: 12, y: 10 },
    ]);
    expect(id).toBeTruthy();

    const node = findNode(get().project, id!);
    expect(node?.type).toBe("freehand");
    expect(node?.frame).toEqual({ x: 10, y: 10, width: 4, height: 2 });
    expect(node?.props).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 2, y: 0 },
      ],
      strokeWidth: 2,
    });
    expect(node?.style?.borderColor).toEqual({ kind: "hex", value: "#00FF00" });
    expect(node?.style?.borderWidth).toBe(2);
    expect(get().selectedNodeId).toBe(id);
    expect(get().activeTool).toBe("select");
    expect(get().historyPast).toHaveLength(1);
  });

  it("addFreehandStroke returns null for empty point lists", () => {
    const id = get().addFreehandStroke("screen_main", []);
    expect(id).toBeNull();
    expect(get().project.screens[0].children).toEqual([]);
  });

  it("setActiveScreen resets marker tool to select", () => {
    get().setActiveTool("marker");
    get().setActiveScreen("screen_main");
    expect(get().activeTool).toBe("select");
  });
});
