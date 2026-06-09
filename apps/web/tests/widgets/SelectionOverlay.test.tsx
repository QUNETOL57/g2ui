import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SelectionOverlay } from "@widgets/canvas-workspace/SelectionOverlay";

describe("SelectionOverlay", () => {
  const rect = { x: 5, y: 5, width: 20, height: 30 };

  it("renders 4 guides", () => {
    const { container } = render(
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
    const guides = container.querySelectorAll('[class*="guide"]');
    expect(guides.length).toBe(4);
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
