import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { TreePanel } from "@widgets/tree-panel/TreePanel";

import {
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

describe("TreePanel: selection", () => {
  it("clicking a row selects the node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    render(<TreePanel />);
    const labels = screen.getAllByText("lbl_1");
    await userEvent.click(labels[0]);
    expect(get().selectedNodeId).toBe("lbl_1");
  });
});

describe("TreePanel: visibility", () => {
  it("shows visibility toggle for child nodes but not for the screen root", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    render(<TreePanel />);

    const screenRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "screen_main");
    expect(screenRow).toBeTruthy();
    expect(screenRow).toHaveAttribute("data-tree-node-type", "screen");
    expect(within(screenRow!).queryByRole("button", { name: /Hide|Show/ })).not.toBeInTheDocument();

    const labelRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "lbl_1");
    expect(labelRow).toBeTruthy();
    expect(within(labelRow!).getByRole("button", { name: "Hide lbl_1" })).toBeInTheDocument();
  });

  it("toggles visibility without changing the current selection", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<TreePanel />);

    await userEvent.click(screen.getByRole("button", { name: "Hide lbl_1" }));

    expect(get().selectedNodeId).toBe("lbl_1");
    expect(get().project.screens[0].children?.[0].visible).toBe(false);
    expect(screen.getByRole("button", { name: "Show lbl_1" })).toBeInTheDocument();
  });
});
