import type { MouseEvent as ReactMouseEvent } from "react";

import type { Frame } from "@entities/ui-project";

import type { LineHandle, Point, ResizeHandle } from "./lib/geometry";

interface SelectionOverlayProps {
  rect: Frame;
  renderZoom: number;
  scaledW: number;
  scaledH: number;
  showResizeHandles: boolean;
  lineEndpoints: { start: Point; end: Point } | null;
  onResizeHandleMouseDown: (handle: ResizeHandle) => (event: ReactMouseEvent<HTMLDivElement>) => void;
  onLineEndpointMouseDown: (handle: LineHandle) => (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export function SelectionOverlay({
  rect,
  renderZoom,
  scaledW,
  scaledH,
  showResizeHandles,
  lineEndpoints,
  onResizeHandleMouseDown,
  onLineEndpointMouseDown,
}: SelectionOverlayProps) {
  const left = Math.round(rect.x * renderZoom);
  const right = Math.round((rect.x + rect.width) * renderZoom);
  const top = Math.round(rect.y * renderZoom);
  const bottom = Math.round((rect.y + rect.height) * renderZoom);

  return (
    <>
      <div className="canvas-guide vertical" style={{ left, top: 0, height: scaledH }} />
      <div className="canvas-guide vertical" style={{ left: right, top: 0, height: scaledH }} />
      <div className="canvas-guide horizontal" style={{ top, left: 0, width: scaledW }} />
      <div className="canvas-guide horizontal" style={{ top: bottom, left: 0, width: scaledW }} />
      {showResizeHandles ? (
        <>
          <div
            className="canvas-selection-handle nw"
            style={{ left, top }}
            onMouseDown={onResizeHandleMouseDown("nw")}
          />
          <div
            className="canvas-selection-handle ne"
            style={{ left: right, top }}
            onMouseDown={onResizeHandleMouseDown("ne")}
          />
          <div
            className="canvas-selection-handle sw"
            style={{ left, top: bottom }}
            onMouseDown={onResizeHandleMouseDown("sw")}
          />
          <div
            className="canvas-selection-handle se"
            style={{ left: right, top: bottom }}
            onMouseDown={onResizeHandleMouseDown("se")}
          />
        </>
      ) : null}
      {lineEndpoints ? (
        <>
          <div
            className="canvas-line-endpoint-handle start"
            style={{
              left: Math.round((lineEndpoints.start.x + 0.5) * renderZoom),
              top: Math.round((lineEndpoints.start.y + 0.5) * renderZoom),
            }}
            onMouseDown={onLineEndpointMouseDown("start")}
          />
          <div
            className="canvas-line-endpoint-handle end"
            style={{
              left: Math.round((lineEndpoints.end.x + 0.5) * renderZoom),
              top: Math.round((lineEndpoints.end.y + 0.5) * renderZoom),
            }}
            onMouseDown={onLineEndpointMouseDown("end")}
          />
        </>
      ) : null}
    </>
  );
}
