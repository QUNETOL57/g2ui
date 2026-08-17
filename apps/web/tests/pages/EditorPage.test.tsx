import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { EditorPage } from "@pages/editor/EditorPage";
import { selectionRectForNode } from "@widgets/canvas-workspace/lib/geometry";

import {
  makeFixtureProject,
  makeLabel,
  makeLine,
  makeRect,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("EditorPage", () => {
  it("renders project name and display size in the top bar", () => {
    const project = makeFixtureProject({ name: "MyApp" });
    get().setProject(project);
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("MyApp")).toBeInTheDocument();
    expect(
      screen.getByText(`${project.display.width} × ${project.display.height}`, { exact: false }),
    ).toBeInTheDocument();
  });

  it("calls onBackToLibrary when the brand logo is clicked", async () => {
    const back = vi.fn();
    render(<EditorPage onBackToLibrary={back} />);
    await userEvent.click(screen.getByRole("button", { name: /Back to project library/i }));
    expect(back).toHaveBeenCalled();
  });

  it("renders left panel with widget tree and screens, PropertiesPanel and status bar actions", () => {
    render(<EditorPage onBackToLibrary={() => undefined} autosaveStatus="saved" />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();
    expect(screen.getByText(/Properties/)).toBeInTheDocument();
    expect(screen.getByText("Synced")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import$/ })).toBeInTheDocument();
  });

  it("renders editor menu and shortcuts in the empty properties panel", () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);

    expect(screen.getByRole("menubar", { name: "Editor menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "View" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByText("Enter / Double-click")).toBeInTheDocument();
    expect(screen.getByText("Rotate shape 90°")).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });

  it("shows a canvas Template badge when the project is marked as a template", () => {
    render(<EditorPage onBackToLibrary={() => undefined} isTemplate />);
    expect(
      screen.getByTestId("canvas-project-meta").querySelector("[aria-label='Template']"),
    ).toBeInTheDocument();
  });

  it("hides the canvas Template badge after the flag is turned off", () => {
    const { rerender } = render(<EditorPage onBackToLibrary={() => undefined} isTemplate />);
    expect(screen.getByLabelText("Template")).toBeInTheDocument();
    rerender(<EditorPage onBackToLibrary={() => undefined} isTemplate={false} />);
    expect(screen.queryByLabelText("Template")).not.toBeInTheDocument();
  });

  it("forwards Use as template toggles from the Project menu", async () => {
    const onToggleTemplate = vi.fn();
    render(
      <EditorPage
        onBackToLibrary={() => undefined}
        isTemplate={false}
        onToggleTemplate={onToggleTemplate}
      />,
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Use as template" }));
    expect(onToggleTemplate).toHaveBeenCalledTimes(1);
  });

  it("restores Allow overflow and Show full widgets from saved project settings", async () => {
    render(
      <EditorPage
        onBackToLibrary={() => undefined}
        allowCanvasOverflow
        showFullWidgets
      />,
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Allow overflow" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" })).toBeEnabled();
    expect(screen.getByTestId("canvas-device-frame")).toHaveAttribute("data-allow-overflow", "true");
    expect(screen.getByTestId("canvas-device-frame")).toHaveAttribute("data-show-full-widgets", "true");
  });

  it("persists canvas overflow toggles to the project card", async () => {
    const onCanvasViewSettingsChange = vi.fn();
    render(
      <EditorPage
        onBackToLibrary={() => undefined}
        onCanvasViewSettingsChange={onCanvasViewSettingsChange}
      />,
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Allow overflow" }));
    expect(onCanvasViewSettingsChange).toHaveBeenCalledWith({
      allowCanvasOverflow: true,
      showFullWidgets: false,
    });
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" }));
    expect(onCanvasViewSettingsChange).toHaveBeenLastCalledWith({
      allowCanvasOverflow: true,
      showFullWidgets: true,
    });
  });

  it("renders the error banner when lastError is set", () => {
    useEditorStore.setState({ lastError: "Oops" });
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });

  it("toggles the left and right panels with icon buttons", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide widget tree" }));
    expect(screen.queryByText("Widget tree")).not.toBeInTheDocument();
    expect(screen.queryByText("Screens")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show widget tree" }));
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide properties" }));
    expect(screen.queryByText(/Select a widget/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show properties" }));
    expect(screen.getByText(/Select a widget/)).toBeInTheDocument();
  });

  it("aligns selection guides to a 90°-rotated shape AABB", () => {
    const rect = {
      ...makeRect("rc_1"),
      rotation: 90,
      frame: { x: 10, y: 20, width: 40, height: 24 },
    };
    get().setProject(withChildren(makeFixtureProject(), [rect]));
    get().selectNode("rc_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const expected = selectionRectForNode(rect, {
      x: 10,
      y: 20,
      width: 40,
      height: 24,
    });
    // Editor canvas defaults to 2× zoom.
    const zoom = 2;
    const left = `${expected.x * zoom}px`;
    const top = `${expected.y * zoom}px`;
    const width = `${expected.width * zoom}px`;
    const height = `${expected.height * zoom}px`;

    const frames = screen.getAllByTestId("selection-frame");
    const horizontalFrames = frames.filter((frame) => frame.className.includes("guideHorizontal"));
    const verticalFrames = frames.filter((frame) => frame.className.includes("guideVertical"));

    expect(horizontalFrames.map((frame) => frame.style.left)).toEqual([left, left]);
    expect(horizontalFrames.map((frame) => frame.style.width)).toEqual([width, width]);
    expect(verticalFrames.map((frame) => frame.style.top)).toEqual([top, top]);
    expect(verticalFrames.map((frame) => frame.style.height)).toEqual([height, height]);
  });

  it("toggles grid, rulers, and guides from the View menu", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    expect(screen.getAllByTestId("canvas-pixel-grid")).toHaveLength(1);
    expect(screen.getByTestId("canvas-pixel-grid")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-pixel-grid")).not.toHaveAttribute("data-overlay");
    expect(screen.getByTestId("canvas-rulers")).toBeInTheDocument();
    expect(screen.getAllByTestId("selection-guide")).toHaveLength(8);
    expect(screen.getAllByTestId("selection-frame")).toHaveLength(4);
    expect(screen.getByTestId("resize-handle-nw")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid overlay" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Rulers" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Guides" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Allow overflow" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" })).toBeDisabled();
    expect(screen.getByTestId("canvas-device-frame")).not.toHaveAttribute("data-allow-overflow");
    expect(screen.getByTestId("canvas-device-frame")).not.toHaveAttribute("data-show-full-widgets");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Grid overlay" }));
    expect(screen.getByTestId("canvas-pixel-grid")).toHaveAttribute("data-overlay", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid overlay" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid overlay" })).toBeEnabled();
    expect(screen.getAllByTestId("selection-guide")).toHaveLength(8);
    expect(
      Number(getComputedStyle(screen.getByTestId("canvas-selection-layer")).zIndex),
    ).toBeGreaterThan(Number(getComputedStyle(screen.getByTestId("canvas-pixel-grid")).zIndex));

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Grid" }));
    expect(screen.queryByTestId("canvas-pixel-grid")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid overlay" })).toBeDisabled();
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid overlay" })).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Rulers" }));
    expect(screen.queryByTestId("canvas-rulers")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Rulers" })).toHaveAttribute("aria-checked", "false");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Guides" }));
    expect(screen.queryAllByTestId("selection-guide")).toHaveLength(0);
    expect(screen.getAllByTestId("selection-frame")).toHaveLength(4);
    expect(screen.getByTestId("resize-handle-nw")).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Guides" })).toHaveAttribute("aria-checked", "false");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Allow overflow" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Allow overflow" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" })).toBeEnabled();
    expect(screen.getByTestId("canvas-device-frame")).toHaveAttribute("data-allow-overflow", "true");
    expect(screen.getByTestId("canvas-device-frame")).not.toHaveAttribute("data-show-full-widgets");
    expect(getComputedStyle(screen.getByTestId("canvas-widget-clip")).overflow).toBe("hidden");
    expect(
      getComputedStyle(
        document.querySelector('[data-testid="canvas-widget"][data-widget-id="lbl_1"]') as HTMLElement,
      ).opacity,
    ).toBe("1");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Show full widgets" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByTestId("canvas-device-frame")).toHaveAttribute("data-show-full-widgets", "true");
    expect(getComputedStyle(screen.getByTestId("canvas-widget-clip")).overflow).toBe("visible");
    expect(
      getComputedStyle(
        document.querySelector('[data-testid="canvas-widget"][data-widget-id="lbl_1"]') as HTMLElement,
      ).opacity,
    ).toBe("1");
  });
});

describe("EditorPage keyboard shortcuts", () => {
  it("Delete key removes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    await userEvent.keyboard("{Delete}");
    expect(findNode(get().project, "lbl_1")).toBeNull();
  });

  it("Backspace key removes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    await userEvent.keyboard("{Backspace}");
    expect(findNode(get().project, "lbl_1")).toBeNull();
  });

  it("does not delete when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Backspace}");
    expect(findNode(get().project, "lbl_1")).not.toBeNull();
  });

  it("does nothing when Delete is pressed with no selection", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode(null);
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const event = new KeyboardEvent("keydown", {
      key: "Delete",
      code: "Delete",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(findNode(get().project, "lbl_1")).not.toBeNull();
  });

  it("prevents Backspace default when nothing is selected", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode(null);
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const event = new KeyboardEvent("keydown", {
      key: "Backspace",
      code: "Backspace",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(findNode(get().project, "lbl_1")).not.toBeNull();
  });

  it("does not delete selected node while a modal is open", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /^Palette$/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await userEvent.keyboard("{Delete}");
    expect(findNode(get().project, "lbl_1")).not.toBeNull();
  });

  it("still prevents Delete default while a modal is open", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /^Palette$/ }));

    const event = new KeyboardEvent("keydown", {
      key: "Delete",
      code: "Delete",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(findNode(get().project, "lbl_1")).not.toBeNull();
  });

  it("Ctrl+Z triggers undo", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const id = get().addWidget("screen_main", "label")!;
    expect(findNode(get().project, id)).toBeTruthy();
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(findNode(get().project, id)).toBeNull();
  });

  it("Ctrl+Shift+Z triggers redo", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const id = get().addWidget("screen_main", "label")!;
    get().undo();
    expect(findNode(get().project, id)).toBeNull();
    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(findNode(get().project, id)).toBeTruthy();
  });

  it("Ctrl+Y triggers redo", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const id = get().addWidget("screen_main", "label")!;
    get().undo();
    expect(findNode(get().project, id)).toBeNull();
    await userEvent.keyboard("{Control>}y{/Control}");
    expect(findNode(get().project, id)).toBeTruthy();
  });

  it("Ctrl+C / Ctrl+V copies and pastes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}c{/Control}");
    expect(get().hasClipboard).toBe(true);

    await userEvent.keyboard("{Control>}v{/Control}");
    expect(get().project.screens[0].children).toHaveLength(2);
    expect(get().selectedNodeId).not.toBe("lbl_1");
    expect(findNode(get().project, get().selectedNodeId!)?.type).toBe("label");
  });

  it("Ctrl+D duplicates the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}d{/Control}");
    expect(get().project.screens[0].children).toHaveLength(2);
    expect(get().selectedNodeId).not.toBe("lbl_1");
  });

  it("does not paste when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Control>}v{/Control}");
    expect(get().project.screens[0].children).toHaveLength(1);
  });

  it("does not copy or duplicate when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Control>}c{/Control}");
    expect(get().hasClipboard).toBe(false);

    await userEvent.keyboard("{Control>}d{/Control}");
    expect(get().project.screens[0].children).toHaveLength(1);
  });

  it("does nothing for Ctrl+C when only the screen is selected", async () => {
    get().setProject(makeFixtureProject());
    get().selectNode("screen_main");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}c{/Control}");
    expect(get().hasClipboard).toBe(false);
  });

  it("does nothing for Ctrl+V when clipboard is empty", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}v{/Control}");
    expect(get().project.screens[0].children).toHaveLength(1);
  });

  it("R rotates the selected shape by baking 90° into its frame", async () => {
    const project = withChildren(makeFixtureProject(), [
      { ...makeRect("rc_1"), frame: { x: 0, y: 0, width: 40, height: 20 } },
    ]);
    get().setProject(project);
    get().selectNode("rc_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("r");
    expect(findNode(get().project, "rc_1")?.rotation).toBe(0);
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });

    await userEvent.keyboard("r");
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });

  it("Shift+R rotates the selected line by rebuilding endpoints", async () => {
    const project = withChildren(makeFixtureProject(), [
      {
        ...makeLine("ln_1"),
        frame: { x: 0, y: 10, width: 20, height: 1 },
        props: { x1: 0, y1: 0, x2: 19, y2: 0, strokeWidth: 1 },
      },
    ]);
    get().setProject(project);
    get().selectNode("ln_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Shift>}r{/Shift}");
    const line = findNode(get().project, "ln_1")!;
    expect(line.rotation).toBe(0);
    expect(line.frame!.height).toBeGreaterThan(line.frame!.width);
  });

  it("does not rotate non-shape selection with R", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("r");
    expect(findNode(get().project, "lbl_1")?.rotation).toBeUndefined();
  });

  it("does not rotate when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [
      { ...makeRect("rc_1"), frame: { x: 0, y: 0, width: 40, height: 20 } },
    ]);
    get().setProject(project);
    get().selectNode("rc_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("r");
    expect(findNode(get().project, "rc_1")?.frame).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });
});
