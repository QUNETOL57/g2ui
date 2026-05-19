import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { TreePanel } from "@widgets/tree-panel/TreePanel";

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

describe("TreePanel: rendering", () => {
  it("renders the screen as root node", () => {
    render(<TreePanel />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("screen")).toBeInTheDocument();
  });

  it("renders nested children", () => {
    const project = withChildren(makeFixtureProject(), [
      makePanel("pn_1", [makeLabel("lbl_inner")]),
    ]);
    get().setProject(project);
    render(<TreePanel />);
    expect(screen.getAllByText("pn_1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("lbl_inner").length).toBeGreaterThan(0);
  });

  it("shows 'No active screen' when active screen id is invalid", () => {
    useEditorStore.setState({ activeScreenId: "no_such_screen" });
    render(<TreePanel />);
    expect(screen.getByText("No active screen")).toBeInTheDocument();
  });
});

describe("TreePanel: add widget bar", () => {
  it("adds a panel into the active screen", async () => {
    render(<TreePanel />);
    await userEvent.click(screen.getByText("+ panel"));
    const panel = get().project.screens[0].children?.[0];
    expect(panel?.type).toBe("panel");
  });

  it("adds child into selected panel", async () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pn_1")]);
    get().setProject(project);
    get().selectNode("pn_1");
    render(<TreePanel />);
    await userEvent.click(screen.getByText("+ label"));
    const panel = findNode(get().project, "pn_1");
    expect(panel?.children?.length).toBe(1);
    expect(panel?.children?.[0].type).toBe("label");
  });
});

describe("TreePanel: selection & move actions", () => {
  it("clicking a row selects the node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    render(<TreePanel />);
    const labels = screen.getAllByText("lbl_1");
    await userEvent.click(labels[0]);
    expect(get().selectedNodeId).toBe("lbl_1");
  });

  it("up/down/delete buttons are disabled when nothing selected", () => {
    render(<TreePanel />);
    expect(screen.getByTitle("Move up")).toBeDisabled();
    expect(screen.getByTitle("Move down")).toBeDisabled();
    expect(screen.getByTitle("Delete")).toBeDisabled();
  });

  it("move-up reorders siblings", async () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("a"),
      makeLabel("b"),
    ]);
    get().setProject(project);
    get().selectNode("b");
    render(<TreePanel />);
    await userEvent.click(screen.getByTitle("Move up"));
    expect(get().project.screens[0].children?.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("delete removes node and disables button when screen is selected", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1")]);
    get().setProject(project);
    get().selectNode("bt_1");
    render(<TreePanel />);
    await userEvent.click(screen.getByTitle("Delete"));
    expect(get().project.screens[0].children).toEqual([]);
  });

  it("delete button disabled when only the screen is selected", () => {
    get().selectNode("screen_main");
    render(<TreePanel />);
    expect(screen.getByTitle("Delete")).toBeDisabled();
  });
});
