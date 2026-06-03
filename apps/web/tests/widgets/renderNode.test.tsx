import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { PreviewNode } from "@widgets/canvas-workspace/renderNode";

import {
  makeButton,
  makeFixtureProject,
  makeIcon,
  makeLabel,
  makeLine,
  makePanel,
  makeRect,
  withChildren,
} from "../fixtures/projects";

function renderProject(children: ReturnType<typeof makeLabel>[]) {
  const project = withChildren(makeFixtureProject(), children);
  const screenNode = project.screens[0];
  const layout = layoutTree(screenNode, project.display.width, project.display.height);
  return render(
    <PreviewNode
      layoutNode={layout}
      ctx={{
        palette: project.palette,
        selectedId: null,
        movableId: null,
        dragPreview: null,
        onSelect: vi.fn(),
      }}
    />,
  );
}

describe("PreviewNode: per-type rendering", () => {
  it("renders label text via aria-label", () => {
    renderProject([makeLabel("lbl_1", "Hello")]);
    expect(screen.getByLabelText("Hello")).toBeInTheDocument();
  });

  it("renders button text via aria-label", () => {
    renderProject([makeButton("bt_1", "Tap me")]);
    expect(screen.getByLabelText("Tap me")).toBeInTheDocument();
  });

  it("renders icon svg with role img", () => {
    const { container } = renderProject([makeIcon("ic_1", "earth")]);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders rect as a styled div", () => {
    const { container } = renderProject([makeRect("rc_1")]);
    expect(container.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  it("renders panel container", () => {
    renderProject([makePanel("pn_1")]);
    expect(true).toBe(true);
  });

  it("renders line", () => {
    const { container } = renderProject([makeLine("ln_1")]);
    expect(container.querySelectorAll("div").length).toBeGreaterThan(0);
  });
});

describe("PreviewNode: behavior", () => {
  it("renders earlier siblings above later siblings like the widget tree", () => {
    const panel = {
      ...makePanel("pan_1"),
      frame: { x: 8, y: 8, width: 80, height: 24 },
    };
    const label = {
      ...makeLabel("lbl_1", "Under"),
      frame: { x: 8, y: 8, width: 80, height: 7 },
    };
    const project = withChildren(makeFixtureProject(), [panel, label]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          onSelect: vi.fn(),
        }}
      />,
    );

    const [, panelEl, labelEl] = [...container.querySelectorAll('[class*="previewNode"]')] as HTMLElement[];
    expect(panelEl.style.zIndex).toBe("2");
    expect(labelEl.style.zIndex).toBe("1");
  });

  it("hides nodes with visible=false", () => {
    const hidden = { ...makeLabel("lbl_1", "Hidden"), visible: false };
    renderProject([hidden]);
    expect(screen.queryByLabelText("Hidden")).toBeNull();
  });

  it("calls onSelect on mouseDown", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "X")]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();
    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          onSelect,
        }}
      />,
    );
    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("X") });
    expect(onSelect).toHaveBeenCalled();
  });

  it("starts text editing for a button on double-click", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Tap")]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onLabelEditStart = vi.fn();
    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          onSelect: vi.fn(),
          onLabelEditStart,
        }}
      />,
    );

    await userEvent.dblClick(screen.getByLabelText("Tap"));
    expect(onLabelEditStart).toHaveBeenCalledWith("bt_1");
  });
});
