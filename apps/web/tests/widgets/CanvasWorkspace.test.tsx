import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";

import {
  makeButton,
  makeFixtureProject,
  makeLabel,
  makePanel,
  makeRect,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("CanvasWorkspace: rendering", () => {
  it("renders project meta and zoom control in the workspace overlay", () => {
    render(<CanvasWorkspace />);
    expect(screen.getByTestId("canvas-project-meta")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-zoom-toolbar")).toBeInTheDocument();
    expect(screen.getByRole("slider")).toBeInTheDocument();
    expect(screen.getByText("2×")).toBeInTheDocument();
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

describe("CanvasWorkspace: marker drawing", () => {
  it("creates a freehand pixel stroke by dragging on the canvas", () => {
    get().setActiveTool("marker");
    render(<CanvasWorkspace />);

    const frame = screen.getByTestId("canvas-device-frame") as HTMLElement;
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 256,
      width: 320,
      height: 256,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 12, clientY: 12 });
    fireEvent.mouseUp(window);

    const node = get().project.screens[0].children?.[0];
    expect(node?.type).toBe("freehand");
    expect(node?.frame).toEqual({ x: 5, y: 5, width: 2, height: 2 });
    expect(node?.props).toEqual({ points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], strokeWidth: 1 });
    expect(get().activeTool).toBe("select");
  });

  it("fills skipped pixels when marker movement jumps between mouse events", () => {
    get().setActiveTool("marker");
    render(<CanvasWorkspace />);

    const frame = screen.getByTestId("canvas-device-frame") as HTMLElement;
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 256,
      width: 320,
      height: 256,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 20, clientY: 10 });
    fireEvent.mouseUp(window);

    const node = get().project.screens[0].children?.[0];
    expect(node?.type).toBe("freehand");
    expect(node?.frame).toEqual({ x: 5, y: 5, width: 6, height: 1 });
    expect(node?.props).toEqual({
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 5, y: 0 },
      ],
      strokeWidth: 1,
    });
  });

  it("uses configured marker color and width for new strokes", () => {
    get().setActiveTool("marker");
    get().updateMarkerStyle({ color: { kind: "hex", value: "#FF0000" }, width: 3 });
    render(<CanvasWorkspace />);

    const frame = screen.getByTestId("canvas-device-frame") as HTMLElement;
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 256,
      width: 320,
      height: 256,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseUp(window);

    const node = get().project.screens[0].children?.[0];
    expect(node?.type).toBe("freehand");
    expect(node?.frame).toEqual({ x: 5, y: 5, width: 3, height: 3 });
    expect(node?.style?.borderColor).toEqual({ kind: "hex", value: "#FF0000" });
    expect(node?.style?.borderWidth).toBe(3);
    expect(node?.props).toEqual({ points: [{ x: 0, y: 0 }], strokeWidth: 3 });
  });

  it("does not create strokes when select tool is active", () => {
    render(<CanvasWorkspace />);

    const frame = screen.getByTestId("canvas-device-frame") as HTMLElement;
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 256,
      width: 320,
      height: 256,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 20, clientY: 10 });
    fireEvent.mouseUp(window);

    expect(get().project.screens[0].children).toEqual([]);
    expect(get().activeTool).toBe("select");
  });

  it("can draw marker strokes over existing widgets", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    get().setActiveTool("marker");
    render(<CanvasWorkspace />);

    const frame = screen.getByTestId("canvas-device-frame") as HTMLElement;
    vi.spyOn(frame, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 320,
      bottom: 256,
      width: 320,
      height: 256,
      toJSON: () => ({}),
    } as DOMRect);

    fireEvent.mouseDown(frame, { button: 0, clientX: 10, clientY: 10 });
    fireEvent.mouseUp(window);

    expect(get().project.screens[0].children).toHaveLength(2);
    expect(get().project.screens[0].children?.map((child) => child.type)).toEqual([
      "freehand",
      "label",
    ]);
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
    expect(get().draftFrames?.lbl_1).toBeTruthy();
    expect(get().draftFrames?.lbl_1?.width).toBeGreaterThan(
      get().project.screens[0].children?.[0].frame?.width ?? 0,
    );

    fireEvent.blur(input);
    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("New label that grows");
    expect(get().draftFrames).toBeNull();
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
    expect(get().draftFrames).toBeNull();

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

  it("selects a locked widget but blocks resize and shows not-allowed chrome", async () => {
    const button = makeButton("bt_1", "Save");
    button.locked = true;
    button.frame = { x: 8, y: 8, width: 70, height: 24 };
    get().setProject(withChildren(makeFixtureProject(), [button]));
    render(<CanvasWorkspace />);

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Save") });

    expect(get().selectedNodeId).toBe("bt_1");
    const handle = screen.getByTestId("resize-handle-e");
    expect(handle.className).toMatch(/cursorLocked/);

    fireEvent.mouseDown(handle, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: 20, clientY: 0 });
    fireEvent.mouseUp(window);

    const frame = get().project.screens[0].children?.[0].frame;
    expect(frame?.width).toBe(70);
  });

  it("fits label frame to text on double-click of the selection frame", async () => {
    const label = makeLabel("lbl_1", "Hi");
    label.frame = { x: 8, y: 8, width: 120, height: 40 };
    label.props = { ...(label.props ?? {}), textAutoSize: false };
    get().setProject(withChildren(makeFixtureProject(), [label]));
    render(<CanvasWorkspace />);

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Hi") });
    fireEvent.doubleClick(screen.getByTestId("resize-handle-s"));

    const frame = get().project.screens[0].children?.[0].frame;
    expect(frame?.width).toBeLessThan(120);
    expect(frame?.height).toBeLessThan(40);
    expect((get().project.screens[0].children?.[0].props as { textAutoSize?: boolean }).textAutoSize).toBeUndefined();
  });

  it("opens label text edit on double-click of the label content", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Hi") });
    fireEvent.doubleClick(screen.getByLabelText("Hi"));

    expect(screen.getByLabelText("edit label text")).toBeInTheDocument();
  });
});

describe("CanvasWorkspace: screen background", () => {
  it("applies resolved screen fill from style.background", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {
      drawBackground: true,
      background: { kind: "hex", value: "#abcdef" },
    };
    get().setProject(project);

    render(<CanvasWorkspace />);
    expect(screen.getByTestId("canvas-device-frame")).toHaveStyle({
      background: "#abcdef",
    });
  });

  it("uses black fill when drawBackground is false", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {
      drawBackground: false,
      background: { kind: "hex", value: "#abcdef" },
    };
    get().setProject(project);

    render(<CanvasWorkspace />);
    expect(screen.getByTestId("canvas-device-frame")).toHaveStyle({
      background: "#000000",
    });
  });

  it("falls back to props.background when style.background is missing", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {};
    project.screens[0].props = { background: { kind: "hex", value: "#556677" } };
    get().setProject(project);

    render(<CanvasWorkspace />);
    expect(screen.getByTestId("canvas-device-frame")).toHaveStyle({
      background: "#556677",
    });
  });
});

describe("CanvasWorkspace: move without jump", () => {
  it("keeps a nested widget from jumping upward while dragging and on mouseup", async () => {
    const label = makeLabel("lab_1", "Nested");
    label.frame = { x: 8, y: 12, width: 48, height: 7 };
    const panel = makePanel("pan_1", [label]);
    panel.layout = { mode: "absolute", padding: 0, gap: 0, align: "start", justify: "start" };
    panel.frame = { x: 0, y: 40, width: 160, height: 80 };
    panel.style = { drawBackground: true, background: { kind: "hex", value: "#222222" } };
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    render(<CanvasWorkspace />);

    const widget = screen.getByLabelText("Nested");
    fireEvent.mouseDown(widget, { button: 0, clientX: 100, clientY: 100 });

    const tops: number[] = [];
    const draftYs: number[] = [];
    const readTop = () => {
      const el = document.querySelector(
        '[data-testid="canvas-device-frame"] [data-testid="canvas-widget"][data-widget-id="lab_1"]',
      ) as HTMLElement | null;
      tops.push(Number.parseFloat(el?.style.top ?? "NaN"));
      const draftY = get().draftFrames?.lab_1?.y;
      if (typeof draftY === "number") draftYs.push(draftY);
    };

    readTop();
    for (const clientY of [108, 116, 124, 132, 140]) {
      fireEvent.mouseMove(window, { clientX: 100, clientY });
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });
      readTop();
    }

    // Store drafts are absolute canvas coords (parent.y 40 + local >= 12), not parent-local.
    expect(draftYs.length).toBeGreaterThan(0);
    for (const draftY of draftYs) {
      expect(draftY).toBeGreaterThanOrEqual(52);
    }

    fireEvent.mouseUp(window);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    readTop();

    const numericTops = tops.filter((value) => Number.isFinite(value));
    expect(numericTops.length).toBeGreaterThan(3);

    // Dragging downward must never paint a higher (smaller) top than the previous sample.
    for (let i = 1; i < numericTops.length; i += 1) {
      expect(numericTops[i]).toBeGreaterThanOrEqual(numericTops[i - 1]);
    }

    expect(get().project.screens[0].children?.[0].children?.[0].frame?.y).toBeGreaterThan(12);
    expect(get().draftFrames).toBeNull();
  });
});

describe("CanvasWorkspace: grid overlay stacking", () => {
  function zIndexOf(element: HTMLElement): number {
    return Number(getComputedStyle(element).zIndex);
  }

  it("raises the pixel grid above widgets when overlay is enabled", () => {
    render(<CanvasWorkspace showGrid showGridOverlay />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });

    const grid = screen.getByTestId("canvas-pixel-grid");
    const content = screen.getByTestId("canvas-scaled-content");
    expect(grid).toHaveAttribute("data-overlay", "true");
    expect(zIndexOf(grid)).toBeGreaterThan(zIndexOf(content));
  });

  it("keeps the pixel grid below widgets when overlay is disabled", () => {
    render(<CanvasWorkspace showGrid showGridOverlay={false} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });

    const grid = screen.getByTestId("canvas-pixel-grid");
    const content = screen.getByTestId("canvas-scaled-content");
    expect(grid).not.toHaveAttribute("data-overlay");
    expect(zIndexOf(grid)).toBeLessThan(zIndexOf(content));
  });

  it("keeps selection guides above the pixel grid when overlay is enabled", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<CanvasWorkspace showGrid showGridOverlay showGuides />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });

    const grid = screen.getByTestId("canvas-pixel-grid");
    const selectionLayer = screen.getByTestId("canvas-selection-layer");
    expect(grid).toHaveAttribute("data-overlay", "true");
    expect(screen.getAllByTestId("selection-guide").length).toBeGreaterThan(0);
    expect(zIndexOf(selectionLayer)).toBeGreaterThan(zIndexOf(grid));
  });
});

describe("CanvasWorkspace: overflow clip", () => {
  it("clips widgets to the canvas while keeping selection chrome outside", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<CanvasWorkspace allowCanvasOverflow showGuides />);

    const frame = screen.getByTestId("canvas-device-frame");
    const clip = screen.getByTestId("canvas-widget-clip");
    const selectionLayer = screen.getByTestId("canvas-selection-layer");
    const widget = document.querySelector(
      '[data-testid="canvas-widget"][data-widget-id="lbl_1"]',
    ) as HTMLElement;
    expect(frame).toHaveAttribute("data-allow-overflow", "true");
    expect(frame).not.toHaveAttribute("data-show-full-widgets");
    expect(frame.contains(selectionLayer)).toBe(false);
    expect(clip.contains(selectionLayer)).toBe(false);
    expect(getComputedStyle(clip).overflow).toBe("hidden");
    expect(getComputedStyle(selectionLayer).overflow).toBe("visible");
    expect(getComputedStyle(widget).opacity).toBe("1");
    expect(screen.getAllByTestId("selection-guide").length).toBeGreaterThan(0);
  });

  it("keeps overflowing selection guides outside the canvas clip", () => {
    const rect = makeRect("rect_1");
    rect.frame = { x: 140, y: 8, width: 40, height: 24 };
    const project = withChildren(makeFixtureProject(), [rect]);
    get().setProject(project);
    get().selectNode("rect_1");
    render(<CanvasWorkspace allowCanvasOverflow showGuides />);

    const frames = screen.getAllByTestId("selection-frame");
    const guides = screen.getAllByTestId("selection-guide");
    expect(frames.some((node) => node.style.left === "360px")).toBe(true);
    expect(guides.some((node) => node.style.left === "360px")).toBe(true);
    expect(
      screen.getByTestId("canvas-device-frame").contains(screen.getByTestId("canvas-selection-layer")),
    ).toBe(false);
  });

  it("shows overflowing widgets at full opacity when showFullWidgets is on", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    render(<CanvasWorkspace allowCanvasOverflow showFullWidgets />);

    const clip = screen.getByTestId("canvas-widget-clip");
    const widget = document.querySelector(
      '[data-testid="canvas-widget"][data-widget-id="lbl_1"]',
    ) as HTMLElement;
    expect(screen.getByTestId("canvas-device-frame")).toHaveAttribute("data-show-full-widgets", "true");
    expect(getComputedStyle(clip).overflow).toBe("visible");
    expect(getComputedStyle(widget).opacity).toBe("1");
  });
});

describe("CanvasWorkspace: template badge", () => {
  it("shows a Template label next to project meta when isTemplate is set", () => {
    render(<CanvasWorkspace isTemplate />);
    expect(screen.getByTestId("canvas-project-meta")).toHaveTextContent("Template");
    expect(screen.getByLabelText("Template")).toBeInTheDocument();
  });

  it("does not show a Template label for regular projects", () => {
    render(<CanvasWorkspace />);
    expect(screen.queryByLabelText("Template")).not.toBeInTheDocument();
  });
});
