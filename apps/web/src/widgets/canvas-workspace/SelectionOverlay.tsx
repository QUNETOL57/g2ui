import type { MouseEvent as ReactMouseEvent } from "react";

import type { Frame } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import { guideSpanAfter, guideSpanBefore, type LineHandle, type Point, type ResizeHandle } from "./lib/geometry";
import styles from "./SelectionOverlay.module.css";

interface SelectionOverlayProps {
  rect: Frame;
  renderZoom: number;
  scaledW: number;
  scaledH: number;
  showGuides?: boolean;
  showMoveMask: boolean;
  showResizeHandles: boolean;
  transformsLocked?: boolean;
  lineEndpoints: { start: Point; end: Point } | null;
  frameTestId?: string;
  onMoveMouseDown?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  onFrameDoubleClick?: (event: ReactMouseEvent<HTMLDivElement>) => void;
  allowContentInteraction?: boolean;
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

const moveStripClass = {
  n: styles.moveStripN,
  s: styles.moveStripS,
  w: styles.moveStripW,
  e: styles.moveStripE,
} as const;

const frameEdges = ["n", "s", "w", "e"] as const;

export function SelectionOverlay({
  rect,
  renderZoom,
  scaledW,
  scaledH,
  showGuides = true,
  showMoveMask,
  showResizeHandles,
  transformsLocked = false,
  lineEndpoints,
  frameTestId = "selection-frame",
  onMoveMouseDown,
  onFrameDoubleClick,
  allowContentInteraction = false,
  onResizeHandleMouseDown,
  onLineEndpointMouseDown,
}: SelectionOverlayProps) {
  const left = Math.round(rect.x * renderZoom);
  const right = Math.round((rect.x + rect.width) * renderZoom);
  const top = Math.round(rect.y * renderZoom);
  const bottom = Math.round((rect.y + rect.height) * renderZoom);
  const maskWidth = Math.max(1, right - left);
  const maskHeight = Math.max(1, bottom - top);
  const lockedCursorClass = transformsLocked ? styles.cursorLocked : undefined;

  const handleMoveMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (transformsLocked) return;
    onMoveMouseDown?.(event);
  };

  const handleFrameDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (transformsLocked) return;
    onFrameDoubleClick?.(event);
  };

  const handleResizeMouseDown =
    (handle: ResizeHandle) => (event: ReactMouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (transformsLocked) return;
      if (onFrameDoubleClick && event.detail >= 2) {
        event.preventDefault();
        handleFrameDoubleClick(event);
        return;
      }
      onResizeHandleMouseDown(handle)(event);
    };

  const handleLineEndpointMouseDown =
    (handle: LineHandle) => (event: ReactMouseEvent<HTMLDivElement>) => {
      event.stopPropagation();
      if (transformsLocked) return;
      onLineEndpointMouseDown(handle)(event);
    };

  const showBorderMove = showMoveMask && allowContentInteraction && onMoveMouseDown;
  const showCenterMoveMask = showMoveMask && !allowContentInteraction && onMoveMouseDown;
  const verticalBefore = guideSpanBefore(top);
  const verticalAfter = guideSpanAfter(bottom, scaledH);
  const horizontalBefore = guideSpanBefore(left);
  const horizontalAfter = guideSpanAfter(right, scaledW);

  const edgeLayout = {
    n: { left, top, width: maskWidth },
    s: { left, top: bottom, width: maskWidth },
    w: { left, top, height: maskHeight },
    e: { left: right, top, height: maskHeight },
  } as const;

  return (
    <>
      {showGuides ? (
        <>
          <div
            className={cn(styles.guide, styles.guideVertical)}
            data-testid="selection-guide"
            style={{ left, top: verticalBefore.origin, height: verticalBefore.size }}
          />
          <div
            className={cn(styles.guide, styles.guideVertical)}
            data-testid="selection-guide"
            style={{ left, top: verticalAfter.origin, height: verticalAfter.size }}
          />
          <div
            className={cn(styles.guide, styles.guideVertical)}
            data-testid="selection-guide"
            style={{ left: right, top: verticalBefore.origin, height: verticalBefore.size }}
          />
          <div
            className={cn(styles.guide, styles.guideVertical)}
            data-testid="selection-guide"
            style={{ left: right, top: verticalAfter.origin, height: verticalAfter.size }}
          />
          <div
            className={cn(styles.guide, styles.guideHorizontal)}
            data-testid="selection-guide"
            style={{ top, left: horizontalBefore.origin, width: horizontalBefore.size }}
          />
          <div
            className={cn(styles.guide, styles.guideHorizontal)}
            data-testid="selection-guide"
            style={{ top, left: horizontalAfter.origin, width: horizontalAfter.size }}
          />
          <div
            className={cn(styles.guide, styles.guideHorizontal)}
            data-testid="selection-guide"
            style={{ top: bottom, left: horizontalBefore.origin, width: horizontalBefore.size }}
          />
          <div
            className={cn(styles.guide, styles.guideHorizontal)}
            data-testid="selection-guide"
            style={{ top: bottom, left: horizontalAfter.origin, width: horizontalAfter.size }}
          />
        </>
      ) : null}
      <div
        className={cn(styles.guide, styles.guideVertical)}
        data-testid={frameTestId}
        style={{ left, top, height: maskHeight }}
      />
      <div
        className={cn(styles.guide, styles.guideVertical)}
        data-testid={frameTestId}
        style={{ left: right, top, height: maskHeight }}
      />
      <div
        className={cn(styles.guide, styles.guideHorizontal)}
        data-testid={frameTestId}
        style={{ top, left, width: maskWidth }}
      />
      <div
        className={cn(styles.guide, styles.guideHorizontal)}
        data-testid={frameTestId}
        style={{ top: bottom, left, width: maskWidth }}
      />
      {showBorderMove
        ? frameEdges.map((edge) => (
            <div
              key={`move-${edge}`}
              className={cn(styles.moveStrip, moveStripClass[edge], lockedCursorClass)}
              data-testid={`selection-move-${edge}`}
              style={edgeLayout[edge]}
              onMouseDown={handleMoveMouseDown}
            />
          ))
        : null}
      {showCenterMoveMask ? (
        <div
          className={cn(styles.selectionMask, lockedCursorClass)}
          data-testid="selection-mask"
          style={{ left, top, width: maskWidth, height: maskHeight }}
          onMouseDown={handleMoveMouseDown}
        />
      ) : null}
      {showResizeHandles ? (
        <>
          <div
            className={cn(styles.handle, resizeHandleClass.n, lockedCursorClass)}
            data-testid="resize-handle-n"
            style={{ left, top, width: maskWidth }}
            onMouseDown={handleResizeMouseDown("n")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.e, lockedCursorClass)}
            data-testid="resize-handle-e"
            style={{ left: right, top, height: maskHeight }}
            onMouseDown={handleResizeMouseDown("e")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.s, lockedCursorClass)}
            data-testid="resize-handle-s"
            style={{ left, top: bottom, width: maskWidth }}
            onMouseDown={handleResizeMouseDown("s")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.w, lockedCursorClass)}
            data-testid="resize-handle-w"
            style={{ left, top, height: maskHeight }}
            onMouseDown={handleResizeMouseDown("w")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.nw, lockedCursorClass)}
            data-testid="resize-handle-nw"
            style={{ left, top }}
            onMouseDown={handleResizeMouseDown("nw")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.ne, lockedCursorClass)}
            data-testid="resize-handle-ne"
            style={{ left: right, top }}
            onMouseDown={handleResizeMouseDown("ne")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.sw, lockedCursorClass)}
            data-testid="resize-handle-sw"
            style={{ left, top: bottom }}
            onMouseDown={handleResizeMouseDown("sw")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
          <div
            className={cn(styles.handle, resizeHandleClass.se, lockedCursorClass)}
            data-testid="resize-handle-se"
            style={{ left: right, top: bottom }}
            onMouseDown={handleResizeMouseDown("se")}
            onDoubleClick={onFrameDoubleClick ? handleFrameDoubleClick : undefined}
          />
        </>
      ) : null}
      {lineEndpoints ? (
        <>
          <div
            className={cn(styles.endpoint, lockedCursorClass)}
            style={{
              left: Math.round((lineEndpoints.start.x + 0.5) * renderZoom),
              top: Math.round((lineEndpoints.start.y + 0.5) * renderZoom),
            }}
            onMouseDown={handleLineEndpointMouseDown("start")}
          />
          <div
            className={cn(styles.endpoint, lockedCursorClass)}
            style={{
              left: Math.round((lineEndpoints.end.x + 0.5) * renderZoom),
              top: Math.round((lineEndpoints.end.y + 0.5) * renderZoom),
            }}
            onMouseDown={handleLineEndpointMouseDown("end")}
          />
        </>
      ) : null}
    </>
  );
}
