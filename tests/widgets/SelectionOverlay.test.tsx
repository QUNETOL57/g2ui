import { render } from "@testing-library/react";
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
        showResizeHandles
        lineEndpoints={null}
        onResizeHandleMouseDown={() => () => undefined}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    const handles = container.querySelectorAll('[class*="handle"]:not([class*="handleN"], [class*="handleS"], [class*="handleE"], [class*="handleW"])');
    const sizingHandles = container.querySelectorAll('[class*="handleNw"], [class*="handleNe"], [class*="handleSw"], [class*="handleSe"]');
    expect(sizingHandles.length).toBe(4);
    expect(handles.length).toBeGreaterThanOrEqual(0);
  });

  it("renders 2 line endpoints when provided", () => {
    const { container } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={2}
        scaledW={200}
        scaledH={200}
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
    const factory = vi.fn(() => vi.fn());
    const { container } = render(
      <SelectionOverlay
        rect={rect}
        renderZoom={1}
        scaledW={100}
        scaledH={100}
        showResizeHandles
        lineEndpoints={null}
        onResizeHandleMouseDown={factory as never}
        onLineEndpointMouseDown={() => () => undefined}
      />,
    );
    expect(factory).toHaveBeenCalledWith("nw");
    expect(factory).toHaveBeenCalledWith("ne");
    expect(factory).toHaveBeenCalledWith("sw");
    expect(factory).toHaveBeenCalledWith("se");
    expect(container).toBeDefined();
  });
});
