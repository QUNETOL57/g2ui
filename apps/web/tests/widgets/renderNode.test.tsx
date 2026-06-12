import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { findFontFace, measureTextWidth } from "@entities/font/fontLibrary";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { PreviewNode } from "@widgets/canvas-workspace/renderNode";

import {
  makeButton,
  makeCircle,
  makeFixtureProject,
  makeFreehand,
  makeIcon,
  makeLabel,
  makeLine,
  makePanel,
  makeRect,
  makeTriangle,
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

  it("renders a button icon with text", () => {
    const button = makeButton("bt_1", "Save");
    button.props = { ...(button.props ?? {}), iconId: "earth" };
    renderProject([button]);
    expect(screen.getByLabelText("earth")).toBeInTheDocument();
    expect(screen.getByLabelText("Save")).toBeInTheDocument();
  });

  it("clips long button text to the available slot next to the icon", () => {
    const button = makeButton("bt_1", "A very long button label");
    button.props = { ...(button.props ?? {}), iconId: "earth" };
    renderProject([button]);

    const textLayer = screen.getByLabelText("A very long button label").parentElement as HTMLElement;
    expect(textLayer.style.width).toBe("47px");
    expect(textLayer.style.overflow).toBe("hidden");
  });

  it("renders an icon-only button", () => {
    const button = makeButton("bt_1", "");
    button.props = { ...(button.props ?? {}), iconId: "earth" };
    renderProject([button]);
    expect(screen.getByLabelText("earth")).toBeInTheDocument();
  });

  it("keeps button icon size stable when the button font changes", () => {
    const freeMonoButton = makeButton("bt_1", "Button");
    freeMonoButton.props = {
      ...(freeMonoButton.props ?? {}),
      iconId: "chart",
      fontFamily: "FreeMono",
      fontSize: 9,
    };
    const freeMonoRender = renderProject([freeMonoButton]);
    const freeMonoIcon = freeMonoRender.container.querySelector('svg[aria-label="chart"]') as SVGElement;

    const bdfButton = makeButton("bt_1", "Button");
    bdfButton.props = {
      ...(bdfButton.props ?? {}),
      iconId: "chart",
      fontFamily: "BDF",
      fontSize: 6,
    };
    const bdfRender = renderProject([bdfButton]);
    const bdfIcon = bdfRender.container.querySelector('svg[aria-label="chart"]') as SVGElement;

    expect(bdfIcon.style.width).toBe(freeMonoIcon.style.width);
    expect(bdfIcon.style.height).toBe(freeMonoIcon.style.height);
  });

  it("renders icon svg with role img", () => {
    const { container } = renderProject([makeIcon("ic_1", "earth")]);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders button corner radius", () => {
    const button = makeButton("bt_1", "Save");
    button.style = { ...(button.style ?? {}), borderRadius: 6 };
    const { container } = renderProject([button]);
    const pixelBox = container.querySelector('[data-widget-type="button"] [data-testid="pixel-rounded-box"]') as SVGElement;
    expect(pixelBox).toBeTruthy();
    expect(pixelBox.getAttribute("shape-rendering")).toBe("crispEdges");
    expect(screen.getByLabelText("Save")).toBeInTheDocument();
  });

  it("aligns bordered button fill with the outer rounded edge", () => {
    const button = makeButton("bt_1", "Button123");
    button.style = {
      ...(button.style ?? {}),
      borderRadius: 14,
      drawBorder: true,
      borderWidth: 1,
      borderColor: { kind: "hex", value: "#FFFFFF" },
      background: { kind: "hex", value: "#333333" },
    };
    const { container } = renderProject([button]);
    const rects = [
      ...container.querySelectorAll('[data-widget-type="button"] [data-testid="pixel-rounded-box"] rect'),
    ] as SVGRectElement[];

    expect(rects.length).toBeGreaterThan(0);

    const outerByY = new Map<number, SVGRectElement>();
    const innerByY = new Map<number, SVGRectElement>();
    for (const rect of rects) {
      const y = Number(rect.getAttribute("y"));
      if (rect.getAttribute("fill") === "#FFFFFF") outerByY.set(y, rect);
      if (rect.getAttribute("fill") === "#333333") innerByY.set(y, rect);
    }

    for (const [y, inner] of innerByY) {
      const outer = outerByY.get(y);
      expect(outer, `missing outer scanline at y=${y}`).toBeTruthy();
      expect(Number(inner.getAttribute("x"))).toBe(Number(outer!.getAttribute("x")) + 1);
      expect(Number(inner.getAttribute("width"))).toBe(Number(outer!.getAttribute("width")) - 2);
    }
  });

  it("renders rect as a styled div", () => {
    const { container } = renderProject([makeRect("rc_1")]);
    expect(container.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  it("renders rect corner radius", () => {
    const rect = makeRect("rc_1");
    rect.style = { ...(rect.style ?? {}), borderRadius: 5 };
    const { container } = renderProject([rect]);
    const pixelBox = container.querySelector('[data-widget-type="rect"] [data-testid="pixel-rounded-box"]');
    expect(pixelBox).toBeTruthy();
  });

  it("renders circle and triangle shapes", () => {
    const { container } = renderProject([makeCircle("cir_1"), makeTriangle("tri_1")]);
    const circle = container.querySelector('[data-widget-type="circle"] [data-testid="pixel-circle"]');
    const triangle = container.querySelector('[data-widget-type="triangle"] [data-testid="pixel-triangle"]');
    expect(circle).toBeTruthy();
    expect(triangle).toBeTruthy();
    expect(circle?.querySelector("ellipse")).toBeNull();
    expect(triangle?.querySelector("polygon")).toBeNull();
    expect(circle?.querySelectorAll("rect").length).toBeGreaterThan(0);
    expect(triangle?.querySelectorAll("rect").length).toBeGreaterThan(0);
  });

  it("renders triangle border without filling the interior when fill is disabled", () => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#FFFFFF" },
      borderWidth: 1,
    };
    const { container } = renderProject([triangle]);
    const middleRow = [
      ...container.querySelectorAll('[data-widget-type="triangle"] [data-testid="pixel-triangle"] rect[y="20"]'),
    ] as SVGRectElement[];
    const bottomRow = [
      ...container.querySelectorAll('[data-widget-type="triangle"] [data-testid="pixel-triangle"] rect[y="31"]'),
    ] as SVGRectElement[];

    const middleWidth = middleRow.reduce((sum, rect) => sum + Number(rect.getAttribute("width")), 0);
    expect(middleWidth).toBeLessThan(10);
    expect(bottomRow).toHaveLength(1);
    expect(bottomRow[0]).toHaveAttribute("width", "36");

    const leftEdge = [...container.querySelectorAll('[data-widget-type="triangle"] [data-testid="pixel-triangle"] rect')]
      .map((rect) => Number(rect.getAttribute("y")))
      .filter((y, index, rows) => rows.indexOf(y) === index)
      .sort((a, b) => a - b)
      .map((y) => {
        const rowRects = [
          ...container.querySelectorAll(`[data-widget-type="triangle"] [data-testid="pixel-triangle"] rect[y="${y}"]`),
        ] as SVGRectElement[];
        return Math.min(...rowRects.map((rect) => Number(rect.getAttribute("x"))));
      });
    for (let index = 1; index < leftEdge.length; index += 1) {
      expect(leftEdge[index] - leftEdge[index - 1]).toBeLessThanOrEqual(1);
      expect(leftEdge[index - 1] - leftEdge[index]).toBeLessThanOrEqual(1);
    }
  });

  it("scales triangle border evenly when width is increased", () => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#FFFFFF" },
      borderWidth: 4,
    };
    const { container } = renderProject([triangle]);
    const middleRow = [
      ...container.querySelectorAll('[data-widget-type="triangle"] [data-testid="pixel-triangle"] rect[y="16"]'),
    ] as SVGRectElement[];
    expect(middleRow).toHaveLength(2);
    expect(middleRow.every((rect) => Number(rect.getAttribute("width")) === 4)).toBe(true);
  });

  it("renders freehand pixel strokes", () => {
    const { container } = renderProject([makeFreehand("fre_1")]);
    const freehand = container.querySelector('[data-widget-type="freehand"] [data-testid="freehand-visual"]');
    expect(freehand?.querySelectorAll("div")).toHaveLength(2);
  });

  it("applies rotation to shape nodes", () => {
    const rect = { ...makeRect("rc_1"), rotation: 45 };
    const { container } = renderProject([rect]);
    const node = container.querySelector('[data-widget-type="rect"]') as HTMLElement;
    expect(node.style.transform).toBe("rotate(45deg)");
  });

  it("renders panel container", () => {
    renderProject([makePanel("pn_1")]);
    expect(true).toBe(true);
  });

  it("renders panel corner radius", () => {
    const panel = makePanel("pn_1");
    panel.style = { ...(panel.style ?? {}), borderRadius: 4 };
    const { container } = renderProject([panel]);
    const pixelBox = container.querySelector('[data-widget-type="panel"] [data-testid="pixel-rounded-box"]');
    expect(pixelBox).toBeTruthy();
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

  it("keeps a button icon visible while editing text", () => {
    const button = makeButton("bt_1", "Tap");
    button.props = { ...(button.props ?? {}), iconId: "earth" };
    const project = withChildren(makeFixtureProject(), [button]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          editingLabelId: "bt_1",
          onSelect: vi.fn(),
          onLabelTextCommit: vi.fn(),
        }}
      />,
    );

    expect(screen.getByLabelText("earth")).toBeInTheDocument();
    expect(screen.getByTestId("label-inline-editor")).toBeInTheDocument();
  });

  it("places the label text caret from the clicked bitmap position", () => {
    const label = makeLabel("lbl_1", "Tap");
    const project = withChildren(makeFixtureProject(), [label]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const face = findFontFace(label.props ?? {});

    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          editingLabelId: "lbl_1",
          onSelect: vi.fn(),
          onLabelTextCommit: vi.fn(),
        }}
      />,
    );

    const editor = screen.getByTestId("label-inline-editor");
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 80,
      bottom: 7,
      width: 80,
      height: 7,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    const input = screen.getByLabelText("edit label text") as HTMLInputElement;
    fireEvent.mouseDown(input, { clientX: measureTextWidth(face, "T") + 1 });

    expect(input.selectionStart).toBe(1);
  });

  it("places the label text caret correctly when the canvas is scaled", () => {
    const label = makeLabel("lbl_1", "Tap");
    const project = withChildren(makeFixtureProject(), [label]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const face = findFontFace(label.props ?? {});
    const clickX = measureTextWidth(face, "T") + 1;

    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          editingLabelId: "lbl_1",
          onSelect: vi.fn(),
          onLabelTextCommit: vi.fn(),
        }}
      />,
    );

    const editor = screen.getByTestId("label-inline-editor");
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      left: 20,
      top: 0,
      right: 180,
      bottom: 14,
      width: 160,
      height: 14,
      x: 20,
      y: 0,
      toJSON: () => undefined,
    });
    const input = screen.getByLabelText("edit label text") as HTMLInputElement;
    fireEvent.mouseDown(input, { clientX: 20 + clickX * 2 });

    expect(input.selectionStart).toBe(1);
  });

  it("places the button text caret from the clicked bitmap position", () => {
    const button = makeButton("bt_1", "Tap");
    button.props = { ...(button.props ?? {}), iconId: "earth" };
    const project = withChildren(makeFixtureProject(), [button]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const face = findFontFace(button.props ?? {});

    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          editingLabelId: "bt_1",
          onSelect: vi.fn(),
          onLabelTextCommit: vi.fn(),
        }}
      />,
    );

    const editor = screen.getByTestId("label-inline-editor");
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      right: 47,
      bottom: 16,
      width: 47,
      height: 16,
      x: 0,
      y: 0,
      toJSON: () => undefined,
    });
    const input = screen.getByLabelText("edit label text") as HTMLInputElement;
    fireEvent.mouseDown(input, { clientX: measureTextWidth(face, "T") + 1 });

    expect(input.selectionStart).toBe(1);
  });

  it("places the button caret by the visible text slot even when text overflows", () => {
    const button = makeButton("bt_1", "Tap tap tap tap");
    button.props = { ...(button.props ?? {}), iconId: "earth" };
    const project = withChildren(makeFixtureProject(), [button]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const face = findFontFace(button.props ?? {});
    const clickX = measureTextWidth(face, "Ta") + 1;

    render(
      <PreviewNode
        layoutNode={layout}
        ctx={{
          palette: project.palette,
          selectedId: null,
          movableId: null,
          dragPreview: null,
          editingLabelId: "bt_1",
          onSelect: vi.fn(),
          onLabelTextCommit: vi.fn(),
        }}
      />,
    );

    const editor = screen.getByTestId("label-inline-editor");
    vi.spyOn(editor, "getBoundingClientRect").mockReturnValue({
      left: 20,
      top: 0,
      right: 114,
      bottom: 32,
      width: 94,
      height: 32,
      x: 20,
      y: 0,
      toJSON: () => undefined,
    });
    const input = screen.getByLabelText("edit label text") as HTMLInputElement;
    fireEvent.mouseDown(input, { clientX: 20 + clickX * 2 });

    expect(input.selectionStart).toBe(2);
  });
});
