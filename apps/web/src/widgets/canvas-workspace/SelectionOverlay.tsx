import type { MouseEvent as ReactMouseEvent } from "react";

import type { Frame } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import type { LineHandle, Point, ResizeHandle } from "./lib/geometry";
import styles from "./SelectionOverlay.module.css";

interface SelectionOverlayProps {
  rect: Frame;
  renderZoom: number;
  scaledW: number;
  scaledH: number;
  showMoveMask: boolean;
  showResizeHandles: boolean;
  lineEndpoints: { start: Point; end: Point } | null;
  onMoveMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onMoveMaskDoubleClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onResizeHandleMouseDown: (handle: ResizeHandle) => (event: ReactMouseEvent<HTMLDivElement>) => void;
  onLineEndpointMouseDown: (handle: LineHandle) => (event: ReactMouseEvent<HTMLDivElement>) => void;
}

const resizeHandleClass: Record<ResizeHandle, string> = {
  n: styles.handleN,
  e: styles.handleE,
  s: styles.handleS,
  w: styles.handleW,
  nw: styles.handleNw,
  ne: styles.handleNe,
  sw: styles.handleSw,
  se: styles.handleSe,
};

export function SelectionOverlay({
  rect,
  renderZoom,
  scaledW,
  scaledH,
  showMoveMask,
  showResizeHandles,
  lineEndpoints,
  onMoveMouseDown,
  onMoveMaskDoubleClick,
  onResizeHandleMouseDown,
  onLineEndpointMouseDown,
}: SelectionOverlayProps) {
  const left = Math.round(rect.x * renderZoom);
  const right = Math.round((rect.x + rect.width) * renderZoom);
  const top = Math.round(rect.y * renderZoom);
  const bottom = Math.round((rect.y + rect.height) * renderZoom);
  const maskWidth = Math.max(1, right - left);
  const maskHeight = Math.max(1, bottom - top);

  return (
    <>
      <div className={cn(styles.guide, styles.guideVertical)} style={{ left, top: 0, height: scaledH }} />
      <div className={cn(styles.guide, styles.guideVertical)} style={{ left: right, top: 0, height: scaledH }} />
      <div className={cn(styles.guide, styles.guideHorizontal)} style={{ top, left: 0, width: scaledW }} />
      <div className={cn(styles.guide, styles.guideHorizontal)} style={{ top: bottom, left: 0, width: scaledW }} />
      {showMoveMask && onMoveMouseDown ? (
        <div
          className={styles.selectionMask}
          data-testid="selection-mask"
          style={{ left, top, width: maskWidth, height: maskHeight }}
          onMouseDown={(event) => {
            event.stopPropagation();
            onMoveMouseDown(event);
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            onMoveMaskDoubleClick?.(event);
          }}
        />
      ) : null}
      {showResizeHandles ? (
        <>
          <div
            className={cn(styles.handle, resizeHandleClass.n)}
            data-testid="resize-handle-n"
            style={{ left, top, width: maskWidth }}
            onMouseDown={onResizeHandleMouseDown("n")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.e)}
            data-testid="resize-handle-e"
            style={{ left: right, top, height: maskHeight }}
            onMouseDown={onResizeHandleMouseDown("e")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.s)}
            data-testid="resize-handle-s"
            style={{ left, top: bottom, width: maskWidth }}
            onMouseDown={onResizeHandleMouseDown("s")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.w)}
            data-testid="resize-handle-w"
            style={{ left, top, height: maskHeight }}
            onMouseDown={onResizeHandleMouseDown("w")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.nw)}
            data-testid="resize-handle-nw"
            style={{ left, top }}
            onMouseDown={onResizeHandleMouseDown("nw")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.ne)}
            data-testid="resize-handle-ne"
            style={{ left: right, top }}
            onMouseDown={onResizeHandleMouseDown("ne")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.sw)}
            data-testid="resize-handle-sw"
            style={{ left, top: bottom }}
            onMouseDown={onResizeHandleMouseDown("sw")}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.se)}
            data-testid="resize-handle-se"
            style={{ left: right, top: bottom }}
            onMouseDown={onResizeHandleMouseDown("se")}
          />
        </>
      ) : null}
      {lineEndpoints ? (
        <>
          <div
            className={styles.endpoint}
            style={{
              left: Math.round((lineEndpoints.start.x + 0.5) * renderZoom),
              top: Math.round((lineEndpoints.start.y + 0.5) * renderZoom),
            }}
            onMouseDown={onLineEndpointMouseDown("start")}
          />
          <div
            className={styles.endpoint}
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
