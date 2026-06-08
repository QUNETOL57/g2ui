import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";

import {
  makeFixtureProject,
  makeLabel,
  makeSecondScreen,
  withChildren,
  withScreens,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("store: addScreen", () => {
  it("creates a new empty screen with display dimensions", () => {
    const id = get().addScreen("Settings");
    expect(id).toBeTruthy();
    const s = get();
    const screen = s.project.screens.find((item) => item.id === id);
    expect(screen?.name).toBe("Settings");
    expect(screen?.width).toBe(s.project.display.width);
    expect(screen?.height).toBe(s.project.display.height);
    expect(screen?.children).toEqual([]);
  });

  it("switches active screen to the newly created screen", () => {
    const id = get().addScreen()!;
    expect(get().activeScreenId).toBe(id);
  });

  it("records history", () => {
    const before = get().historyPast.length;
    get().addScreen();
    expect(get().historyPast.length).toBe(before + 1);
  });
});

describe("store: duplicateScreen", () => {
  it("clones screen subtree with new ids", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    const copyId = get().duplicateScreen("screen_main")!;
    const copy = get().project.screens.find((s) => s.id === copyId);
    expect(copy).toBeTruthy();
    expect(copy!.id).not.toBe("screen_main");
    const label = copy!.children?.[0];
    expect(label?.id).not.toBe("lbl_1");
    expect((label?.props as { text?: string })?.text).toBe("Hi");
  });

  it("inserts duplicate after the source screen", () => {
    const project = withScreens(makeFixtureProject(), [
      makeSecondScreen("screen_a", "A"),
      makeSecondScreen("screen_b", "B"),
    ]);
    get().setProject(project);
    get().duplicateScreen("screen_a");
    expect(get().project.screens.map((s) => s.id)).toEqual([
      "screen_a",
      expect.stringMatching(/^screen_\d+$/),
      "screen_b",
    ]);
  });

  it("activates the duplicated screen", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen(),
    ]);
    get().setProject(project);
    const copyId = get().duplicateScreen("screen_main")!;
    expect(get().activeScreenId).toBe(copyId);
  });
});

describe("store: removeScreen", () => {
  it("returns false when trying to remove the last screen", () => {
    expect(get().removeScreen("screen_main")).toBe(false);
    expect(get().project.screens).toHaveLength(1);
  });

  it("removes a screen and reassigns activeScreenId", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_other", "Other"),
    ]);
    get().setProject(project);
    get().setActiveScreen("screen_other");
    expect(get().removeScreen("screen_other")).toBe(true);
    expect(get().project.screens).toHaveLength(1);
    expect(get().activeScreenId).toBe("screen_main");
  });

  it("reassigns initialScreenId when the boot screen is removed", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen("screen_boot", "Boot"),
    ]);
    project.initialScreenId = "screen_boot";
    get().setProject(project);
    get().removeScreen("screen_boot");
    expect(get().project.initialScreenId).toBe("screen_main");
  });
});

describe("store: moveScreen", () => {
  it("reorders screens in the project", () => {
    const project = withScreens(makeFixtureProject(), [
      makeSecondScreen("screen_a", "A"),
      makeSecondScreen("screen_b", "B"),
      makeSecondScreen("screen_c", "C"),
    ]);
    get().setProject(project);
    get().moveScreen("screen_c", 0);
    expect(get().project.screens.map((s) => s.id)).toEqual(["screen_c", "screen_a", "screen_b"]);
  });

  it("ignores no-op moves", () => {
    const project = withScreens(makeFixtureProject(), [
      makeSecondScreen("screen_a", "A"),
      makeSecondScreen("screen_b", "B"),
    ]);
    get().setProject(project);
    const before = get().historyPast.length;
    get().moveScreen("screen_a", 0);
    expect(get().historyPast.length).toBe(before);
  });
});

describe("store: setActiveScreen with multiple screens", () => {
  it("clears selection when switching screens", () => {
    const project = withChildren(
      withScreens(makeFixtureProject(), [
        makeFixtureProject().screens[0],
        makeSecondScreen(),
      ]),
      [makeLabel("lbl_1")],
    );
    get().setProject(project);
    get().selectNode("lbl_1");
    get().setActiveScreen("screen_other");
    expect(get().selectedNodeId).toBeNull();
    expect(findNode(get().project, "lbl_1")).toBeTruthy();
  });
});
