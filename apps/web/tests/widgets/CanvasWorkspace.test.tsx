import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";

import {
  makeButton,
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
  it("renders zoom control in the toolbar", () => {
    render(<CanvasWorkspace />);
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByText(/×/)).toBeInTheDocument();
  });

  it("renders panel toggle buttons when handlers are provided", () => {
    const onToggleLeft = vi.fn();
    const onToggleRight = vi.fn();
    render(
      <CanvasWorkspace
        onToggleLeftPanel={onToggleLeft}
        onToggleRightPanel={onToggleRight}
      />,
    );
    expect(screen.getByRole("button", { name: "Hide widget tree" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide properties" })).toBeInTheDocument();
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

  it("edits selected label text inline on the canvas", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Old")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    const node = screen.getByLabelText("Old");
    fireEvent.doubleClick(node);

    const input = screen.getByLabelText("edit label text");
    fireEvent.change(input, { target: { value: "New" } });
    expect(input).toHaveValue("New");
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("Old");

    fireEvent.blur(input);
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("New");

    get().undo();
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("Old");
  });

  it("keeps inline label text local while typing and commits it on blur", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Old")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    fireEvent.doubleClick(screen.getByLabelText("Old"));
    const input = screen.getByLabelText("edit label text");
    fireEvent.change(input, { target: { value: "New label that grows" } });

    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("Old");
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(get().draftFrame?.nodeId).toBe("lbl_1");
    expect(get().draftFrame?.frame.width).toBeGreaterThan(
      get().project.screens[0].children?.[0].frame?.width ?? 0,
    );

    fireEvent.blur(input);
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("New label that grows");
    expect(get().draftFrame).toBeNull();
  });

  it("edits selected button text inline on the canvas", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    fireEvent.doubleClick(screen.getByLabelText("Save"));
    const input = screen.getByLabelText("edit label text");
    fireEvent.change(input, { target: { value: "Send" } });

    expect(input).toHaveValue("Send");
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("Save");
    expect(get().draftFrame).toBeNull();

    fireEvent.blur(input);
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("Send");

    get().undo();
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("Save");
  });

  it("shows full-edge resize handles for the selected widget", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Save") });

    expect(screen.getByTestId("resize-handle-n")).toBeInTheDocument();
    expect(screen.getByTestId("resize-handle-e")).toBeInTheDocument();
    expect(screen.getByTestId("resize-handle-s")).toBeInTheDocument();
    expect(screen.getByTestId("resize-handle-w")).toBeInTheDocument();
    expect(screen.getByTestId("resize-handle-e")).toHaveStyle({ height: "48px" });
  });

  it("resizes the selected widget from the right edge", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Save") });
    fireEvent.mouseDown(screen.getByTestId("resize-handle-e"), { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: 20, clientY: 0 });
    fireEvent.mouseUp(window);

    const frame = get().project.screens[0].children?.[0].frame;
    expect(frame?.x).toBe(8);
    expect(frame?.width).toBe(90);
  });
});
