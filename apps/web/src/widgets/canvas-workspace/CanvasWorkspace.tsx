import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Frame, IconProps, LabelProps, LayoutMode } from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode, findParent } from "@entities/ui-project/model/tree-ops";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";
import { resolveColor } from "@entities/ui-project/lib/color";
import { normalizeIconFrame } from "@entities/icon/iconSizing";
import { RangeSlider } from "@shared/ui/RangeSlider";

import { CanvasRulers } from "./CanvasRulers";
import styles from "./CanvasWorkspace.module.css";
import { SelectionOverlay } from "./SelectionOverlay";
import { PreviewNode } from "./renderNode";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  PIXEL_GRID_VISIBLE_ZOOM,
  RULER_SIZE,
  ZOOM_STEP,
  borderInsetFor,
  clamp,
  clampPointToContent,
  lineEndpointsForRect,
  lineFrameFromEndpoints,
  lineStrokeWidthFor,
  nextWheelZoom,
  normalizeZoom,
  sameFrame,
  visualRectForNode,
} from "./lib/geometry";
import type { LineHandle, Point, ResizeHandle } from "./lib/geometry";
import { findLayoutNode, findParentLayoutNode } from "./lib/layoutNodeOps";

interface ActiveCanvasInteraction {
  type: "move" | "resize" | "line-end";
  nodeId: string;
  startClientX: number;
  startClientY: number;
  startFrame: Frame;
  startRect: Frame;
  parentRect: Frame;
  parentContentInset: number;
  parentMode: LayoutMode;
  siblingCenters?: { id: string; center: number }[];
  handle?: ResizeHandle;
  lineHandle?: LineHandle;
  startLineStart?: Point;
  startLineEnd?: Point;
  isIcon?: boolean;
  iconId?: string;
  latestFrame?: Frame;
  latestLineProps?: Partial<import("@entities/ui-project").LineProps>;
}

interface DragPreview {
  nodeId: string;
  rect: Frame;
  lineProps?: Partial<import("@entities/ui-project").LineProps>;
}

interface InlineLabelDraft {
  nodeId: string | null;
  text: string;
}

const TEXT_COMMIT_DELAY_MS = 400;

export function CanvasWorkspace() {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const absolutizeLayout = useEditorStore((s) => s.absolutizeLayout);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const updateProps = useEditorStore((s) => s.updateProps);
  const setDraftFrame = useEditorStore((s) => s.setDraftFrame);
  const beginHistoryBatch = useEditorStore((s) => s.beginHistoryBatch);
  const commitHistoryBatch = useEditorStore((s) => s.commitHistoryBatch);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const centeredViewKeyRef = useRef<string | null>(null);
  const activeInteractionRef = useRef<ActiveCanvasInteraction | null>(null);
  const pendingDragPreviewRef = useRef<DragPreview | null>(null);
  const dragPreviewRafRef = useRef<number | null>(null);
  const pendingDraftFrameRef = useRef<{ nodeId: string; frame: Frame } | null>(null);
  const draftFrameRafRef = useRef<number | null>(null);
  const pendingWheelFocusRef = useRef<
    | { type: "frame"; viewportX: number; viewportY: number; localX: number; localY: number }
    | { type: "shell"; viewportX: number; viewportY: number; ratioX: number; ratioY: number }
    | null
  >(null);
  const inlineLabelTimerRef = useRef<number | null>(null);
  const inlineLabelEditingRef = useRef(false);
  const editingNodeIdRef = useRef<string | null>(null);
  const layoutRef = useRef<LayoutNode | null>(null);
  const startInteractionRef = useRef<(interaction: ActiveCanvasInteraction) => void>(() => {});

  const [zoom, setZoom] = useState(2);
  const [stageViewport, setStageViewport] = useState({ width: 0, height: 0 });
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [inlineLabelDraft, setInlineLabelDraft] = useState<InlineLabelDraft>({
    nodeId: null,
    text: "",
  });

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const layout = useMemo(() => {
    if (!screen) return null;
    return layoutTree(screen, project.display.width, project.display.height);
  }, [screen, project.display.width, project.display.height]);
  layoutRef.current = layout;
  const w = project.display.width;
  const h = project.display.height;
  const renderZoom = zoom >= PIXEL_GRID_VISIBLE_ZOOM ? Math.round(zoom) : zoom;
  const zoomProgress = ((zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) * 100;
  const horizontalTicks = useMemo(
    () => Array.from({ length: w + 1 }, (_, index) => ({
      value: index,
      offset: Math.round(index * renderZoom),
      major: index % 8 === 0,
    })),
    [w, renderZoom],
  );
  const verticalTicks = useMemo(
    () => Array.from({ length: h + 1 }, (_, index) => ({
      value: index,
      offset: Math.round(index * renderZoom),
      major: index % 8 === 0,
    })),
    [h, renderZoom],
  );

  const selectedLayoutNode = useMemo(() => {
    if (!layout || !selectedNodeId) return null;
    return findLayoutNode(layout, selectedNodeId);
  }, [layout, selectedNodeId]);
  const selectedParentLayoutNode = useMemo(() => {
    if (!layout || !selectedNodeId) return null;
    return findParentLayoutNode(layout, selectedNodeId);
  }, [layout, selectedNodeId]);
  const selectedNode = useMemo(
    () => (selectedNodeId ? findNode(project, selectedNodeId) : null),
    [project, selectedNodeId],
  );
  const selectedParentNode = useMemo(
    () => (selectedNodeId ? findParent(project, selectedNodeId) : null),
    [project, selectedNodeId],
  );

  useEffect(() => {
    if (selectedNode?.type !== "label") {
      if (editingNodeIdRef.current !== null) {
        setInlineLabelDraft({ nodeId: null, text: "" });
      }
      inlineLabelEditingRef.current = false;
      editingNodeIdRef.current = null;
      return;
    }
    if (editingNodeIdRef.current !== selectedNode.id) {
      editingNodeIdRef.current = selectedNode.id;
      inlineLabelEditingRef.current = false;
      setInlineLabelDraft({
        nodeId: selectedNode.id,
        text: ((selectedNode.props ?? {}) as LabelProps).text ?? "",
      });
    }
  }, [selectedNode]);

  if (!screen || !layout) {
    return (
      <div className={styles.wrap}>
        <div className={styles.toolbar}>no screen</div>
        <div className={styles.stage} />
      </div>
    );
  }

  const bg =
    screen.style?.drawBackground === false
      ? "#000000"
      : resolveColor(screen.style?.background, project.palette, "#121212");
  const scaledW = Math.round(w * renderZoom);
  const scaledH = Math.round(h * renderZoom);
  const showPixelGrid = renderZoom >= PIXEL_GRID_VISIBLE_ZOOM;
  const showGuides = !!selectedLayoutNode && selectedLayoutNode.node.id !== screen.id;
  const selectedRect = selectedLayoutNode?.rect ?? null;
  const rawDisplayedSelectedRect =
    dragPreview && dragPreview.nodeId === selectedNodeId ? dragPreview.rect : selectedRect;
  const displayedSelectedRect = rawDisplayedSelectedRect && selectedNode
    ? visualRectForNode(selectedNode, rawDisplayedSelectedRect)
    : rawDisplayedSelectedRect;
  const displayedLineEndpoints =
    displayedSelectedRect && selectedNode?.type === "line"
      ? lineEndpointsForRect(
          dragPreview?.nodeId === selectedNodeId && dragPreview.lineProps
            ? { ...selectedNode, props: { ...(selectedNode.props ?? {}), ...dragPreview.lineProps } }
            : selectedNode,
          displayedSelectedRect,
        )
      : null;
  const selectedParentMode: LayoutMode = selectedParentNode?.layout?.mode ?? "absolute";
  const selectionHasFrame = !!selectedNode?.frame && !!selectedParentLayoutNode;
  const canMoveSelection =
    !!selectedNode && selectedNode.id !== screen.id && selectionHasFrame;
  const canResizeSelection =
    !!selectedNode &&
    selectedNode.id !== screen.id &&
    selectionHasFrame &&
    selectedNode?.type !== "line";
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

  useEffect(() => {
    return () => {
      activeInteractionRef.current = null;
      pendingDragPreviewRef.current = null;
      if (dragPreviewRafRef.current !== null) {
        window.cancelAnimationFrame(dragPreviewRafRef.current);
        dragPreviewRafRef.current = null;
      }
      pendingDraftFrameRef.current = null;
      if (draftFrameRafRef.current !== null) {
        window.cancelAnimationFrame(draftFrameRafRef.current);
        draftFrameRafRef.current = null;
      }
      if (inlineLabelTimerRef.current !== null) {
        window.clearTimeout(inlineLabelTimerRef.current);
        inlineLabelTimerRef.current = null;
      }
      setDraftFrame(null);
      document.body.style.userSelect = "";
    };
  }, [setDraftFrame]);

  const clearInlineLabelTimer = useCallback(() => {
    if (inlineLabelTimerRef.current === null) return;
    window.clearTimeout(inlineLabelTimerRef.current);
    inlineLabelTimerRef.current = null;
  }, []);

  const commitInlineLabelText = useCallback((nodeId: string, text: string) => {
    if (!inlineLabelEditingRef.current || editingNodeIdRef.current !== nodeId) return;
    clearInlineLabelTimer();
    updateProps(nodeId, { text }, { history: false });
    commitHistoryBatch();
    inlineLabelEditingRef.current = false;
    editingNodeIdRef.current = null;
  }, [clearInlineLabelTimer, updateProps, commitHistoryBatch]);

  const scheduleInlineLabelCommit = (nodeId: string, text: string) => {
    clearInlineLabelTimer();
    inlineLabelTimerRef.current = window.setTimeout(
      () => commitInlineLabelText(nodeId, text),
      TEXT_COMMIT_DELAY_MS,
    );
  };
  const scheduleInlineLabelCommitRef = useRef(scheduleInlineLabelCommit);
  scheduleInlineLabelCommitRef.current = scheduleInlineLabelCommit;

  const updateInlineLabelText = useCallback((nodeId: string, text: string) => {
    if (!inlineLabelEditingRef.current || editingNodeIdRef.current !== nodeId) {
      beginHistoryBatch();
      inlineLabelEditingRef.current = true;
      editingNodeIdRef.current = nodeId;
    }
    setInlineLabelDraft({ nodeId, text });
    scheduleInlineLabelCommitRef.current(nodeId, text);
  }, [beginHistoryBatch]);

  const scheduleDragPreview = (preview: DragPreview) => {
    pendingDragPreviewRef.current = preview;
    if (dragPreviewRafRef.current !== null) return;

    dragPreviewRafRef.current = window.requestAnimationFrame(() => {
      dragPreviewRafRef.current = null;
      const next = pendingDragPreviewRef.current;
      pendingDragPreviewRef.current = null;
      if (next) setDragPreview(next);
    });
  };

  const scheduleDraftFrame = (draft: { nodeId: string; frame: Frame }) => {
    pendingDraftFrameRef.current = draft;
    if (draftFrameRafRef.current !== null) return;

    draftFrameRafRef.current = window.requestAnimationFrame(() => {
      draftFrameRafRef.current = null;
      const next = pendingDraftFrameRef.current;
      pendingDraftFrameRef.current = null;
      if (next) setDraftFrame(next);
    });
  };

  const startInteraction = (interaction: ActiveCanvasInteraction) => {
    activeInteractionRef.current = interaction;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handleMouseMove = (event: MouseEvent) => {
      const active = activeInteractionRef.current;
      if (!active) return;

      const deltaX = Math.round((event.clientX - active.startClientX) / renderZoom);
      const deltaY = Math.round((event.clientY - active.startClientY) / renderZoom);

      if (active.type === "move") {
        if (active.parentMode === "absolute") {
          const minX = active.parentContentInset;
          const minY = active.parentContentInset;
          const maxX = Math.max(minX, active.parentRect.width - active.parentContentInset - active.startFrame.width);
          const maxY = Math.max(minY, active.parentRect.height - active.parentContentInset - active.startFrame.height);
          const nextFrame = {
            x: clamp(active.startFrame.x + deltaX, minX, maxX),
            y: clamp(active.startFrame.y + deltaY, minY, maxY),
            width: active.startFrame.width,
            height: active.startFrame.height,
          };
          if (sameFrame(active.latestFrame ?? active.startFrame, nextFrame)) return;
          active.latestFrame = nextFrame;
          scheduleDraftFrame({ nodeId: active.nodeId, frame: nextFrame });
          scheduleDragPreview({
            nodeId: active.nodeId,
            rect: {
              x: active.parentRect.x + nextFrame.x,
              y: active.parentRect.y + nextFrame.y,
              width: nextFrame.width,
              height: nextFrame.height,
            },
          });
          return;
        }

        const pointerCenter =
          active.parentMode === "row"
            ? active.startRect.x + Math.round(deltaX) + Math.round(active.startRect.width / 2)
            : active.startRect.y + Math.round(deltaY) + Math.round(active.startRect.height / 2);
        const nextIndex = active.siblingCenters?.reduce((acc, sibling, index) => {
          if (pointerCenter >= sibling.center) return index + 1;
          return acc;
        }, 0) ?? 0;
        useEditorStore.getState().moveNodeToIndex(active.nodeId, nextIndex);
        return;
      }

      if (active.type === "line-end") {
        if (!active.startLineStart || !active.startLineEnd || !active.lineHandle) return;
        const movedPoint = {
          x: (active.lineHandle === "start" ? active.startLineStart.x : active.startLineEnd.x) + deltaX,
          y: (active.lineHandle === "start" ? active.startLineStart.y : active.startLineEnd.y) + deltaY,
        };
        const nextStart =
          active.lineHandle === "start"
            ? clampPointToContent(movedPoint, active.parentRect, active.parentContentInset)
            : active.startLineStart;
        const nextEnd =
          active.lineHandle === "end"
            ? clampPointToContent(movedPoint, active.parentRect, active.parentContentInset)
            : active.startLineEnd;
        const strokeWidth = lineStrokeWidthFor(findNode(project, active.nodeId));
        const { frame: nextFrame, props: nextLineProps } = lineFrameFromEndpoints(
          nextStart,
          nextEnd,
          active.parentRect,
          strokeWidth,
        );
        if (sameFrame(active.latestFrame ?? active.startFrame, nextFrame)) return;
        active.latestFrame = nextFrame;
        active.latestLineProps = nextLineProps;
        scheduleDraftFrame({ nodeId: active.nodeId, frame: nextFrame });
        scheduleDragPreview({
          nodeId: active.nodeId,
          rect: {
            x: active.parentRect.x + nextFrame.x,
            y: active.parentRect.y + nextFrame.y,
            width: nextFrame.width,
            height: nextFrame.height,
          },
          lineProps: nextLineProps,
        });
        return;
      }

      const startRight = active.startFrame.x + active.startFrame.width;
      const startBottom = active.startFrame.y + active.startFrame.height;
      let nextLeft = active.startFrame.x;
      let nextTop = active.startFrame.y;
      let nextRight = startRight;
      let nextBottom = startBottom;

      if (active.parentMode === "absolute") {
        if (active.handle?.includes("w")) {
          nextLeft = clamp(active.startFrame.x + deltaX, active.parentContentInset, startRight - 1);
        }
        if (active.handle?.includes("e")) {
          nextRight = clamp(
            startRight + deltaX,
            active.startFrame.x + 1,
            active.parentRect.width - active.parentContentInset,
          );
        }
        if (active.handle?.includes("n")) {
          nextTop = clamp(active.startFrame.y + deltaY, active.parentContentInset, startBottom - 1);
        }
        if (active.handle?.includes("s")) {
          nextBottom = clamp(
            startBottom + deltaY,
            active.startFrame.y + 1,
            active.parentRect.height - active.parentContentInset,
          );
        }
      } else {
        if (active.handle?.includes("w") || active.handle?.includes("e")) {
          const nextWidthDelta = active.handle?.includes("w") ? -deltaX : deltaX;
          nextRight = clamp(
            active.startFrame.x + active.startFrame.width + nextWidthDelta,
            active.startFrame.x + 1,
            active.parentRect.width,
          );
        }
        if (active.handle?.includes("n") || active.handle?.includes("s")) {
          const nextHeightDelta = active.handle?.includes("n") ? -deltaY : deltaY;
          nextBottom = clamp(
            active.startFrame.y + active.startFrame.height + nextHeightDelta,
            active.startFrame.y + 1,
            active.parentRect.height,
          );
        }
      }

      let nextFrame = {
        x: nextLeft,
        y: nextTop,
        width: nextRight - nextLeft,
        height: nextBottom - nextTop,
      };
      if (active.isIcon) {
        const anchorX = active.handle?.includes("w") ? "right" : "left";
        const anchorY = active.handle?.includes("n") ? "bottom" : "top";
        const maxWidth =
          anchorX === "right"
            ? active.startFrame.x + active.startFrame.width
            : active.parentRect.width - active.parentContentInset - active.startFrame.x;
        const maxHeight =
          anchorY === "bottom"
            ? active.startFrame.y + active.startFrame.height
            : active.parentRect.height - active.parentContentInset - active.startFrame.y;
        nextFrame = normalizeIconFrame(active.iconId, nextFrame, {
          anchorX,
          anchorY,
          maxWidth,
          maxHeight,
        });
      }
      if (sameFrame(active.latestFrame ?? active.startFrame, nextFrame)) return;
      active.latestFrame = nextFrame;
      scheduleDragPreview({
        nodeId: active.nodeId,
        rect: {
          x: active.parentRect.x + nextFrame.x,
          y: active.parentRect.y + nextFrame.y,
          width: nextFrame.width,
          height: nextFrame.height,
        },
      });
    };

    const handleMouseUp = () => {
      const active = activeInteractionRef.current;
      activeInteractionRef.current = null;
      pendingDragPreviewRef.current = null;
      if (dragPreviewRafRef.current !== null) {
        window.cancelAnimationFrame(dragPreviewRafRef.current);
        dragPreviewRafRef.current = null;
      }
      pendingDraftFrameRef.current = null;
      if (draftFrameRafRef.current !== null) {
        window.cancelAnimationFrame(draftFrameRafRef.current);
        draftFrameRafRef.current = null;
      }
      setDragPreview(null);
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      if (active?.latestFrame) {
        updateFrame(active.nodeId, active.latestFrame);
      }
      if (active?.latestLineProps) {
        updateProps(active.nodeId, active.latestLineProps);
      }
      setDraftFrame(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };
  startInteractionRef.current = startInteraction;

  const makeAbsoluteChildFrames = (parentLayout: LayoutNode) =>
    parentLayout.children.map((child) => ({
      id: child.node.id,
      frame: {
        x: child.rect.x - parentLayout.rect.x,
        y: child.rect.y - parentLayout.rect.y,
        width: child.rect.width,
        height: child.rect.height,
      },
    }));

  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent<HTMLDivElement>) => {
    const node = findNode(project, nodeId);
    const parentNode = findParent(project, nodeId);
    const nodeLayout = layout ? findLayoutNode(layout, nodeId) : null;
    const parentLayout = layout ? findParentLayoutNode(layout, nodeId) : null;
    if (!node || !node.frame || !nodeLayout || !parentLayout || node.id === screen.id) return;
    if (event.button !== 0) return;
    event.preventDefault();
    const parentMode: LayoutMode = parentNode?.layout?.mode ?? "absolute";
    const startFrame: Frame = {
      x: nodeLayout.rect.x - parentLayout.rect.x,
      y: nodeLayout.rect.y - parentLayout.rect.y,
      width: nodeLayout.rect.width,
      height: nodeLayout.rect.height,
    };

    if (parentNode && parentMode !== "absolute") {
      absolutizeLayout(parentNode.id, makeAbsoluteChildFrames(parentLayout));
    }

    const siblingCenters =
      parentMode === "absolute"
        ? undefined
        : parentLayout.children
            .filter((child) => child.node.id !== nodeId)
            .map((child) => ({
              id: child.node.id,
              center:
                parentMode === "row"
                  ? child.rect.x + Math.round(child.rect.width / 2)
                  : child.rect.y + Math.round(child.rect.height / 2),
            }));
    startInteractionRef.current({
      type: "move",
      nodeId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFrame,
      startRect: { ...nodeLayout.rect },
      parentRect: parentLayout.rect,
      parentContentInset: borderInsetFor(parentNode),
      parentMode: "absolute",
      siblingCenters,
    });
  }, [project, layout, screen?.id, absolutizeLayout]);

  const handleResizeMouseDown =
    (handle: ResizeHandle) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canResizeSelection || !selectedNodeId || !selectedNode?.frame || !selectedParentLayoutNode) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const startFrame: Frame = selectedRect
        ? {
            x: selectedRect.x - selectedParentLayoutNode.rect.x,
            y: selectedRect.y - selectedParentLayoutNode.rect.y,
            width: selectedRect.width,
            height: selectedRect.height,
          }
        : { ...selectedNode.frame };

      if (selectedParentNode && selectedParentMode !== "absolute") {
        absolutizeLayout(selectedParentNode.id, makeAbsoluteChildFrames(selectedParentLayoutNode));
      }

      startInteraction({
        type: "resize",
        nodeId: selectedNodeId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startFrame,
        startRect: { ...(selectedRect ?? selectedNode.frame) },
        parentRect: selectedParentLayoutNode.rect,
        parentContentInset: borderInsetFor(selectedParentNode),
        parentMode: "absolute",
        handle,
        isIcon: selectedNode.type === "icon",
        iconId:
          selectedNode.type === "icon"
            ? ((selectedNode.props ?? {}) as Partial<IconProps>).iconId
            : undefined,
      });
    };

  const handleLineEndpointMouseDown =
    (lineHandle: LineHandle) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedNodeId || selectedNode?.type !== "line" || !selectedRect || !selectedParentLayoutNode) return;
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const visualLineRect = visualRectForNode(selectedNode, selectedRect);
      const endpoints = lineEndpointsForRect(selectedNode, visualLineRect);
      const parentMode: LayoutMode = selectedParentNode?.layout?.mode ?? "absolute";

      if (selectedParentNode && parentMode !== "absolute") {
        absolutizeLayout(selectedParentNode.id, makeAbsoluteChildFrames(selectedParentLayoutNode));
      }

      startInteraction({
        type: "line-end",
        nodeId: selectedNodeId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startFrame: {
          x: visualLineRect.x - selectedParentLayoutNode.rect.x,
          y: visualLineRect.y - selectedParentLayoutNode.rect.y,
          width: visualLineRect.width,
          height: visualLineRect.height,
        },
        startRect: visualLineRect,
        parentRect: selectedParentLayoutNode.rect,
        parentContentInset: borderInsetFor(selectedParentNode),
        parentMode: "absolute",
        lineHandle,
        startLineStart: endpoints.start,
        startLineEnd: endpoints.end,
      });
    };

  const renderCtx = useMemo(
    () => ({
      palette: project.palette,
      selectedId: selectedNodeId,
      movableId: canMoveSelection ? selectedNodeId : null,
      dragPreview,
      onSelect: selectNode,
      onNodeMouseDown: handleNodeMouseDown,
      inlineLabelText: {
        nodeId: inlineLabelDraft.nodeId,
        text: inlineLabelDraft.text,
        onChange: updateInlineLabelText,
        onCommit: commitInlineLabelText,
      },
    }),
    [
      project.palette,
      selectedNodeId,
      canMoveSelection,
      dragPreview,
      selectNode,
      handleNodeMouseDown,
      inlineLabelDraft.nodeId,
      inlineLabelDraft.text,
      updateInlineLabelText,
      commitInlineLabelText,
    ],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarMeta}>
          <span>{w} × {h}</span>
          <span>rgb565</span>
        </div>
        <div className={styles.zoomControl}>
          <label>zoom</label>
          <RangeSlider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            progress={zoomProgress}
            onChange={(e) => setZoom(normalizeZoom(Number(e.target.value)))}
          />
          <span className={styles.zoomValue}>
            {renderZoom.toFixed(renderZoom % 1 === 0 ? 0 : 1)}×
          </span>
        </div>
      </div>
      <div
        className={styles.stage}
        ref={stageRef}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) selectNode(null);
        }}
      >
        <div
          className={styles.stageCenter}
          style={{ width: stageContentWidth, height: stageContentHeight }}
        >
          <div
            className={styles.artboardShell}
            style={{
              width: artboardWidth,
              height: artboardHeight,
              left: artboardOffsetX,
              top: artboardOffsetY,
            }}
          >
            <CanvasRulers
              horizontalTicks={horizontalTicks}
              verticalTicks={verticalTicks}
              scaledW={scaledW}
              scaledH={scaledH}
              renderZoom={renderZoom}
              selectionRect={showGuides ? displayedSelectedRect : null}
              showSelectionLabels={showGuides}
            />

            <div
              className={styles.deviceFrame}
              style={{
                width: scaledW,
                height: scaledH,
                background: bg,
                left: RULER_SIZE,
                top: RULER_SIZE,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {showPixelGrid ? (
                <div
                  className={styles.pixelGrid}
                  style={{
                    backgroundImage:
                      "linear-gradient(#171717 1px, transparent 1px), linear-gradient(90deg, #171717 1px, transparent 1px)",
                    backgroundPosition: `${renderZoom}px ${renderZoom}px`,
                    backgroundSize: `${renderZoom}px ${renderZoom}px`,
                  }}
                >
                  <div className={styles.pixelGridFrame} />
                </div>
              ) : null}
              {showGuides && displayedSelectedRect ? (
                <SelectionOverlay
                  rect={displayedSelectedRect}
                  renderZoom={renderZoom}
                  scaledW={scaledW}
                  scaledH={scaledH}
                  showResizeHandles={canResizeSelection}
                  lineEndpoints={displayedLineEndpoints}
                  onResizeHandleMouseDown={handleResizeMouseDown}
                  onLineEndpointMouseDown={handleLineEndpointMouseDown}
                />
              ) : null}

              <div
                className={styles.scaledContent}
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
                  ctx={renderCtx}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
