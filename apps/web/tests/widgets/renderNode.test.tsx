import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { findFontFace, measureTextWidth } from "@entities/font/fontLibrary";
import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { computeWidgetStackIndices } from "@widgets/canvas-workspace/lib/widgetStackIndices";
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

function makePreviewCtx(
  project: ReturnType<typeof makeFixtureProject>,
  layout: LayoutNode,
  overrides: Record<string, unknown> = {},
) {
  return {
    palette: project.palette,
    stackIndices: computeWidgetStackIndices(layout),
    selectedId: null,
    movableId: null,
    lockedId: null,
    dragPreview: null,
    draftFrame: null,
    onSelect: vi.fn(),
    ...overrides,
  };
}

function widgetZ(container: HTMLElement, id: string, testId = "canvas-widget") {
  return (container.querySelector(`[data-widget-id="${id}"][data-testid="${testId}"]`) as HTMLElement)
    .style.zIndex;
}

function renderProject(children: ReturnType<typeof makeLabel>[]) {
  const project = withChildren(makeFixtureProject(), children);
  const screenNode = project.screens[0];
  const layout = layoutTree(screenNode, project.display.width, project.display.height);
  return render(
    <PreviewNode
      layoutNode={layout}
      ctx={makePreviewCtx(project, layout)}
    />,
  );
}

const triangleDirections = ["up", "down", "left", "right"] as const;

function triangleSvg(container: HTMLElement) {
  return container.querySelector('[data-widget-type="triangle"] [data-testid="pixel-triangle"]') as SVGElement;
}

function triangleRects(container: HTMLElement) {
  return [...triangleSvg(container).querySelectorAll("rect")] as SVGRectElement[];
}

function rowRects(container: HTMLElement, y: number) {
  return [...triangleSvg(container).querySelectorAll(`rect[y="${y}"]`)] as SVGRectElement[];
}

function rowTotalWidth(rects: SVGRectElement[]) {
  return rects.reduce((sum, rect) => sum + Number(rect.getAttribute("width")), 0);
}

function rowBounds(rects: SVGRectElement[]) {
  const left = Math.min(...rects.map((rect) => Number(rect.getAttribute("x"))));
  const right = Math.max(...rects.map((rect) => Number(rect.getAttribute("x")) + Number(rect.getAttribute("width"))));
  return { left, right };
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

  it.each([1, 3, 4, 5, 6, 7, 8])(
    "renders rounded rect border without filling the interior for radius %i",
    (borderRadius) => {
    const rect = makeRect("rc_1");
    rect.style = {
      ...(rect.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#FF0000" },
      borderWidth: 1,
      borderRadius,
    };
    const { container } = renderProject([rect]);
    const pixelBox = container.querySelector('[data-widget-type="rect"] [data-testid="pixel-rounded-box"]');
    const allRows = [...pixelBox!.querySelectorAll("rect")] as SVGRectElement[];
    const middleRow = [...pixelBox!.querySelectorAll('rect[y="12"]')] as SVGRectElement[];

    expect(allRows.length).toBeGreaterThan(0);
    expect(allRows.some((row) => row.getAttribute("width") === "40")).toBe(false);
    expect(middleRow).toHaveLength(2);
    expect(middleRow.map((row) => Number(row.getAttribute("width")))).toEqual([1, 1]);
    expect(middleRow.every((row) => row.getAttribute("fill") === "#FF0000")).toBe(true);
    },
  );

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

  it.each(triangleDirections)("renders %s triangle fill as pixel scanlines", (direction) => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: true,
      background: { kind: "hex", value: "#00FF00" },
      drawBorder: false,
    };
    triangle.props = { ...(triangle.props ?? {}), direction };
    const { container } = renderProject([triangle]);
    const rects = triangleRects(container);

    expect(rects).toHaveLength(32);
    expect(rects.every((rect) => rect.getAttribute("fill") === "#00FF00")).toBe(true);
    expect(rects.some((rect) => Number(rect.getAttribute("width")) > 30)).toBe(true);
    const tipWidth = direction === "up" || direction === "down" ? 2 : 1;
    expect(rects.some((rect) => Number(rect.getAttribute("width")) === tipWidth)).toBe(true);
  });

  it.each([
    ["up", 0, 31, 2, 36],
    ["down", 0, 31, 36, 2],
    ["right", 0, 16, 1, 36],
    ["left", 0, 16, 1, 36],
  ] as const)("orients %s triangle scanlines", (direction, tipY, wideY, tipWidth, wideWidth) => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: true,
      background: { kind: "hex", value: "#00FF00" },
      drawBorder: false,
    };
    triangle.props = { ...(triangle.props ?? {}), direction };
    const { container } = renderProject([triangle]);
    const tipRow = rowRects(container, tipY);
    const wideRow = rowRects(container, wideY);

    expect(rowTotalWidth(tipRow)).toBe(tipWidth);
    expect(rowTotalWidth(wideRow)).toBe(wideWidth);
    if (direction === "left") {
      expect(Number(tipRow[0].getAttribute("x"))).toBe(35);
      expect(Number(wideRow[0].getAttribute("x"))).toBeLessThanOrEqual(1);
    }
    if (direction === "right") {
      expect(Number(tipRow[0].getAttribute("x"))).toBe(0);
      expect(Number(wideRow[0].getAttribute("x"))).toBe(0);
    }
  });

  it("renders an up triangle as a centered odd-width pixel pyramid", () => {
    const triangle = makeTriangle("tri_1");
    triangle.frame = { x: 0, y: 0, width: 5, height: 3 };
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: true,
      background: { kind: "hex", value: "#FFFFFF" },
      drawBorder: false,
    };
    triangle.props = { ...(triangle.props ?? {}), direction: "up" };
    const { container } = renderProject([triangle]);

    expect(rowRects(container, 0).map((rect) => [
      Number(rect.getAttribute("x")),
      Number(rect.getAttribute("width")),
    ])).toEqual([[2, 1]]);
    expect(rowRects(container, 1).map((rect) => [
      Number(rect.getAttribute("x")),
      Number(rect.getAttribute("width")),
    ])).toEqual([[1, 3]]);
    expect(rowRects(container, 2).map((rect) => [
      Number(rect.getAttribute("x")),
      Number(rect.getAttribute("width")),
    ])).toEqual([[0, 5]]);
  });

  it("renders no triangle pixels when fill and border are disabled", () => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: false,
    };
    const { container } = renderProject([triangle]);

    expect(triangleRects(container)).toHaveLength(0);
  });

  it.each(triangleDirections)("renders %s triangle border without filling the interior", (direction) => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#00FF00" },
      borderWidth: 1,
    };
    triangle.props = { ...(triangle.props ?? {}), direction };
    const { container } = renderProject([triangle]);
    const rects = triangleRects(container);
    const middleRow = rowRects(container, 16);

    expect(rects.length).toBeGreaterThan(0);
    expect(rects.every((rect) => rect.getAttribute("fill") === "#00FF00")).toBe(true);
    expect(middleRow.length).toBeGreaterThan(0);
    expect(rowTotalWidth(middleRow)).toBeLessThan(36);
    expect(rowTotalWidth(middleRow)).toBeGreaterThan(0);
  });

  it.each(triangleDirections)("renders %s triangle border without row gaps", (direction) => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#00FF00" },
      borderWidth: 1,
    };
    triangle.props = { ...(triangle.props ?? {}), direction };
    const { container } = renderProject([triangle]);

    const startY = direction === "left" || direction === "right" ? 1 : 0;
    const endY = direction === "left" || direction === "right" ? 31 : 32;
    for (let y = startY; y < endY; y += 1) {
      expect(rowTotalWidth(rowRects(container, y)), `missing triangle border pixels at y=${y}`).toBeGreaterThan(0);
    }
  });

  it("trims up triangle base at diagonal joins", () => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#00FF00" },
      borderWidth: 1,
    };
    const { container } = renderProject([triangle]);
    const bottom = rowBounds(rowRects(container, 31));

    expect(bottom.left).toBeGreaterThan(0);
    expect(bottom.right).toBeLessThan(36);
  });

  it("trims down triangle base at diagonal joins", () => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#00FF00" },
      borderWidth: 1,
    };
    triangle.props = { ...(triangle.props ?? {}), direction: "down" };
    const { container } = renderProject([triangle]);
    const top = rowBounds(rowRects(container, 0));

    expect(top.left).toBeGreaterThan(0);
    expect(top.right).toBeLessThan(36);
  });

  it.each([1, 2, 4, 6])("keeps triangle border hollow when border width is %i", (borderWidth) => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#00FF00" },
      borderWidth,
    };
    const { container } = renderProject([triangle]);
    const middleRow = rowRects(container, 16);

    expect(middleRow.length).toBeGreaterThan(0);
    expect(rowTotalWidth(middleRow)).toBeLessThan(36);
    expect(rowTotalWidth(middleRow)).toBeGreaterThanOrEqual(borderWidth);
  });

  it.each(triangleDirections)("renders %s triangle fill inside border", (direction) => {
    const triangle = makeTriangle("tri_1");
    triangle.style = {
      ...(triangle.style ?? {}),
      drawBackground: true,
      background: { kind: "hex", value: "#003300" },
      drawBorder: true,
      borderColor: { kind: "hex", value: "#00FF00" },
      borderWidth: 3,
    };
    triangle.props = { ...(triangle.props ?? {}), direction };
    const { container } = renderProject([triangle]);
    const rects = triangleRects(container);
    const borderRows = rects.filter((rect) => rect.getAttribute("fill") === "#00FF00");
    const fillRows = rects.filter((rect) => rect.getAttribute("fill") === "#003300");

    expect(borderRows.length).toBeGreaterThan(0);
    expect(fillRows.length).toBeGreaterThan(0);
    expect(fillRows.every((rect) => Number(rect.getAttribute("x")) >= 3)).toBe(true);
    expect(fillRows.every((rect) => Number(rect.getAttribute("y")) >= 3)).toBe(true);
    expect(fillRows.every((rect) => Number(rect.getAttribute("y")) < 29)).toBe(true);
  });

  it("renders freehand pixel strokes", () => {
    const { container } = renderProject([makeFreehand("fre_1")]);
    const freehand = container.querySelector('[data-widget-type="freehand"] [data-testid="freehand-visual"]');
    expect(freehand?.querySelectorAll("div")).toHaveLength(2);
  });

  it("renders freehand strokes with configured width", () => {
    const stroke = makeFreehand("fre_1");
    stroke.style = { ...(stroke.style ?? {}), borderWidth: 3 };
    stroke.props = { points: [{ x: 0, y: 0 }], strokeWidth: 3 };
    const { container } = renderProject([stroke]);
    const pixel = container.querySelector(
      '[data-widget-type="freehand"] [data-testid="freehand-visual"] div',
    ) as HTMLElement;
    expect(pixel.style.width).toBe("3px");
    expect(pixel.style.height).toBe("3px");
  });

  it("renders circle border as a pixel ring", () => {
    const circle = makeCircle("cir_1");
    circle.style = {
      ...(circle.style ?? {}),
      drawBackground: false,
      drawBorder: true,
      borderColor: { kind: "hex", value: "#FFFFFF" },
      borderWidth: 2,
    };
    const { container } = renderProject([circle]);
    const middleRow = [
      ...container.querySelectorAll('[data-widget-type="circle"] [data-testid="pixel-circle"] rect[y="16"]'),
    ] as SVGRectElement[];
    expect(middleRow.length).toBeGreaterThan(0);
    const totalWidth = middleRow.reduce((sum, rect) => sum + Number(rect.getAttribute("width")), 0);
    expect(totalWidth).toBeLessThan(32);
    expect(middleRow.some((rect) => Number(rect.getAttribute("width")) === 2)).toBe(true);
  });

  it("applies 90° rotation to rect, circle, triangle and line", () => {
    const { container } = renderProject([
      { ...makeRect("rc_1"), rotation: 90 },
      { ...makeCircle("cir_1"), rotation: 180 },
      { ...makeTriangle("tri_1"), rotation: 270 },
      { ...makeLine("ln_1"), rotation: 90 },
    ]);
    expect((container.querySelector('[data-widget-type="rect"]') as HTMLElement).style.transform).toBe(
      "rotate(90deg)",
    );
    expect((container.querySelector('[data-widget-type="circle"]') as HTMLElement).style.transform).toBe(
      "rotate(180deg)",
    );
    expect((container.querySelector('[data-widget-type="triangle"]') as HTMLElement).style.transform).toBe(
      "rotate(270deg)",
    );
    expect((container.querySelector('[data-widget-type="line"]') as HTMLElement).style.transform).toBe(
      "rotate(90deg)",
    );
  });

  it("omits transform when rotation is 0", () => {
    const { container } = renderProject([{ ...makeRect("rc_1"), rotation: 0 }]);
    const node = container.querySelector('[data-widget-type="rect"]') as HTMLElement;
    expect(node.style.transform).toBe("");
  });

  it("uses pixelated rendering on triangle svg", () => {
    const { container } = renderProject([makeTriangle("tri_1")]);
    const svg = container.querySelector('[data-testid="pixel-triangle"]') as SVGElement;
    expect(svg.style.imageRendering).toBe("pixelated");
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
        ctx={makePreviewCtx(project, layout)}
      />,
    );

    expect(Number(widgetZ(container, "pan_1"))).toBeGreaterThan(Number(widgetZ(container, "lbl_1")));
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
        ctx={makePreviewCtx(project, layout, { onSelect })}
      />,
    );
    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("X") });
    expect(onSelect).toHaveBeenCalledWith("lbl_1");
  });

  it("selects a child inside a panel instead of the panel", async () => {
    const label = makeLabel("lbl_1", "Inside");
    const panel = makePanel("pn_1", [label]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();
    render(
      <PreviewNode
        layoutNode={layout}
        ctx={makePreviewCtx(project, layout, { onSelect })}
      />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Inside") });
    expect(onSelect).toHaveBeenCalledWith("lbl_1");
    expect(onSelect).not.toHaveBeenCalledWith("pn_1");
  });

  it("starts text editing for a button on double-click", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Tap")]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onLabelEditStart = vi.fn();
    render(
      <PreviewNode
        layoutNode={layout}
        ctx={makePreviewCtx(project, layout, {
          onSelect: vi.fn(),
          onLabelEditStart,
        })}
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
        ctx={makePreviewCtx(project, layout, {
          editingLabelId: "bt_1",
          onLabelTextCommit: vi.fn(),
        })}
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
        ctx={makePreviewCtx(project, layout, {
          editingLabelId: "lbl_1",
          onLabelTextCommit: vi.fn(),
        })}
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
        ctx={makePreviewCtx(project, layout, {
          editingLabelId: "lbl_1",
          onLabelTextCommit: vi.fn(),
        })}
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
        ctx={makePreviewCtx(project, layout, {
          editingLabelId: "bt_1",
          onLabelTextCommit: vi.fn(),
        })}
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
        ctx={makePreviewCtx(project, layout, {
          editingLabelId: "bt_1",
          onLabelTextCommit: vi.fn(),
        })}
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

describe("PreviewNode: z-index stacking", () => {
  it("applies computed z-index values to every rendered widget", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_in", "In"), makeIcon("ico_1")]);
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_top"), panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const stackIndices = computeWidgetStackIndices(layout);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    for (const [id, value] of stackIndices) {
      expect(widgetZ(container, id)).toBe(String(value));
    }
  });

  it("renders a panel hit layer at the same z-index as the panel body", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_in", "In")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(widgetZ(container, "pan_1", "canvas-widget-hit")).toBe(widgetZ(container, "pan_1"));
  });

  it("does not render a hit layer for an empty panel", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pan_1")]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(container.querySelector('[data-testid="canvas-widget-hit"]')).toBeNull();
  });

  it("orders three screen siblings in the DOM by tree position", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("lbl_top", "Top"),
      makeRect("rec_mid"),
      makeButton("btn_bottom", "Bottom"),
    ]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(Number(widgetZ(container, "lbl_top"))).toBeGreaterThan(Number(widgetZ(container, "rec_mid")));
    expect(Number(widgetZ(container, "rec_mid"))).toBeGreaterThan(Number(widgetZ(container, "btn_bottom")));
  });

  it("orders panel children in the DOM by tree position", () => {
    const panel = makePanel("pan_1", [
      makeIcon("ico_top"),
      makeIcon("ico_mid"),
      makeIcon("ico_bottom"),
    ]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(Number(widgetZ(container, "pan_1"))).toBeLessThan(Number(widgetZ(container, "ico_bottom")));
    expect(Number(widgetZ(container, "ico_top"))).toBeGreaterThan(Number(widgetZ(container, "ico_mid")));
    expect(Number(widgetZ(container, "ico_mid"))).toBeGreaterThan(Number(widgetZ(container, "ico_bottom")));
  });

  it("selects the topmost panel child on click instead of the panel", async () => {
    const panel = makePanel("pan_1", [
      makeLabel("lbl_top", "Top"),
      makeLabel("lbl_bottom", "Bottom"),
    ]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Bottom") });
    expect(onSelect).toHaveBeenCalledWith("lbl_bottom");
    expect(onSelect).not.toHaveBeenCalledWith("pan_1");
  });

  it("selects the first panel child when it is higher in the tree", async () => {
    const panel = makePanel("pan_1", [
      makeLabel("lbl_top", "Top"),
      makeLabel("lbl_bottom", "Bottom"),
    ]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Top") });
    expect(onSelect).toHaveBeenCalledWith("lbl_top");
    expect(onSelect).not.toHaveBeenCalledWith("pan_1");
  });

  it("selects the panel when clicking the hit layer", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_corner", "Corner")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    const hitLayer = container.querySelector(
      '[data-widget-id="pan_1"][data-testid="canvas-widget-hit"]',
    ) as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: hitLayer });
    expect(onSelect).toHaveBeenCalledWith("pan_1");
  });

  it("selects the higher screen sibling instead of a lower panel child", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_in", "Inside")]);
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_above", "Above"), panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Above") });
    expect(onSelect).toHaveBeenCalledWith("lbl_above");
  });

  it("selects a deeply nested label instead of its parent panels", async () => {
    const inner = makePanel("pan_inner", [makeLabel("lbl_deep", "Deep")]);
    const outer = makePanel("pan_outer", [inner]);
    const project = withChildren(makeFixtureProject(), [outer]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Deep") });
    expect(onSelect).toHaveBeenCalledWith("lbl_deep");
    expect(onSelect).not.toHaveBeenCalledWith("pan_outer");
    expect(onSelect).not.toHaveBeenCalledWith("pan_inner");
  });

  it("selects the higher of two competing panel subtrees by tree order", async () => {
    const panelTop = makePanel("pan_top", [makeLabel("lbl_top", "TopIn")]);
    const panelBottom = makePanel("pan_bottom", [makeLabel("lbl_bottom", "BottomIn")]);
    const project = withChildren(makeFixtureProject(), [panelTop, panelBottom]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("TopIn") });
    expect(onSelect).toHaveBeenCalledWith("lbl_top");
    expect(onSelect).not.toHaveBeenCalledWith("pan_bottom");
  });
});

describe("PreviewNode: z-index stacking", () => {
  it("applies computed z-index values to every rendered widget", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_in", "In"), makeIcon("ico_1")]);
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_top"), panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const stackIndices = computeWidgetStackIndices(layout);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    for (const [id, value] of stackIndices) {
      expect(widgetZ(container, id)).toBe(String(value));
    }
  });

  it("renders a panel hit layer at the same z-index as the panel body", () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_in", "In")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(widgetZ(container, "pan_1", "canvas-widget-hit")).toBe(widgetZ(container, "pan_1"));
  });

  it("does not render a hit layer for an empty panel", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pan_1")]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(container.querySelector('[data-testid="canvas-widget-hit"]')).toBeNull();
  });

  it("orders three screen siblings in the DOM by tree position", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("lbl_top", "Top"),
      makeRect("rec_mid"),
      makeButton("btn_bottom", "Bottom"),
    ]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(Number(widgetZ(container, "lbl_top"))).toBeGreaterThan(Number(widgetZ(container, "rec_mid")));
    expect(Number(widgetZ(container, "rec_mid"))).toBeGreaterThan(Number(widgetZ(container, "btn_bottom")));
  });

  it("orders panel children in the DOM by tree position", () => {
    const panel = makePanel("pan_1", [
      makeIcon("ico_top"),
      makeIcon("ico_mid"),
      makeIcon("ico_bottom"),
    ]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    expect(Number(widgetZ(container, "pan_1"))).toBeLessThan(Number(widgetZ(container, "ico_bottom")));
    expect(Number(widgetZ(container, "ico_top"))).toBeGreaterThan(Number(widgetZ(container, "ico_mid")));
    expect(Number(widgetZ(container, "ico_mid"))).toBeGreaterThan(Number(widgetZ(container, "ico_bottom")));
  });

  it("selects the topmost panel child on click instead of the panel", async () => {
    const panel = makePanel("pan_1", [
      makeLabel("lbl_top", "Top"),
      makeLabel("lbl_bottom", "Bottom"),
    ]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Bottom") });
    expect(onSelect).toHaveBeenCalledWith("lbl_bottom");
    expect(onSelect).not.toHaveBeenCalledWith("pan_1");
  });

  it("selects the first panel child when it is higher in the tree", async () => {
    const panel = makePanel("pan_1", [
      makeLabel("lbl_top", "Top"),
      makeLabel("lbl_bottom", "Bottom"),
    ]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Top") });
    expect(onSelect).toHaveBeenCalledWith("lbl_top");
    expect(onSelect).not.toHaveBeenCalledWith("pan_1");
  });

  it("selects the panel when clicking the hit layer", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_corner", "Corner")]);
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    const { container } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    const hitLayer = container.querySelector(
      '[data-widget-id="pan_1"][data-testid="canvas-widget-hit"]',
    ) as HTMLElement;
    await userEvent.pointer({ keys: "[MouseLeft]", target: hitLayer });
    expect(onSelect).toHaveBeenCalledWith("pan_1");
  });

  it("selects the higher screen sibling instead of a lower panel child", async () => {
    const panel = makePanel("pan_1", [makeLabel("lbl_in", "Inside")]);
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_above", "Above"), panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Above") });
    expect(onSelect).toHaveBeenCalledWith("lbl_above");
  });

  it("selects a deeply nested label instead of its parent panels", async () => {
    const inner = makePanel("pan_inner", [makeLabel("lbl_deep", "Deep")]);
    const outer = makePanel("pan_outer", [inner]);
    const project = withChildren(makeFixtureProject(), [outer]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("Deep") });
    expect(onSelect).toHaveBeenCalledWith("lbl_deep");
    expect(onSelect).not.toHaveBeenCalledWith("pan_outer");
    expect(onSelect).not.toHaveBeenCalledWith("pan_inner");
  });

  it("selects the higher of two competing panel subtrees by tree order", async () => {
    const panelTop = makePanel("pan_top", [makeLabel("lbl_top", "TopIn")]);
    const panelBottom = makePanel("pan_bottom", [makeLabel("lbl_bottom", "BottomIn")]);
    const project = withChildren(makeFixtureProject(), [panelTop, panelBottom]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);
    const onSelect = vi.fn();

    render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout, { onSelect })} />,
    );

    await userEvent.pointer({ keys: "[MouseLeft]", target: screen.getByLabelText("TopIn") });
    expect(onSelect).toHaveBeenCalledWith("lbl_top");
    expect(onSelect).not.toHaveBeenCalledWith("pan_bottom");
  });
});

describe("PreviewNode: draftFrame coordinates", () => {
  it("treats draftFrame as absolute canvas coordinates (avoids nested upward jump)", () => {
    const label = makeLabel("lab_1", "Nested");
    label.frame = { x: 8, y: 12, width: 40, height: 7 };
    const panel = makePanel("pan_1", [label]);
    panel.layout = { mode: "absolute", padding: 0, gap: 0, align: "start", justify: "start" };
    panel.frame = { x: 0, y: 40, width: 160, height: 80 };
    const project = withChildren(makeFixtureProject(), [panel]);
    const layout = layoutTree(project.screens[0], project.display.width, project.display.height);

    const { container, rerender } = render(
      <PreviewNode layoutNode={layout} ctx={makePreviewCtx(project, layout)} />,
    );

    const widget = () =>
      container.querySelector(
        '[data-testid="canvas-widget"][data-widget-id="lab_1"]',
      ) as HTMLElement;

    expect(widget().style.top).toBe("52px"); // 40 + 12

    // Parent-local draft (the old move-path bug) would place the widget at y=20.
    rerender(
      <PreviewNode
        layoutNode={layout}
        ctx={makePreviewCtx(project, layout, {
          draftFrame: { nodeId: "lab_1", frame: { x: 8, y: 20, width: 40, height: 7 } },
        })}
      />,
    );
    expect(widget().style.top).toBe("20px");

    // Absolute draftFrame (correct contract) keeps the nested widget at canvas y=60.
    rerender(
      <PreviewNode
        layoutNode={layout}
        ctx={makePreviewCtx(project, layout, {
          draftFrame: { nodeId: "lab_1", frame: { x: 8, y: 60, width: 40, height: 7 } },
        })}
      />,
    );
    expect(widget().style.top).toBe("60px");
  });
});
