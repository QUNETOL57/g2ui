import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { CanvasToolbar } from "@widgets/canvas-workspace/CanvasToolbar";

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

describe("CanvasToolbar: create tools", () => {
  it("adds a panel into the active screen", async () => {
    render(<CanvasToolbar />);
    await userEvent.click(screen.getByRole("button", { name: "Add panel" }));
    const panel = get().project.screens[0].children?.[0];
    expect(panel?.type).toBe("panel");
  });

  it("opens the group menu when its main button is clicked", async () => {
    render(<CanvasToolbar />);
    await userEvent.click(screen.getByRole("button", { name: "Shapes" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Rectangle" }));
    const node = get().project.screens[0].children?.[0];
    expect(node?.type).toBe("rect");
  });

  it("adds a grouped tool selected from its dropdown", async () => {
    render(<CanvasToolbar />);
    await userEvent.click(screen.getByRole("button", { name: "Shapes tools" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Line" }));
    const node = get().project.screens[0].children?.[0];
    expect(node?.type).toBe("line");
  });

  it("adds child into selected panel", async () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pn_1")]);
    get().setProject(project);
    get().selectNode("pn_1");
    render(<CanvasToolbar />);
    await userEvent.click(screen.getByRole("button", { name: "Text" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Label" }));
    const panel = findNode(get().project, "pn_1");
    expect(panel?.children?.length).toBe(1);
    expect(panel?.children?.[0].type).toBe("label");
  });
});

describe("CanvasToolbar: arrange actions", () => {
  it("up/down/delete are disabled when nothing is selected", () => {
    render(<CanvasToolbar />);
    expect(screen.getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("move-up reorders siblings", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("a"), makeLabel("b")]);
    get().setProject(project);
    get().selectNode("b");
    render(<CanvasToolbar />);
    await userEvent.click(screen.getByRole("button", { name: "Move up" }));
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("delete removes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1")]);
    get().setProject(project);
    get().selectNode("bt_1");
    render(<CanvasToolbar />);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(get().project.screens[0].children).toEqual([]);
  });

  it("delete is disabled when only the screen is selected", () => {
    get().selectNode("screen_main");
    render(<CanvasToolbar />);
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });
});
