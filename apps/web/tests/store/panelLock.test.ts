import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";

import {
  makeButton,
  makeFixtureProject,
  makeLabel,
  makePanel,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("store: panel lock cascade", () => {
  it("locks every descendant when a panel is locked", () => {
    const nested = makePanel("pan_inner", [makeLabel("lbl_deep")]);
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_1"), nested]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));

    get().updateNode("pan_1", { locked: true });

    expect(findNode(get().project, "pan_1")?.locked).toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).toBe(true);
    expect(findNode(get().project, "btn_1")?.locked).toBe(true);
    expect(findNode(get().project, "pan_inner")?.locked).toBe(true);
    expect(findNode(get().project, "lbl_deep")?.locked).toBe(true);
  });

  it("allows unlocking a child independently while the panel stays locked", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().updateNode("pan_1", { locked: true });

    get().updateNode("lbl_1", { locked: false });

    expect(findNode(get().project, "pan_1")?.locked).toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).toBe(false);
    expect(findNode(get().project, "btn_1")?.locked).toBe(true);
  });

  it("does not unlock children when the panel is unlocked", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().updateNode("pan_1", { locked: true });

    get().updateNode("pan_1", { locked: false });

    expect(findNode(get().project, "pan_1")?.locked).toBe(false);
    expect(findNode(get().project, "lbl_1")?.locked).toBe(true);
    expect(findNode(get().project, "btn_1")?.locked).toBe(true);
  });

  it("re-locks previously unlocked children when the panel is locked again", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().updateNode("pan_1", { locked: true });
    get().updateNode("lbl_1", { locked: false });

    get().updateNode("pan_1", { locked: true });

    expect(findNode(get().project, "pan_1")?.locked).toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).toBe(true);
  });

  it("does not cascade when locking a non-panel widget", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel, makeButton("btn_1")]));

    get().updateNode("btn_1", { locked: true });

    expect(findNode(get().project, "btn_1")?.locked).toBe(true);
    expect(findNode(get().project, "pan_1")?.locked).not.toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).not.toBe(true);
  });

  it("records a single history entry for cascaded panel lock", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    const beforePast = get().historyPast.length;

    get().updateNode("pan_1", { locked: true });

    expect(get().historyPast.length).toBe(beforePast + 1);
    get().undo();
    expect(findNode(get().project, "pan_1")?.locked).not.toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).not.toBe(true);
  });
});
