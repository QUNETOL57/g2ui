import { useEffect, useMemo, useRef, useState } from "react";

import { useEditorStore } from "../../store/editorStore";
import { layoutTree } from "../../layout/layoutEngine";
import type { LayoutNode } from "../../layout/layoutEngine";
import { resolveColor } from "../../layout/color";
import { PreviewNode } from "./renderNode";

const MAX_ZOOM = 15;
const MIN_ZOOM = 1;
const ZOOM_STEP = 0.5;
const WHEEL_ZOOM_STEP = 0.25;
const PIXEL_GRID_VISIBLE_ZOOM = 5;
const RULER_SIZE = 24;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function normalizeZoom(value: number): number {
  const clamped = clampZoom(value);
  if (clamped >= PIXEL_GRID_VISIBLE_ZOOM) {
    return Math.round(clamped);
  }
  return Math.round(clamped * 4) / 4;
}

function nextWheelZoom(currentZoom: number, direction: 1 | -1): number {
  if (currentZoom >= PIXEL_GRID_VISIBLE_ZOOM) {
    return clampZoom(currentZoom + direction * WHEEL_ZOOM_STEP);
  }

  const next = currentZoom + direction * WHEEL_ZOOM_STEP;
  if (direction > 0 && next >= PIXEL_GRID_VISIBLE_ZOOM) {
    return PIXEL_GRID_VISIBLE_ZOOM;
  }
  return normalizeZoom(next);
}

function findLayoutNode(layoutNode: LayoutNode, nodeId: string | null): LayoutNode | null {
  if (!nodeId) return null;
  if (layoutNode.node.id === nodeId) return layoutNode;
  for (const child of layoutNode.children) {
    const match = findLayoutNode(child, nodeId);
    if (match) return match;
  }
  return null;
}

export function CanvasWorkspace() {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const centeredViewKeyRef = useRef<string | null>(null);
  const pendingWheelFocusRef = useRef<
    | {
        type: "frame";
        viewportX: number;
        viewportY: number;
        localX: number;
        localY: number;
      }
    | {
        type: "shell";
        viewportX: number;
        viewportY: number;
        ratioX: number;
        ratioY: number;
      }
    | null
  >(null);

  const [zoom, setZoom] = useState(2);
  const [stageViewport, setStageViewport] = useState({ width: 0, height: 0 });

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const layout = useMemo(() => {
    if (!screen) return null;
    return layoutTree(screen, project.display.width, project.display.height);
  }, [screen, project.display.width, project.display.height]);
  const w = project.display.width;
  const h = project.display.height;
  const renderZoom = zoom >= PIXEL_GRID_VISIBLE_ZOOM ? Math.round(zoom) : zoom;
  const horizontalTicks = Array.from({ length: w + 1 }, (_, index) => ({
    value: index,
    offset: Math.round(index * renderZoom),
    major: index % 8 === 0,
  }));
  const verticalTicks = Array.from({ length: h + 1 }, (_, index) => ({
    value: index,
    offset: Math.round(index * renderZoom),
    major: index % 8 === 0,
  }));
  const horizontalGridTicks = horizontalTicks.slice(1, -1);
  const verticalGridTicks = verticalTicks.slice(1, -1);

  const selectedLayoutNode = useMemo(() => {
    if (!layout || !selectedNodeId) return null;
    return findLayoutNode(layout, selectedNodeId);
  }, [layout, selectedNodeId]);

  if (!screen || !layout) {
    return (
      <div className="canvas-wrap">
        <div className="canvas-toolbar">no screen</div>
        <div className="canvas-stage" />
      </div>
    );
  }

  const bg = resolveColor(screen.style?.background, project.palette, "#121212");
  const scaledW = Math.round(w * renderZoom);
  const scaledH = Math.round(h * renderZoom);
  const showPixelGrid = renderZoom >= PIXEL_GRID_VISIBLE_ZOOM;
  const showGuides = !!selectedLayoutNode && selectedLayoutNode.node.id !== screen.id;
  const selectedRect = selectedLayoutNode?.rect ?? null;
  const stageInsetX = Math.max(24, Math.round(stageViewport.width / 2));
  const stageInsetY = Math.max(24, Math.round(stageViewport.height / 2));
  const artboardWidth = scaledW + RULER_SIZE * 2;
  const artboardHeight = scaledH + RULER_SIZE * 2;
  const stageContentWidth = Math.max(stageViewport.width, artboardWidth + stageInsetX * 2);
  const stageContentHeight = Math.max(stageViewport.height, artboardHeight + stageInsetY * 2);
  const artboardOffsetX = Math.max(stageInsetX, Math.round((stageContentWidth - artboardWidth) / 2));
  const artboardOffsetY = Math.max(stageInsetY, Math.round((stageContentHeight - artboardHeight) / 2));
  const frameOffsetX = artboardOffsetX + RULER_SIZE;
  const frameOffsetY = artboardOffsetY + RULER_SIZE;

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const stage = stageRef.current;
      if (!stage) return;

      const target = event.target;
      if (!(target instanceof Node) || !stage.contains(target)) return;

      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      event.stopPropagation();

      const direction: 1 | -1 = event.deltaY < 0 ? 1 : -1;
      const nextZoom = nextWheelZoom(zoom, direction);
      if (nextZoom === zoom) return;

      const rect = stage.getBoundingClientRect();
      const viewportX = event.clientX - rect.left;
      const viewportY = event.clientY - rect.top;
      const contentX = stage.scrollLeft + viewportX;
      const contentY = stage.scrollTop + viewportY;
      const insideFrame =
        contentX >= frameOffsetX &&
        contentX <= frameOffsetX + scaledW &&
        contentY >= frameOffsetY &&
        contentY <= frameOffsetY + scaledH;

      if (insideFrame) {
        pendingWheelFocusRef.current = {
          type: "frame",
          viewportX,
          viewportY,
          localX: (contentX - frameOffsetX) / renderZoom,
          localY: (contentY - frameOffsetY) / renderZoom,
        };
      } else {
        pendingWheelFocusRef.current = {
          type: "shell",
          viewportX,
          viewportY,
          ratioX: artboardWidth > 0 ? (contentX - artboardOffsetX) / artboardWidth : 0,
          ratioY: artboardHeight > 0 ? (contentY - artboardOffsetY) / artboardHeight : 0,
        };
      }

      setZoom(nextZoom);
    };

    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
  }, [
    artboardHeight,
    artboardOffsetX,
    artboardOffsetY,
    artboardWidth,
    frameOffsetX,
    frameOffsetY,
    renderZoom,
    scaledH,
    scaledW,
    zoom,
  ]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateViewport = () => {
      setStageViewport({
        width: stage.clientWidth,
        height: stage.clientHeight,
      });
    };

    updateViewport();

    const observer = new ResizeObserver(() => updateViewport());
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || stageViewport.width === 0 || stageViewport.height === 0) return;

    const centerKey = `${activeScreenId}:${w}x${h}`;
    if (centeredViewKeyRef.current === centerKey) return;

    stage.scrollLeft = Math.max(0, Math.round((stageContentWidth - stage.clientWidth) / 2));
    stage.scrollTop = Math.max(0, Math.round((stageContentHeight - stage.clientHeight) / 2));
    centeredViewKeyRef.current = centerKey;
  }, [activeScreenId, h, stageContentHeight, stageContentWidth, stageViewport.height, stageViewport.width, w]);

  useEffect(() => {
    const stage = stageRef.current;
    const pending = pendingWheelFocusRef.current;
    if (!stage || !pending) return;

    if (pending.type === "frame") {
      const nextContentX = frameOffsetX + pending.localX * renderZoom;
      const nextContentY = frameOffsetY + pending.localY * renderZoom;
      stage.scrollLeft = Math.max(0, Math.round(nextContentX - pending.viewportX));
      stage.scrollTop = Math.max(0, Math.round(nextContentY - pending.viewportY));
    } else {
      const nextContentX = artboardOffsetX + pending.ratioX * artboardWidth;
      const nextContentY = artboardOffsetY + pending.ratioY * artboardHeight;
      stage.scrollLeft = Math.max(0, Math.round(nextContentX - pending.viewportX));
      stage.scrollTop = Math.max(0, Math.round(nextContentY - pending.viewportY));
    }

    pendingWheelFocusRef.current = null;
  }, [artboardHeight, artboardOffsetX, artboardOffsetY, artboardWidth, frameOffsetX, frameOffsetY, renderZoom]);

  return (
    <div className="canvas-wrap">
      <div className="canvas-toolbar">
        <span style={{ fontSize: 12, color: "var(--muted)" }}>
          {w} × {h} · rgb565
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>zoom</label>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(e) => setZoom(normalizeZoom(Number(e.target.value)))}
          />
          <span style={{ fontSize: 12, minWidth: 30 }}>{renderZoom.toFixed(renderZoom % 1 === 0 ? 0 : 1)}×</span>
        </div>
      </div>
      <div
        className="canvas-stage"
        ref={stageRef}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectNode(null);
        }}
      >
        <div
          className="canvas-stage-center"
          style={{
            width: stageContentWidth,
            height: stageContentHeight,
          }}
        >
          <div
            className="canvas-artboard-shell"
            style={{
              width: artboardWidth,
              height: artboardHeight,
              left: artboardOffsetX,
              top: artboardOffsetY,
            }}
          >
            <div
              className="canvas-ruler canvas-ruler-top"
              style={{ left: RULER_SIZE, top: 0, width: scaledW, height: RULER_SIZE }}
            >
              {horizontalTicks.map((tick) => (
                <div
                  key={`top-${tick.value}`}
                  className={`canvas-ruler-tick horizontal ${tick.major ? "major" : ""}`}
                  style={{ left: tick.offset }}
                />
              ))}
              {showGuides && selectedRect ? (
                <>
                  <div className="canvas-ruler-label horizontal" style={{ left: Math.round(selectedRect.x * renderZoom) }}>
                    {selectedRect.x}
                  </div>
                  <div
                    className="canvas-ruler-label horizontal"
                    style={{ left: Math.round((selectedRect.x + selectedRect.width) * renderZoom) }}
                  >
                    {selectedRect.x + selectedRect.width}
                  </div>
                </>
              ) : null}
            </div>

            <div
              className="canvas-ruler canvas-ruler-bottom"
              style={{ left: RULER_SIZE, top: RULER_SIZE + scaledH, width: scaledW, height: RULER_SIZE }}
            >
              {horizontalTicks.map((tick) => (
                <div
                  key={`bottom-${tick.value}`}
                  className={`canvas-ruler-tick horizontal bottom ${tick.major ? "major" : ""}`}
                  style={{ left: tick.offset }}
                />
              ))}
            </div>

            <div
              className="canvas-ruler canvas-ruler-left"
              style={{ left: 0, top: RULER_SIZE, width: RULER_SIZE, height: scaledH }}
            >
              {verticalTicks.map((tick) => (
                <div
                  key={`left-${tick.value}`}
                  className={`canvas-ruler-tick vertical ${tick.major ? "major" : ""}`}
                  style={{ top: tick.offset }}
                />
              ))}
              {showGuides && selectedRect ? (
                <>
                  <div className="canvas-ruler-label vertical left" style={{ top: Math.round(selectedRect.y * renderZoom) }}>
                    {selectedRect.y}
                  </div>
                  <div
                    className="canvas-ruler-label vertical left"
                    style={{ top: Math.round((selectedRect.y + selectedRect.height) * renderZoom) }}
                  >
                    {selectedRect.y + selectedRect.height}
                  </div>
                </>
              ) : null}
            </div>

            <div
              className="canvas-ruler canvas-ruler-right"
              style={{ left: RULER_SIZE + scaledW, top: RULER_SIZE, width: RULER_SIZE, height: scaledH }}
            >
              {verticalTicks.map((tick) => (
                <div
                  key={`right-${tick.value}`}
                  className={`canvas-ruler-tick vertical right ${tick.major ? "major" : ""}`}
                  style={{ top: tick.offset }}
                />
              ))}
              {showGuides && selectedRect ? (
                <>
                  <div className="canvas-ruler-label vertical right" style={{ top: Math.round(selectedRect.y * renderZoom) }}>
                    {selectedRect.y}
                  </div>
                  <div
                    className="canvas-ruler-label vertical right"
                    style={{ top: Math.round((selectedRect.y + selectedRect.height) * renderZoom) }}
                  >
                    {selectedRect.y + selectedRect.height}
                  </div>
                </>
              ) : null}
            </div>

            <div
              className="device-frame"
              style={{
                width: scaledW,
                height: scaledH,
                background: bg,
                left: RULER_SIZE,
                top: RULER_SIZE,
                boxShadow: showPixelGrid ? "0 12px 40px rgba(0, 0, 0, 0.6)" : undefined,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {showPixelGrid ? (
                <div
                  className="canvas-pixel-grid"
                >
                  <div className="canvas-pixel-grid-frame" />
                {verticalGridTicks.map((tick) => (
                    <div
                      key={`grid-h-${tick.value}`}
                      className="canvas-pixel-grid-line horizontal"
                      style={{ top: tick.offset }}
                    />
                  ))}
                {horizontalGridTicks.map((tick) => (
                    <div
                      key={`grid-v-${tick.value}`}
                      className="canvas-pixel-grid-line vertical"
                      style={{ left: tick.offset }}
                    />
                  ))}
                </div>
              ) : null}
              {showGuides && selectedRect ? (
                <>
                  <div
                    className="canvas-guide vertical"
                    style={{ left: Math.round(selectedRect.x * renderZoom), top: 0, height: scaledH }}
                  />
                  <div
                    className="canvas-guide vertical"
                    style={{ left: Math.round((selectedRect.x + selectedRect.width) * renderZoom), top: 0, height: scaledH }}
                  />
                  <div
                    className="canvas-guide horizontal"
                    style={{ top: Math.round(selectedRect.y * renderZoom), left: 0, width: scaledW }}
                  />
                  <div
                    className="canvas-guide horizontal"
                    style={{ top: Math.round((selectedRect.y + selectedRect.height) * renderZoom), left: 0, width: scaledW }}
                  />
                  <div
                    className="canvas-selection-handle"
                    style={{ left: Math.round(selectedRect.x * renderZoom), top: Math.round(selectedRect.y * renderZoom) }}
                  />
                  <div
                    className="canvas-selection-handle"
                    style={{ left: Math.round((selectedRect.x + selectedRect.width) * renderZoom), top: Math.round(selectedRect.y * renderZoom) }}
                  />
                  <div
                    className="canvas-selection-handle"
                    style={{ left: Math.round(selectedRect.x * renderZoom), top: Math.round((selectedRect.y + selectedRect.height) * renderZoom) }}
                  />
                  <div
                    className="canvas-selection-handle"
                    style={{ left: Math.round((selectedRect.x + selectedRect.width) * renderZoom), top: Math.round((selectedRect.y + selectedRect.height) * renderZoom) }}
                  />
                </>
              ) : null}

              <div
                className="canvas-scaled-content"
                style={{
                  position: "relative",
                  width: w,
                  height: h,
                  transformOrigin: "top left",
                  transform: `scale(${renderZoom})`,
                }}
              >
                <PreviewNode
                  layoutNode={layout}
                  ctx={{
                    palette: project.palette,
                    selectedId: selectedNodeId,
                    onSelect: selectNode,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
