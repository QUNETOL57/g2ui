import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { EditorPage } from "@pages/editor/EditorPage";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";
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

describe("label text editing (feature)", () => {
  it("opens inline edit from tree double-click", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Tree")]);
    get().setProject(project);
    const { container } = render(<TreePanel />);

    const row = container.querySelector('[data-tree-node-id="lbl_1"]');
    expect(row).toBeTruthy();
    fireEvent.doubleClick(row!);
    expect(get().editingLabelId).toBe("lbl_1");
    expect(get().selectedNodeId).toBe("lbl_1");
  });

  it("opens inline edit for a button from tree double-click", () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Tree button")]);
    get().setProject(project);
    const { container } = render(<TreePanel />);

    const row = container.querySelector('[data-tree-node-id="bt_1"]');
    expect(row).toBeTruthy();
    fireEvent.doubleClick(row!);
    expect(get().editingLabelId).toBe("bt_1");
    expect(get().selectedNodeId).toBe("bt_1");
  });

  it("opens inline edit with Enter when a label is selected", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Key")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Enter}");
    expect(screen.getByLabelText("edit label text")).toBeInTheDocument();
    expect(get().editingLabelId).toBe("lbl_1");
  });

  it("opens inline edit with Enter when a button is selected", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Key button")]);
    get().setProject(project);
    get().selectNode("bt_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Enter}");
    expect(screen.getByLabelText("edit label text")).toBeInTheDocument();
    expect(get().editingLabelId).toBe("bt_1");
  });

  it("commits expanded frame and text on blur", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "A")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    fireEvent.doubleClick(screen.getByLabelText("A"));
    const input = screen.getByLabelText("edit label text");
    fireEvent.change(input, { target: { value: "Longer label text" } });
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect((get().project.screens[0].children?.[0].props as { text: string }).text).toBe("A");
    expect(get().draftFrame?.frame.width).toBeGreaterThan(
      get().project.screens[0].children?.[0].frame?.width ?? 0,
    );

    fireEvent.blur(input);
    const after = get().project.screens[0].children?.[0];
    expect((after?.props as { text: string }).text).toBe("Longer label text");
    expect(after?.frame?.width).toBeGreaterThan(80);
    expect(get().editingLabelId).toBeNull();
    expect(get().draftFrame).toBeNull();
  });

  it("commits button text on blur without resizing the button frame", () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Tap")]);
    get().setProject(project);
    render(<CanvasWorkspace />);

    const before = findNode(get().project, "bt_1")?.frame;
    fireEvent.doubleClick(screen.getByLabelText("Tap"));
    fireEvent.change(screen.getByLabelText("edit label text"), { target: { value: "Submit" } });
    fireEvent.blur(screen.getByLabelText("edit label text"));

    const after = findNode(get().project, "bt_1");
    expect((after?.props as { text: string }).text).toBe("Submit");
    expect(after?.frame).toEqual(before);
    expect(get().editingLabelId).toBeNull();
    expect(get().draftFrame).toBeNull();
  });

  it("allows re-selecting the label after commit", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Pick")]);
    get().setProject(project);
    const { container } = render(<CanvasWorkspace />);

    fireEvent.doubleClick(screen.getByLabelText("Pick"));
    fireEvent.change(screen.getByLabelText("edit label text"), { target: { value: "Done" } });
    fireEvent.blur(screen.getByLabelText("edit label text"));

    expect(screen.queryByTestId("label-inline-editor")).toBeNull();
    const widget = container.querySelector('[data-widget-id="lbl_1"]') as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: widget });
    expect(get().selectedNodeId).toBe("lbl_1");
  });
});

describe("canvas layer order (feature)", () => {
  function overlappingPanelOverLabel() {
    const panel = {
      ...makePanel("pan_1"),
      frame: { x: 8, y: 8, width: 80, height: 24 },
    };
    const label = {
      ...makeLabel("lbl_1", "Under"),
      frame: { x: 8, y: 8, width: 80, height: 7 },
    };
    return withChildren(makeFixtureProject(), [panel, label]);
  }

  it("selects the panel when it is above the label in the widget tree", async () => {
    get().setProject(overlappingPanelOverLabel());
    const { container } = render(<CanvasWorkspace />);
    const panel = container.querySelector('[data-widget-id="pan_1"]') as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: panel });
    expect(get().selectedNodeId).toBe("pan_1");
  });

  it("keeps a covered label under the panel but shows a selection mask", () => {
    get().setProject(overlappingPanelOverLabel());
    get().selectNode("lbl_1");
    const { container } = render(<CanvasWorkspace />);

    const labelEl = container.querySelector('[data-widget-id="lbl_1"]') as HTMLElement;
    const panelEl = container.querySelector('[data-widget-id="pan_1"]') as HTMLElement;
    expect(Number(labelEl.style.zIndex)).toBeLessThan(Number(panelEl.style.zIndex));
    expect(container.querySelector('[data-testid="selection-mask"]')).toBeTruthy();
  });

  it("swaps stacking when the label moves up in the tree", () => {
    get().setProject(overlappingPanelOverLabel());
    get().selectNode("lbl_1");
    get().moveNode("lbl_1", "up");

    const children = get().project.screens[0].children ?? [];
    expect(children[0]?.id).toBe("lbl_1");
    expect(children[1]?.id).toBe("pan_1");
  });

  it("updates z-index when sibling order changes", () => {
    get().setProject(overlappingPanelOverLabel());
    const { container, rerender } = render(<CanvasWorkspace />);

    const zFor = (id: string) =>
      (container.querySelector(`[data-widget-id="${id}"]`) as HTMLElement).style.zIndex;

    expect(zFor("pan_1")).toBe("2");
    expect(zFor("lbl_1")).toBe("1");

    get().moveNode("lbl_1", "up");
    rerender(<CanvasWorkspace />);

    expect(zFor("lbl_1")).toBe("2");
    expect(zFor("pan_1")).toBe("1");
  });

  it("selects the label after it moves above the panel", async () => {
    get().setProject(overlappingPanelOverLabel());
    get().moveNode("lbl_1", "up");
    const { container } = render(<CanvasWorkspace />);
    const labelWidget = container.querySelector('[data-widget-id="lbl_1"]') as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: labelWidget });
    expect(get().selectedNodeId).toBe("lbl_1");
  });
});

describe("store: label text edit", () => {
  it("beginLabelTextEdit selects the label and sets editingLabelId", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    get().beginLabelTextEdit("lbl_1");

    expect(get().selectedNodeId).toBe("lbl_1");
    expect(get().editingLabelId).toBe("lbl_1");
  });

  it("commitLabelText persists text and grows frame to fit content", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    const widthBefore = findNode(get().project, "lbl_1")?.frame?.width ?? 0;
    get().beginLabelTextEdit("lbl_1");
    get().commitLabelText("lbl_1", "Much longer text", { x: 8, y: 8, width: 200, height: 7 });

    const node = findNode(get().project, "lbl_1");
    expect((node?.props as { text: string }).text).toBe("Much longer text");
    expect(node?.frame?.width).toBeGreaterThan(widthBefore);
    expect(get().editingLabelId).toBeNull();
  });

  it("commitLabelText persists button text without changing its frame", () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Hi")]);
    get().setProject(project);
    const frameBefore = findNode(get().project, "bt_1")?.frame;

    get().beginLabelTextEdit("bt_1");
    get().commitLabelText("bt_1", "Longer button text", { x: 0, y: 0, width: 200, height: 24 });

    const node = findNode(get().project, "bt_1");
    expect((node?.props as { text: string }).text).toBe("Longer button text");
    expect(node?.frame).toEqual(frameBefore);
    expect(get().editingLabelId).toBeNull();
  });
});
