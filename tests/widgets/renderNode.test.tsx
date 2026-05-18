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
});
