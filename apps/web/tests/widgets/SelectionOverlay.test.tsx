import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SelectionOverlay } from "@widgets/canvas-workspace/SelectionOverlay";
import { selectionRectForNode } from "@widgets/canvas-workspace/lib/geometry";

describe("SelectionOverlay", () => {
  const rect = { x: 5, y: 5, width: 20, height: 30 };

  it("renders guide segments outside the selected object bounds", () => {
    const { getAllByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask={false}
        showResizeHandles={false}
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    const guides = getAllByTestId("selection-guide");
    expect(guides).toHaveLength(8);

    const horizontalGuides = guides.filter((guide) => guide.className.includes("guideHorizontal"));
    const verticalGuides = guides.filter((guide) => guide.className.includes("guideVertical"));

    expect(horizontalGuides).toHaveLength(4);
    expect(verticalGuides).toHaveLength(4);
    expect(horizontalGuides.every((guide) => guide.style.left !== "10px")).toBe(true);
    expect(horizontalGuides.every((guide) => guide.style.width !== "40px")).toBe(true);
    expect(verticalGuides.every((guide) => guide.style.top !== "10px")).toBe(true);
    expect(verticalGuides.every((guide) => guide.style.height !== "60px")).toBe(true);
  });

  it("keeps object frame visible while canvas-edge guides are visible", () => {
    const { getAllByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showGuides
        showMoveMask={false}
        showResizeHandles={false}
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );

    expect(getAllByTestId("selection-frame")).toHaveLength(4);
  });

  it("extends alignment guides past the canvas when the object overflows", () => {
    const { getAllByTestId } = render(
      <SelectionOverlay
        rect={{ x: -10, y: 5, width: 40, height: 20 }}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showGuides
        showMoveMask={false}
        showResizeHandles={false}
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );

    const frames = getAllByTestId("selection-frame");
    const horizontalFrames = frames.filter((frame) => frame.className.includes("guideHorizontal"));
    const guides = getAllByTestId("selection-guide");
    const horizontalGuides = guides.filter((guide) => guide.className.includes("guideHorizontal"));

    expect(horizontalFrames.every((frame) => frame.style.left === "-20px")).toBe(true);
    expect(horizontalFrames.every((frame) => frame.style.width === "80px")).toBe(true);
    expect(
      horizontalGuides.some((guide) => guide.style.left === "-20px" && guide.style.width === "20px"),
    ).toBe(true);
  });

  it("keeps selection frame scoped to the object bounds when guides are hidden", () => {
    const { getAllByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showGuides={false}
        showMoveMask={false}
        showResizeHandles={false}
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );

    const frames = getAllByTestId("selection-frame");
    const horizontalFrames = frames.filter((frame) => frame.className.includes("guideHorizontal"));
    const verticalFrames = frames.filter((frame) => frame.className.includes("guideVertical"));

    expect(frames).toHaveLength(4);
    expect(horizontalFrames).toHaveLength(2);
    expect(verticalFrames).toHaveLength(2);
    expect(horizontalFrames.every((frame) => frame.style.left === "10px")).toBe(true);
    expect(horizontalFrames.every((frame) => frame.style.width === "40px")).toBe(true);
    expect(verticalFrames.every((frame) => frame.style.top === "10px")).toBe(true);
    expect(verticalFrames.every((frame) => frame.style.height === "60px")).toBe(true);
  });

  it("places guides on the rotated visual AABB for a 90° shape", () => {
    const layoutRect = { x: 10, y: 20, width: 40, height: 24 };
    const rotatedRect = selectionRectForNode({ type: "rect", rotation: 90 }, layoutRect);
    expect(rotatedRect).toEqual({ x: 18, y: 12, width: 24, height: 40 });

    const { getAllByTestId } = render(
      <SelectionOverlay
        rect={rotatedRect}
        renderZoom={1}
        scaledW={200}
        scaledH={200}
        showGuides
        showMoveMask={false}
        showResizeHandles={false}
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );

    const frames = getAllByTestId("selection-frame");
    const horizontalFrames = frames.filter((frame) => frame.className.includes("guideHorizontal"));
    const verticalFrames = frames.filter((frame) => frame.className.includes("guideVertical"));

    expect(horizontalFrames.every((frame) => frame.style.left === "18px")).toBe(true);
    expect(horizontalFrames.every((frame) => frame.style.width === "24px")).toBe(true);
    expect(verticalFrames.every((frame) => frame.style.top === "12px")).toBe(true);
    expect(verticalFrames.every((frame) => frame.style.height === "40px")).toBe(true);

    const guides = getAllByTestId("selection-guide");
    const verticalGuides = guides.filter((guide) => guide.className.includes("guideVertical"));
    // Left/right canvas-edge guides are anchored at the rotated AABB x edges.
    expect(verticalGuides.some((guide) => guide.style.left === "18px")).toBe(true);
    expect(verticalGuides.some((guide) => guide.style.left === "42px")).toBe(true);
  });

  it("hides only canvas-edge guides when showGuides=false", () => {
    const { getAllByTestId, getByTestId, queryAllByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showGuides={false}
        showMoveMask={false}
        showResizeHandles
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );

    expect(queryAllByTestId("selection-guide")).toHaveLength(0);
    expect(getAllByTestId("selection-frame")).toHaveLength(4);
    expect(getByTestId("resize-handle-nw")).toBeInTheDocument();
    expect(getByTestId("resize-handle-se")).toBeInTheDocument();
  });

  it("renders 4 resize handles when showResizeHandles=true", () => {
    const { container } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask={false}
        showResizeHandles
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    const sizingHandles = container.querySelectorAll('[class*="handleNw"], [class*="handleNe"], [class*="handleSw"], [class*="handleSe"]');
    expect(sizingHandles.length).toBe(4);
    expect(container).toBeDefined();
  });

  it("renders 2 line endpoints when provided", () => {
    const { container } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask={false}
        showResizeHandles={false}
        lineEndpoints={{ start: { x: 5, y: 10 }, end: { x: 15, y: 12 } }}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    const endpoints = container.querySelectorAll('[class*="endpoint"]');
    expect(endpoints).toHaveLength(2);
  });

  it("invokes resize handler with the correct handle id on mousedown", () => {
    const onResize = vi.fn();
    const factory = vi.fn(() => onResize);
    const { getByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={1}
        scaledW={100}
        scaledH={100}
        showMoveMask={false}
        showResizeHandles
        lineEndpoints={null}
        onResizeHandleMouseDown={factory as never}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    fireEvent.mouseDown(getByTestId("resize-handle-nw"));
    expect(factory).toHaveBeenCalledWith("nw");
    expect(onResize).toHaveBeenCalled();
  });

  it("renders a move mask and forwards mousedown", () => {
    const onMove = vi.fn();
    const { getByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask
        showResizeHandles={false}
        lineEndpoints={null}
        onMoveMouseDown={onMove}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    fireEvent.mouseDown(getByTestId("selection-mask"));
    expect(onMove).toHaveBeenCalled();
  });

  it("keeps transform chrome visible but blocks interactions when locked", () => {
    const onMove = vi.fn();
    const onResize = vi.fn();
    const { getByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask
        showResizeHandles
        transformsLocked
        lineEndpoints={null}
        onMoveMouseDown={onMove}
        onResizeHandleMouseDown={() => onResize}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );

    const mask = getByTestId("selection-mask");
    const handle = getByTestId("resize-handle-se");
    expect(mask.className).toMatch(/cursorLocked/);
    expect(handle.className).toMatch(/cursorLocked/);

    fireEvent.mouseDown(mask);
    fireEvent.mouseDown(handle);
    expect(onMove).not.toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it("forwards frame double-click from a resize handle", () => {
    const onFrameDoubleClick = vi.fn();
    const onResize = vi.fn();
    const { getByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask={false}
        showResizeHandles
        lineEndpoints={null}
        onFrameDoubleClick={onFrameDoubleClick}
        onResizeHandleMouseDown={() => onResize}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    fireEvent.doubleClick(getByTestId("resize-handle-s"));
    expect(onFrameDoubleClick).toHaveBeenCalled();
    expect(onResize).not.toHaveBeenCalled();
  });

  it("uses border move strips with a clickable hit area when content interaction is allowed", () => {
    const onMove = vi.fn();
    const { getByTestId, queryByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask
        allowContentInteraction
        showResizeHandles={false}
        lineEndpoints={null}
        onMoveMouseDown={onMove}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    expect(queryByTestId("selection-mask")).toBeNull();
    const strip = getByTestId("selection-move-s");
    expect(strip.style.width).not.toBe("0px");
    fireEvent.mouseDown(strip);
    expect(onMove).toHaveBeenCalled();
  });

  it("exposes a clickable hit area on edge resize handles", () => {
    const { getByTestId } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
        showMoveMask={false}
        showResizeHandles
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    const handle = getByTestId("resize-handle-s");
    expect(handle.style.width).not.toBe("0px");
  });
});
