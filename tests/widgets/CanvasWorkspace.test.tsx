import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";

import {
  makeFixtureProject,
  makeLabel,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("CanvasWorkspace: rendering", () => {
  it("renders dimensions and color format in the toolbar", () => {
    render(<CanvasWorkspace />);
    expect(screen.getAllByText(/×/).length).toBeGreaterThan(0);
    expect(screen.getByText("rgb565")).toBeInTheDocument();
  });

  it("renders zoom slider with default value", () => {
    render(<CanvasWorkspace />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    expect(slider).toBeInTheDocument();
    expect(Number(slider.value)).toBeGreaterThanOrEqual(1);
  });

  it("renders a 'no screen' fallback when active screen does not exist", () => {
    useEditorStore.setState({ activeScreenId: "no_such_screen" });
    render(<CanvasWorkspace />);
    expect(screen.getByText(/no screen/i)).toBeInTheDocument();
  });

  it("renders nested widgets onto the canvas", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi!")]);
    get().setProject(project);
    render(<CanvasWorkspace />);
    expect(screen.getByLabelText("Hi!")).toBeInTheDocument();
  });
});

describe("CanvasWorkspace: zoom", () => {
  it("updates zoom value when slider moves", async () => {
    render(<CanvasWorkspace />);
    const slider = screen.getByRole("slider") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "4" } });
    expect(screen.getByText(/4×/)).toBeInTheDocument();
  });
});

describe("CanvasWorkspace: selection", () => {
  it("clicking a node selects it; clicking stage clears selection", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Pick me")]);
    get().setProject(project);
    render(<CanvasWorkspace />);
    const node = screen.getByLabelText("Pick me");
    await userEvent.pointer({ keys: "[MouseLeft]", target: node });
    expect(get().selectedNodeId).toBe("lbl_1");
  });
});
