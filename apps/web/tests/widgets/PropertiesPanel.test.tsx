import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";

import {
  makeButton,
  makeFixtureProject,
  makeIcon,
  makeLabel,
  makeLine,
  makePanel,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

function selectAndRender(nodeId: string | null) {
  if (nodeId) get().selectNode(nodeId);
  return render(<PropertiesPanel />);
}

beforeEach(() => {
  resetEditorStore();
});

describe("PropertiesPanel: empty state", () => {
  it("shows hint and shortcuts when nothing selected", () => {
    selectAndRender(null);
    expect(screen.getByText(/Select a widget/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Zoom canvas")).toBeInTheDocument();
  });
});

describe("PropertiesPanel: per-type groups", () => {
  it("for label shows SelectedGroup + FrameGroup + LabelGroup", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    selectAndRender("lbl_1");
    expect(screen.getByText(/Properties · label/)).toBeInTheDocument();
    expect(screen.getByText("Transform")).toBeInTheDocument();
    expect(screen.queryByLabelText("label text")).toBeNull();
    expect(screen.getByText("Typography")).toBeInTheDocument();
  });

  it("for button shows typography controls without a separate text field", () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    selectAndRender("bt_1");
    expect(screen.getByText(/Properties · button/)).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByText("Padding")).toBeInTheDocument();
    expect(screen.queryByLabelText("button text")).toBeNull();
  });

  it("for icon shows IconGroup search input", () => {
    const project = withChildren(makeFixtureProject(), [makeIcon("ic_1", "earth")]);
    get().setProject(project);
    selectAndRender("ic_1");
    expect(screen.getByPlaceholderText(/search or enter iconId/i)).toHaveValue("earth");
  });

  it("for panel shows LayoutGroup with mode controls", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pn_1")]);
    get().setProject(project);
    selectAndRender("pn_1");
    expect(screen.getByText("Layout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "layout mode" })).toBeInTheDocument();
  });

  it("for line shows Appearance / Stroke", () => {
    const project = withChildren(makeFixtureProject(), [makeLine("ln_1")]);
    get().setProject(project);
    selectAndRender("ln_1");
    expect(screen.getByText("Stroke")).toBeInTheDocument();
  });
});

describe("PropertiesPanel: writes to store via shared inputs", () => {
  it("rename via SelectedGroup persists to store", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    selectAndRender("lbl_1");
    const summary = screen.getByText("lbl_1").closest("div")!.parentElement!;
    const nameInput = within(summary).getByRole("textbox");
    await userEvent.type(nameInput, "renamed");
    const stored = get().project.screens[0].children?.[0];
    expect(stored?.name).toBe("renamed");
  });

  it("X frame update via FrameGroup persists to store", async () => {
    const project = withChildren(makeFixtureProject(), [
      { ...makeButton("bt_1"), frame: { x: 0, y: 0, width: 10, height: 10 } },
    ]);
    get().setProject(project);
    selectAndRender("bt_1");
    const xInput = screen.getAllByRole("spinbutton")[0];
    await userEvent.clear(xInput);
    await userEvent.type(xInput, "20");
    await userEvent.tab();
    expect(get().project.screens[0].children?.[0].frame?.x).toBe(20);
  });

  it("toggling visibility updates store", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    selectAndRender("lbl_1");
    await userEvent.click(screen.getByRole("button", { name: "Hide lbl_1" }));
    expect(get().project.screens[0].children?.[0].visible).toBe(false);
  });

  it("corner radius update persists to button style", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    selectAndRender("bt_1");

    const cornersCard = screen.getByText("Corners").closest("div")!.parentElement!;
    const radiusSlider = within(cornersCard).getByRole("slider", { name: "corner radius" });
    const radiusInput = within(cornersCard).getByLabelText("radius");
    fireEvent.change(radiusSlider, { target: { value: "6" } });

    expect(get().project.screens[0].children?.[0].style?.borderRadius).toBe(6);

    await userEvent.clear(radiusInput);
    await userEvent.type(radiusInput, "4");
    expect(get().project.screens[0].children?.[0].style?.borderRadius).toBe(4);
  });
});
