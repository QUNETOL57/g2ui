import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { WidgetNode } from "@entities/ui-project";
import { IR_WIDGET_TYPES } from "@entities/ui-project/schema";
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

function getTreeRowIds() {
  return screen
    .getAllByTestId("tree-node-row")
    .map((row) => row.dataset.treeNodeId);
}

beforeEach(() => {
  resetEditorStore();
});

describe("TreePanel: rendering", () => {
  it("renders the screen as root node with a distinct type icon", () => {
    render(<TreePanel />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("Main")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "screen node" })).toHaveAttribute("title", "screen");
    expect(screen.queryByText("screen")).not.toBeInTheDocument();
  });

  it("renders toolbar icons for every node type", () => {
    const children = IR_WIDGET_TYPES.filter((type) => type !== "screen").map(
      (type) => ({ id: `${type}_1`, type }) as WidgetNode,
    );
    get().setProject(withChildren(makeFixtureProject(), children));

    render(<TreePanel />);

    for (const type of IR_WIDGET_TYPES) {
      expect(screen.getByRole("img", { name: `${type} node` })).toBeInTheDocument();
      expect(screen.queryByText(type)).not.toBeInTheDocument();
    }
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

  it("renders a newly added screen widget at the top of the layer list", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_existing")]));
    render(<TreePanel />);

    let newId: string | null = null;
    act(() => {
      newId = get().addWidget("screen_main", "button");
    });

    expect(getTreeRowIds()).toEqual(["screen_main", newId, "lbl_existing"]);
  });

  it("renders a newly added panel child above its existing siblings", () => {
    get().setProject(
      withChildren(makeFixtureProject(), [
        makePanel("pan_1", [makeLabel("lbl_existing")]),
      ]),
    );
    render(<TreePanel />);

    let newId: string | null = null;
    act(() => {
      newId = get().addWidget("pan_1", "button");
    });

    expect(getTreeRowIds()).toEqual(["screen_main", "pan_1", newId, "lbl_existing"]);
  });

  it("shows 'No active screen' when active screen id is invalid", () => {
    useEditorStore.setState({ activeScreenId: "no_such_screen" });
    render(<TreePanel />);
    expect(screen.getByText("No active screen")).toBeInTheDocument();
  });
});

describe("TreePanel: collapse", () => {
  it("collapses and expands a panel with the twistie button", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    panel.name = "Group";
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    render(<TreePanel />);

    expect(
      screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
    ).toBe(true);
    const panelRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "pan_1");
    expect(panelRow).toHaveAttribute("data-tree-expanded", "true");

    await userEvent.click(screen.getByRole("button", { name: "Collapse Group" }));

    expect(
      screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
    ).toBe(false);
    expect(panelRow).toHaveAttribute("data-tree-expanded", "false");
    expect(screen.getByRole("button", { name: "Expand Group" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Expand Group" }));
    expect(
      screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
    ).toBe(true);
  });

  it("collapses a panel on double-click of the row", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    panel.name = "Group";
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    render(<TreePanel />);

    const panelRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "pan_1")!;
    await userEvent.dblClick(panelRow);

    expect(
      screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
    ).toBe(false);
    expect(panelRow).toHaveAttribute("data-tree-expanded", "false");
  });

  it("auto-expands collapsed ancestors when a nested node is selected", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    panel.name = "Group";
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    render(<TreePanel />);

    await userEvent.click(screen.getByRole("button", { name: "Collapse Group" }));
    expect(
      screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
    ).toBe(false);

    get().selectNode("lbl_1");

    await vi.waitFor(() => {
      expect(
        screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
      ).toBe(true);
    });
    const panelRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "pan_1");
    expect(panelRow).toHaveAttribute("data-tree-expanded", "true");
  });

  it("does not show a twistie or spacer for leaf widgets", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    render(<TreePanel />);

    const labelRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "lbl_1")!;
    expect(within(labelRow).queryByTestId("tree-node-twistie")).not.toBeInTheDocument();
    expect(within(labelRow).queryByTestId("tree-node-twistie-spacer")).not.toBeInTheDocument();
  });

  it("does not allow collapsing the screen root", () => {
    get().setProject(withChildren(makeFixtureProject(), [makeLabel("lbl_1")]));
    render(<TreePanel />);

    const screenRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "screen_main")!;
    expect(within(screenRow).queryByTestId("tree-node-twistie")).not.toBeInTheDocument();
    expect(screenRow).not.toHaveAttribute("data-tree-expanded");
    expect(
      screen.getAllByTestId("tree-node-row").some((row) => row.dataset.treeNodeId === "lbl_1"),
    ).toBe(true);
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
    expect(screenRow!.querySelector("[class*='rowVisibilitySlot']")).toBeNull();

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

describe("TreePanel: lock", () => {
  it("shows lock toggle for child nodes but not for the screen root", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    render(<TreePanel />);

    const screenRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "screen_main");
    expect(within(screenRow!).queryByRole("button", { name: /Lock|Unlock/ })).not.toBeInTheDocument();

    const labelRow = screen
      .getAllByTestId("tree-node-row")
      .find((row) => row.dataset.treeNodeId === "lbl_1");
    expect(within(labelRow!).getByRole("button", { name: "Lock lbl_1" })).toBeInTheDocument();
  });

  it("toggles lock without changing the current selection", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<TreePanel />);

    await userEvent.click(screen.getByRole("button", { name: "Lock lbl_1" }));

    expect(get().selectedNodeId).toBe("lbl_1");
    expect(get().project.screens[0].children?.[0].locked).toBe(true);
    expect(screen.getByRole("button", { name: "Unlock lbl_1" })).toBeInTheDocument();
  });

  it("locks nested children when locking a panel from the tree", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1"), makeButton("btn_1")]);
    panel.name = "Group";
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    render(<TreePanel />);

    await userEvent.click(screen.getByRole("button", { name: "Lock Group" }));

    expect(findNode(get().project, "pan_1")?.locked).toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).toBe(true);
    expect(findNode(get().project, "btn_1")?.locked).toBe(true);
    expect(screen.getByRole("button", { name: "Unlock lbl_1" })).toBeInTheDocument();
  });

  it("can unlock a child after its parent panel was locked", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_1")]);
    panel.name = "Group";
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    render(<TreePanel />);

    await userEvent.click(screen.getByRole("button", { name: "Lock Group" }));
    await userEvent.click(screen.getByRole("button", { name: "Unlock lbl_1" }));

    expect(findNode(get().project, "pan_1")?.locked).toBe(true);
    expect(findNode(get().project, "lbl_1")?.locked).toBe(false);
  });
});
