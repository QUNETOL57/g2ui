import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Frame, IconProps, LayoutMode, PixelPoint } from "@entities/ui-project";
import { draftFrameFor, flattenSelectableIds, pruneMovableSelection } from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode, findParent } from "@entities/ui-project/model/tree-ops";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";
import { resolveColor, resolveScreenBackground } from "@entities/ui-project/lib/color";
import { normalizeIconFrame } from "@entities/icon/iconSizing";
import { cn } from "@shared/lib/cn";
import { debugLog } from "@shared/lib/debugLog";
import { IconButton } from "@shared/ui/IconButton";
import { SidebarPanelIcon } from "@shared/ui/SidebarPanelIcon";

import { CanvasRulers } from "./CanvasRulers";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasZoomToolbar } from "./CanvasZoomToolbar";
import styles from "./CanvasWorkspace.module.css";
import { MarqueeOverlay } from "./MarqueeOverlay";
import { SelectionOverlay } from "./SelectionOverlay";
import { PreviewNode } from "./renderNode";
import { computeWidgetStackIndices } from "./lib/widgetStackIndices";
import {
  PIXEL_GRID_VISIBLE_ZOOM,
  RULER_SIZE,
  MARQUEE_THRESHOLD_PX,
  borderInsetFor,
  constrainPointToContent,
  constrainToRange,
  lineEndpointsForRect,
  lineFrameFromEndpoints,
  lineStrokeWidthFor,
  nextWheelZoom,
  normalizeZoom,
  rectFromDragPoints,
  renderZoomFor,
  sameFrame,
  selectionLineEndpointsForNode,
  selectionRectForNode,
  collectNodeIdsInRect,
  unionRect,
  visualRectForNode,
  zoomToProgress,
} from "./lib/geometry";
import type { LineHandle, Point, ResizeHandle } from "./lib/geometry";
import { findLayoutNode, findParentLayoutNode } from "./lib/layoutNodeOps";

interface GroupMoveMember {
  nodeId: string;
  startFrame: Frame;
  parentRect: Frame;
  parentContentInset: number;
  constrainToParent: boolean;
}

interface ActiveCanvasInteraction {
  type: "move" | "resize" | "line-end" | "move-group";
  nodeId: string;
  startClientX: number;
  startClientY: number;
  startFrame: Frame;
  startRect: Frame;
  parentRect: Frame;
  parentContentInset: number;
  parentMode: LayoutMode;
  constrainToParent: boolean;
  siblingCenters?: { id: string; center: number }[];
  handle?: ResizeHandle;
  lineHandle?: LineHandle;
  startLineStart?: Point;
  startLineEnd?: Point;
  isIcon?: boolean;
  iconId?: string;
  latestFrame?: Frame;
  latestLineProps?: Partial<import("@entities/ui-project").LineProps>;
  members?: GroupMoveMember[];
  latestGroupFrames?: Array<{ id: string; frame: Frame }>;
  hasMoved?: boolean;
}

interface DragPreview {
  nodeId: string;
  rect: Frame;
  lineProps?: Partial<import("@entities/ui-project").LineProps>;
}

interface CanvasWorkspaceProps {
  leftPanelOpen?: boolean;
  rightPanelOpen?: boolean;
  showGrid?: boolean;
  showGridOverlay?: boolean;
  showRulers?: boolean;
  showGuides?: boolean;
  allowCanvasOverflow?: boolean;
  showFullWidgets?: boolean;
  isTemplate?: boolean;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
}

export function CanvasWorkspace({
  leftPanelOpen = true,
  rightPanelOpen = true,
  showGrid = true,
  showGridOverlay = false,
  showRulers = true,
  showGuides = true,
  allowCanvasOverflow = false,
  showFullWidgets = false,
  isTemplate = false,
  onToggleLeftPanel,
  onToggleRightPanel,
}: CanvasWorkspaceProps) {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const activeTool = useEditorStore((s) => s.activeTool);
  const markerStyle = useEditorStore((s) => s.markerStyle);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const toggleNodeSelection = useEditorStore((s) => s.toggleNodeSelection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const addFreehandStroke = useEditorStore((s) => s.addFreehandStroke);
  const absolutizeLayout = useEditorStore((s) => s.absolutizeLayout);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const updateFrames = useEditorStore((s) => s.updateFrames);
  const fitNodeFrameToContent = useEditorStore((s) => s.fitNodeFrameToContent);
  const updateProps = useEditorStore((s) => s.updateProps);
  const draftFrames = useEditorStore((s) => s.draftFrames);
  const setDraftFrame = useEditorStore((s) => s.setDraftFrame);
  const setDraftFrames = useEditorStore((s) => s.setDraftFrames);
  const editingLabelId = useEditorStore((s) => s.editingLabelId);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const commitLabelText = useEditorStore((s) => s.commitLabelText);
  const cancelLabelTextEdit = useEditorStore((s) => s.cancelLabelTextEdit);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const deviceFrameRef = useRef<HTMLDivElement | null>(null);
  const centeredViewKeyRef = useRef<string | null>(null);
  const activeInteractionRef = useRef<ActiveCanvasInteraction | null>(null);
  const pendingDragPreviewRef = useRef<DragPreview | null>(null);
  const dragPreviewRafRef = useRef<number | null>(null);
  const pendingDraftFrameRef = useRef<{ nodeId: string; frame: Frame } | null>(null);
  const pendingDraftFramesRef = useRef<Record<string, Frame> | null>(null);
  const draftFrameRafRef = useRef<number | null>(null);
  const pendingWheelFocusRef = useRef<
    | { type: "frame"; viewportX: number; viewportY: number; localX: number; localY: number }
    | { type: "shell"; viewportX: number; viewportY: number; ratioX: number; ratioY: number }
    | null
  >(null);
  const layoutRef = useRef<LayoutNode | null>(null);
  const startInteractionRef = useRef<(interaction: ActiveCanvasInteraction) => void>(() => {});

  const [zoom, setZoom] = useState(2);
  const [stageViewport, setStageViewport] = useState({ width: 0, height: 0 });
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [markerDraftPoints, setMarkerDraftPoints] = useState<PixelPoint[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<Frame | null>(null);
  const screen = project.screens.find((s) => s.id === activeScreenId);
  const layout = useMemo(() => {
    if (!screen) return null;
    return layoutTree(screen, project.display.width, project.display.height);
  }, [screen, project.display.width, project.display.height]);
  layoutRef.current = layout;
  const stackIndices = useMemo(
    () => (layout ? computeWidgetStackIndices(layout) : new Map<string, number>()),
    [layout],
  );
  const w = project.display.width;
  const h = project.display.height;
  const renderZoom = renderZoomFor(zoom);
  const zoomProgress = zoomToProgress(zoom);
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
    if (!editingLabelId) return;
    if (selectedNodeId === editingLabelId) return;
    cancelLabelTextEdit();
  }, [editingLabelId, selectedNodeId, cancelLabelTextEdit]);

  if (!screen || !layout) {
    return (
      <div className={styles.wrap}>
        <div className={styles.toolbar}>no screen</div>
        <div className={styles.stage} />
      </div>
    );
  }

  const bg = resolveScreenBackground(screen, project.palette);
  const markerDraftColor = resolveColor(markerStyle.color, project.palette, "#FFFFFF");
  const markerDraftWidth = Math.max(1, Math.round(markerStyle.width));
  const scaledW = Math.round(w * renderZoom);
  const scaledH = Math.round(h * renderZoom);
  const showPixelGrid = showGrid && renderZoom >= PIXEL_GRID_VISIBLE_ZOOM;
  const showSelectionOverlay = !!selectedLayoutNode && selectedLayoutNode.node.id !== screen.id;
  const showSelectionGuides = showGuides && showSelectionOverlay;
  const selectedRect = selectedLayoutNode?.rect ?? null;
  const rawDisplayedSelectedRect =
    dragPreview && dragPreview.nodeId === selectedNodeId
      ? dragPreview.rect
      : draftFrameFor(draftFrames, selectedNodeId) ?? selectedRect;
  const displayedSelectedRect = rawDisplayedSelectedRect && selectedNode
    ? selectionRectForNode(selectedNode, rawDisplayedSelectedRect)
    : rawDisplayedSelectedRect;
  const displayedLineEndpoints =
    rawDisplayedSelectedRect && selectedNode?.type === "line"
      ? selectionLineEndpointsForNode(
          dragPreview?.nodeId === selectedNodeId && dragPreview.lineProps
            ? { ...selectedNode, props: { ...(selectedNode.props ?? {}), ...dragPreview.lineProps } }
            : selectedNode,
          rawDisplayedSelectedRect,
        )
      : null;
  const selectedMemberOverlays = selectedNodeIds.flatMap((id) => {
    if (id === screen.id) return [];
    const layoutNode = findLayoutNode(layout, id);
    if (!layoutNode) return [];
    const rawRect =
      dragPreview?.nodeId === id
        ? dragPreview.rect
        : draftFrameFor(draftFrames, id) ?? layoutNode.rect;
    return [{ id, rect: selectionRectForNode(layoutNode.node, rawRect) }];
  });
  const isMultiSelection = selectedMemberOverlays.length > 1;
  const movableIds = pruneMovableSelection(project, selectedNodeIds, screen.id);
  const groupSelectionRect = isMultiSelection
    ? unionRect(selectedMemberOverlays.map((member) => member.rect))
    : null;
  const overlaySelectionRect = groupSelectionRect ?? displayedSelectedRect;
  const selectedParentMode: LayoutMode = selectedParentNode?.layout?.mode ?? "absolute";
  const selectionHasFrame = !!selectedNode?.frame && !!selectedParentLayoutNode;
  const isSelectionLocked = selectedNode?.locked === true;
  const selectionHasTransform =
    !!selectedNode && selectedNode.id !== screen.id && selectionHasFrame;
  const canMoveSelection = selectionHasTransform && !isSelectionLocked;
  const canResizeSelection =
    selectionHasTransform && !isSelectionLocked && selectedNode?.type !== "line";
  const showSelectionTransformChrome =
    selectionHasTransform && selectedNode?.type !== "line";
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
      pendingDraftFramesRef.current = null;
      if (draftFrameRafRef.current !== null) {
        window.cancelAnimationFrame(draftFrameRafRef.current);
        draftFrameRafRef.current = null;
      }
      setDraftFrame(null);
      setDraftFrames(null);
      document.body.style.userSelect = "";
    };
  }, [setDraftFrame, setDraftFrames]);

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

  const scheduleDraftFrames = (frames: Record<string, Frame>) => {
    pendingDraftFramesRef.current = frames;
    if (draftFrameRafRef.current !== null) return;

    draftFrameRafRef.current = window.requestAnimationFrame(() => {
      draftFrameRafRef.current = null;
      const next = pendingDraftFramesRef.current;
      pendingDraftFramesRef.current = null;
      if (next) setDraftFrames(next);
    });
  };

  const startInteraction = (interaction: ActiveCanvasInteraction) => {
    debugLog("canvas", "startInteraction", {
      type: interaction.type,
      nodeId: interaction.nodeId,
      constrainToParent: interaction.constrainToParent,
      allowCanvasOverflow,
      showFullWidgets,
    });
    activeInteractionRef.current = interaction;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handleMouseMove = (event: MouseEvent) => {
      const active = activeInteractionRef.current;
      if (!active) return;

      const deltaX = Math.round((event.clientX - active.startClientX) / renderZoom);
      const deltaY = Math.round((event.clientY - active.startClientY) / renderZoom);

      if (active.type === "move-group") {
        const members = active.members ?? [];
        if (members.length === 0) return;
        const screenDx = event.clientX - active.startClientX;
        const screenDy = event.clientY - active.startClientY;
        if (!active.hasMoved && Math.hypot(screenDx, screenDy) < MARQUEE_THRESHOLD_PX) return;
        active.hasMoved = true;

        let minDx = Number.NEGATIVE_INFINITY;
        let maxDx = Number.POSITIVE_INFINITY;
        let minDy = Number.NEGATIVE_INFINITY;
        let maxDy = Number.POSITIVE_INFINITY;
        for (const member of members) {
          if (!member.constrainToParent) continue;
          const minX = member.parentContentInset;
          const minY = member.parentContentInset;
          const maxX = Math.max(
            minX,
            member.parentRect.width - member.parentContentInset - member.startFrame.width,
          );
          const maxY = Math.max(
            minY,
            member.parentRect.height - member.parentContentInset - member.startFrame.height,
          );
          minDx = Math.max(minDx, minX - member.startFrame.x);
          maxDx = Math.min(maxDx, maxX - member.startFrame.x);
          minDy = Math.max(minDy, minY - member.startFrame.y);
          maxDy = Math.min(maxDy, maxY - member.startFrame.y);
        }
        if (minDx > maxDx) {
          minDx = 0;
          maxDx = 0;
        }
        if (minDy > maxDy) {
          minDy = 0;
          maxDy = 0;
        }
        const nextDx = constrainToRange(deltaX, minDx, maxDx, true);
        const nextDy = constrainToRange(deltaY, minDy, maxDy, true);
        const drafts: Record<string, Frame> = {};
        const latest: Array<{ id: string; frame: Frame }> = [];
        for (const member of members) {
          const nextFrame = {
            ...member.startFrame,
            x: member.startFrame.x + nextDx,
            y: member.startFrame.y + nextDy,
          };
          latest.push({ id: member.nodeId, frame: nextFrame });
          drafts[member.nodeId] = {
            x: member.parentRect.x + nextFrame.x,
            y: member.parentRect.y + nextFrame.y,
            width: nextFrame.width,
            height: nextFrame.height,
          };
        }
        active.latestGroupFrames = latest;
        scheduleDraftFrames(drafts);
        return;
      }

      if (active.type === "move") {
        if (active.parentMode === "absolute") {
          const minX = active.parentContentInset;
          const minY = active.parentContentInset;
          const maxX = Math.max(minX, active.parentRect.width - active.parentContentInset - active.startFrame.width);
          const maxY = Math.max(minY, active.parentRect.height - active.parentContentInset - active.startFrame.height);
          const nextFrame = {
            x: constrainToRange(active.startFrame.x + deltaX, minX, maxX, active.constrainToParent),
            y: constrainToRange(active.startFrame.y + deltaY, minY, maxY, active.constrainToParent),
            width: active.startFrame.width,
            height: active.startFrame.height,
          };
          if (sameFrame(active.latestFrame ?? active.startFrame, nextFrame)) return;
          active.latestFrame = nextFrame;
          const absoluteRect = {
            x: active.parentRect.x + nextFrame.x,
            y: active.parentRect.y + nextFrame.y,
            width: nextFrame.width,
            height: nextFrame.height,
          };
          // draftFrame is absolute canvas space (same as dragPreview / label-edit drafts)
          // so PreviewNode never treats parent-local y as a screen y (upward jump).
          scheduleDraftFrame({ nodeId: active.nodeId, frame: absoluteRect });
          scheduleDragPreview({
            nodeId: active.nodeId,
            rect: absoluteRect,
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
            ? constrainPointToContent(
                movedPoint,
                active.parentRect,
                active.parentContentInset,
                active.constrainToParent,
              )
            : active.startLineStart;
        const nextEnd =
          active.lineHandle === "end"
            ? constrainPointToContent(
                movedPoint,
                active.parentRect,
                active.parentContentInset,
                active.constrainToParent,
              )
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
        const absoluteRect = {
          x: active.parentRect.x + nextFrame.x,
          y: active.parentRect.y + nextFrame.y,
          width: nextFrame.width,
          height: nextFrame.height,
        };
        scheduleDraftFrame({ nodeId: active.nodeId, frame: absoluteRect });
        scheduleDragPreview({
          nodeId: active.nodeId,
          rect: absoluteRect,
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
          nextLeft = Math.min(active.startFrame.x + deltaX, startRight - 1);
          nextLeft = constrainToRange(
            nextLeft,
            active.parentContentInset,
            startRight - 1,
            active.constrainToParent,
          );
        }
        if (active.handle?.includes("e")) {
          nextRight = Math.max(startRight + deltaX, active.startFrame.x + 1);
          nextRight = constrainToRange(
            nextRight,
            active.startFrame.x + 1,
            active.parentRect.width - active.parentContentInset,
            active.constrainToParent,
          );
        }
        if (active.handle?.includes("n")) {
          nextTop = Math.min(active.startFrame.y + deltaY, startBottom - 1);
          nextTop = constrainToRange(
            nextTop,
            active.parentContentInset,
            startBottom - 1,
            active.constrainToParent,
          );
        }
        if (active.handle?.includes("s")) {
          nextBottom = Math.max(startBottom + deltaY, active.startFrame.y + 1);
          nextBottom = constrainToRange(
            nextBottom,
            active.startFrame.y + 1,
            active.parentRect.height - active.parentContentInset,
            active.constrainToParent,
          );
        }
      } else {
        if (active.handle?.includes("w") || active.handle?.includes("e")) {
          const nextWidthDelta = active.handle?.includes("w") ? -deltaX : deltaX;
          nextRight = Math.max(
            active.startFrame.x + active.startFrame.width + nextWidthDelta,
            active.startFrame.x + 1,
          );
          nextRight = constrainToRange(
            nextRight,
            active.startFrame.x + 1,
            active.parentRect.width,
            active.constrainToParent,
          );
        }
        if (active.handle?.includes("n") || active.handle?.includes("s")) {
          const nextHeightDelta = active.handle?.includes("n") ? -deltaY : deltaY;
          nextBottom = Math.max(
            active.startFrame.y + active.startFrame.height + nextHeightDelta,
            active.startFrame.y + 1,
          );
          nextBottom = constrainToRange(
            nextBottom,
            active.startFrame.y + 1,
            active.parentRect.height,
            active.constrainToParent,
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
        const maxWidth = active.constrainToParent
          ? anchorX === "right"
            ? active.startFrame.x + active.startFrame.width
            : active.parentRect.width - active.parentContentInset - active.startFrame.x
          : undefined;
        const maxHeight = active.constrainToParent
          ? anchorY === "bottom"
            ? active.startFrame.y + active.startFrame.height
            : active.parentRect.height - active.parentContentInset - active.startFrame.y
          : undefined;
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
      pendingDraftFramesRef.current = null;
      if (draftFrameRafRef.current !== null) {
        window.cancelAnimationFrame(draftFrameRafRef.current);
        draftFrameRafRef.current = null;
      }
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      // Commit the final frame before clearing the preview so the widget never
      // paints for a frame at the pre-drag layout position (visible upward jump).
      if (active?.type === "move-group") {
        if (!active.hasMoved) {
          selectNode(active.nodeId);
        } else if (active.latestGroupFrames && active.latestGroupFrames.length > 0) {
          updateFrames(active.latestGroupFrames);
        }
        setDraftFrames(null);
        setDragPreview(null);
        return;
      }
      if (active?.latestFrame) {
        updateFrame(active.nodeId, active.latestFrame);
      }
      if (active?.latestLineProps) {
        updateProps(active.nodeId, active.latestLineProps);
      }
      setDragPreview(null);
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

  const handleCanvasSelect = useCallback(
    (id: string, mods?: { toggle?: boolean; range?: boolean }) => {
      if (mods?.range) {
        const flatIds = flattenSelectableIds(project, activeScreenId);
        const anchor = selectedNodeId ?? id;
        const anchorIndex = flatIds.indexOf(anchor);
        const targetIndex = flatIds.indexOf(id);
        if (anchorIndex >= 0 && targetIndex >= 0) {
          const [lo, hi] =
            anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
          setSelection(flatIds.slice(lo, hi + 1), id);
          return;
        }
      }
      if (mods?.toggle) {
        toggleNodeSelection(id);
        return;
      }
      const currentIds = useEditorStore.getState().selectedNodeIds;
      if (currentIds.length > 1 && currentIds.includes(id)) return;
      selectNode(id);
    },
    [activeScreenId, project, selectNode, selectedNodeId, setSelection, toggleNodeSelection],
  );

  const handleNodeMouseDown = useCallback((nodeId: string, event: React.MouseEvent<HTMLDivElement>) => {
    const node = findNode(project, nodeId);
    const parentNode = findParent(project, nodeId);
    const currentLayout = layoutRef.current;
    const nodeLayout = currentLayout ? findLayoutNode(currentLayout, nodeId) : null;
    const parentLayout = currentLayout ? findParentLayoutNode(currentLayout, nodeId) : null;
    if (!currentLayout || !node || !node.frame || !nodeLayout || !parentLayout || node.id === screen.id) return;
    if (event.button !== 0) return;

    const selectedIds = useEditorStore.getState().selectedNodeIds;
    const isGroupMember = selectedIds.length > 1 && selectedIds.includes(nodeId);
    if (isGroupMember && node.locked === true) {
      const startX = event.clientX;
      const startY = event.clientY;
      const handleLockedUp = (upEvent: MouseEvent) => {
        window.removeEventListener("mouseup", handleLockedUp);
        if (Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY) < MARQUEE_THRESHOLD_PX) {
          selectNode(nodeId);
        }
      };
      window.addEventListener("mouseup", handleLockedUp);
      return;
    }
    if (node.locked === true) return;
    event.preventDefault();

    if (isGroupMember) {
      const movableIds = pruneMovableSelection(project, selectedIds, activeScreenId);
      if (movableIds.length > 1) {
        const members: GroupMoveMember[] = [];
        const flexParents = new Map<string, LayoutNode>();
        for (const id of movableIds) {
          const memberNode = findNode(project, id);
          const memberParent = findParent(project, id);
          const memberLayout = findLayoutNode(currentLayout, id);
          const memberParentLayout = findParentLayoutNode(currentLayout, id);
          if (!memberNode || !memberLayout || !memberParentLayout) {
            console.warn("[canvas.moveGroup] parent layout missing", { nodeId: id });
            return;
          }
          const parentMode: LayoutMode = memberParent?.layout?.mode ?? "absolute";
          if (memberParent && parentMode !== "absolute" && !flexParents.has(memberParent.id)) {
            flexParents.set(memberParent.id, memberParentLayout);
          }
          members.push({
            nodeId: id,
            startFrame: {
              x: memberLayout.rect.x - memberParentLayout.rect.x,
              y: memberLayout.rect.y - memberParentLayout.rect.y,
              width: memberLayout.rect.width,
              height: memberLayout.rect.height,
            },
            parentRect: memberParentLayout.rect,
            parentContentInset: borderInsetFor(memberParent),
            constrainToParent: !(allowCanvasOverflow && memberParent?.type === "screen"),
          });
        }
        for (const [parentId, parentLayoutNode] of flexParents) {
          absolutizeLayout(parentId, makeAbsoluteChildFrames(parentLayoutNode));
        }
        const lead = members[0];
        startInteractionRef.current({
          type: "move-group",
          nodeId,
          startClientX: event.clientX,
          startClientY: event.clientY,
          startFrame: lead.startFrame,
          startRect: { ...lead.startFrame },
          parentRect: lead.parentRect,
          parentContentInset: lead.parentContentInset,
          parentMode: "absolute",
          constrainToParent: lead.constrainToParent,
          members,
        });
        return;
      }
      if (movableIds.length === 1 && movableIds[0] !== nodeId) {
        handleNodeMouseDown(movableIds[0], event);
        return;
      }
    }

    const parentMode: LayoutMode = parentNode?.layout?.mode ?? "absolute";
    const constrainToParent = !(allowCanvasOverflow && parentNode?.type === "screen");
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
      constrainToParent,
      siblingCenters,
    });
  }, [allowCanvasOverflow, project, activeScreenId, screen?.id, absolutizeLayout, selectNode]);

  const handleResizeMouseDown =
    (handle: ResizeHandle) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (!canResizeSelection || !selectedNodeId || !selectedNode?.frame || !selectedParentLayoutNode) return;
      if (isSelectionLocked) return;
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
        constrainToParent: !(allowCanvasOverflow && selectedParentNode?.type === "screen"),
        handle,
        isIcon: selectedNode.type === "icon",
        iconId:
          selectedNode.type === "icon"
            ? ((selectedNode.props ?? {}) as Partial<IconProps>).iconId
            : undefined,
      });
    };

  const handleSelectionMoveMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedNodeId) return;
      handleNodeMouseDown(selectedNodeId, event);
    },
    [handleNodeMouseDown, selectedNodeId],
  );

  const handleSelectionFrameDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedNodeId || event.button !== 0) return;
      const node = findNode(project, selectedNodeId);
      if (node?.locked === true) return;
      if (node?.type === "label" || node?.type === "icon") {
        fitNodeFrameToContent(selectedNodeId);
      }
    },
    [fitNodeFrameToContent, project, selectedNodeId],
  );

  const allowSelectionContentInteraction =
    selectedNode?.type === "label" || selectedNode?.type === "button";
  const showSelectionFrameDoubleClick =
    selectedNode?.type === "label" || selectedNode?.type === "icon";

  const showSelectionMoveMask = isMultiSelection
    ? movableIds.length > 0 && editingLabelId !== selectedNodeId
    : selectionHasTransform && editingLabelId !== selectedNodeId;

  const handleLineEndpointMouseDown =
    (lineHandle: LineHandle) => (event: React.MouseEvent<HTMLDivElement>) => {
      if (!selectedNodeId || selectedNode?.type !== "line" || !selectedRect || !selectedParentLayoutNode) return;
      if (isSelectionLocked) return;
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
        constrainToParent: !(allowCanvasOverflow && selectedParentNode?.type === "screen"),
        lineHandle,
        startLineStart: endpoints.start,
        startLineEnd: endpoints.end,
      });
    };

  const pointFromCanvasEvent = useCallback(
    (event: MouseEvent | React.MouseEvent<HTMLDivElement>): PixelPoint | null => {
      const frame = deviceFrameRef.current;
      if (!frame) return null;
      const bounds = frame.getBoundingClientRect();
      const x = Math.floor((event.clientX - bounds.left) / renderZoom);
      const y = Math.floor((event.clientY - bounds.top) / renderZoom);
      if (x < 0 || y < 0 || x >= w || y >= h) return null;
      return { x, y };
    },
    [h, renderZoom, w],
  );

  const startMarkerDrawing = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "marker" || event.button !== 0) return false;
      const startPoint = pointFromCanvasEvent(event);
      if (!startPoint) return false;

      event.preventDefault();
      event.stopPropagation();
      selectNode(null);

      const points: PixelPoint[] = [startPoint];
      const seen = new Set([`${startPoint.x}:${startPoint.y}`]);
      let lastPoint = startPoint;
      setMarkerDraftPoints(points);

      const addPoint = (point: PixelPoint | null) => {
        if (!point) return;
        for (const nextPoint of rasterPixelSegment(lastPoint, point)) {
          const key = `${nextPoint.x}:${nextPoint.y}`;
          if (seen.has(key)) continue;
          seen.add(key);
          points.push(nextPoint);
        }
        lastPoint = point;
        setMarkerDraftPoints([...points]);
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        addPoint(pointFromCanvasEvent(moveEvent));
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        setMarkerDraftPoints([]);
        addFreehandStroke(activeScreenId, points);
        setActiveTool("select");
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return true;
    },
    [activeScreenId, activeTool, addFreehandStroke, pointFromCanvasEvent, selectNode, setActiveTool],
  );

  const canvasPointFromClient = useCallback(
    (event: MouseEvent | React.MouseEvent<HTMLDivElement>): Point | null => {
      const frame = deviceFrameRef.current;
      if (!frame) return null;
      const bounds = frame.getBoundingClientRect();
      return {
        x: Math.floor((event.clientX - bounds.left) / renderZoom),
        y: Math.floor((event.clientY - bounds.top) / renderZoom),
      };
    },
    [renderZoom],
  );

  const startMarquee = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "select" || event.button !== 0) return false;
      const startPoint = canvasPointFromClient(event);
      if (!startPoint) return false;

      event.preventDefault();
      const additive = event.shiftKey || event.metaKey || event.ctrlKey;
      const baseIds = useEditorStore.getState().selectedNodeIds;
      const startClientX = event.clientX;
      const startClientY = event.clientY;
      let exceeded = false;
      let latestRect: Frame | null = null;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;
        if (!exceeded && Math.hypot(dx, dy) < MARQUEE_THRESHOLD_PX) return;
        exceeded = true;
        const endPoint = canvasPointFromClient(moveEvent);
        if (!endPoint) return;
        latestRect = rectFromDragPoints(startPoint, endPoint);
        setMarqueeRect(latestRect);
      };

      const applyHits = (hitIds: string[]) => {
        if (additive) {
          const union: string[] = [];
          const seen = new Set<string>();
          for (const id of [...baseIds, ...hitIds]) {
            if (seen.has(id)) continue;
            seen.add(id);
            union.push(id);
          }
          if (union.length === 0) {
            selectNode(null);
            return;
          }
          setSelection(union, hitIds.at(-1) ?? union.at(-1) ?? null);
          return;
        }
        if (hitIds.length === 0) {
          selectNode(null);
          return;
        }
        if (hitIds.length === 1) {
          selectNode(hitIds[0]);
          return;
        }
        setSelection(hitIds, hitIds.at(-1) ?? null);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        setMarqueeRect(null);
        if (!exceeded) {
          selectNode(null);
          return;
        }
        const endPoint = canvasPointFromClient(upEvent);
        const rect =
          latestRect ?? (endPoint ? rectFromDragPoints(startPoint, endPoint) : null);
        if (!rect) {
          selectNode(null);
          return;
        }
        const currentLayout = layoutRef.current;
        if (!currentLayout) return;
        applyHits(collectNodeIdsInRect(currentLayout, rect, activeScreenId));
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return true;
    },
    [activeScreenId, activeTool, canvasPointFromClient, selectNode, setSelection],
  );

  const renderCtx = useMemo(
    () => ({
      palette: project.palette,
      stackIndices,
      selectedId: selectedNodeId,
      movableIds,
      lockedId: isSelectionLocked ? selectedNodeId : null,
      dragPreview,
      draftFrames,
      onSelect: handleCanvasSelect,
      onNodeMouseDown: activeTool === "marker"
        ? (_nodeId: string, event: React.MouseEvent<HTMLDivElement>) => {
            startMarkerDrawing(event);
          }
        : handleNodeMouseDown,
      onLabelEditStart: beginLabelTextEdit,
      editingLabelId,
      onLabelTextCommit: commitLabelText,
      onLabelDraftFrame: (nodeId: string, frame: Frame) => {
        const currentLayout = layoutRef.current;
        const parentLayout = currentLayout ? findParentLayoutNode(currentLayout, nodeId) : null;
        const absoluteFrame = parentLayout
          ? {
              ...frame,
              x: parentLayout.rect.x + frame.x,
              y: parentLayout.rect.y + frame.y,
            }
          : frame;
        scheduleDraftFrame({ nodeId, frame: absoluteFrame });
      },
    }),
    [
      project.palette,
      stackIndices,
      selectedNodeId,
      movableIds,
      isSelectionLocked,
      dragPreview,
      draftFrames,
      handleCanvasSelect,
      activeTool,
      startMarkerDrawing,
      handleNodeMouseDown,
      beginLabelTextEdit,
      editingLabelId,
      commitLabelText,
    ],
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.workspaceOverlay}>
        <div className={styles.overlayStart}>
          {onToggleLeftPanel ? (
            <IconButton
              className={styles.panelToggle}
              onClick={onToggleLeftPanel}
              aria-label={leftPanelOpen ? "Hide widget tree" : "Show widget tree"}
              title={leftPanelOpen ? "Hide widget tree" : "Show widget tree"}
            >
              <SidebarPanelIcon side="left" />
            </IconButton>
          ) : null}
          <span className={styles.projectMeta} data-testid="canvas-project-meta">
            <strong>{project.name}</strong> · {project.display.width} × {project.display.height}
            {isTemplate ? (
              <>
                {" "}
                ·{" "}
                <span className={styles.templateBadge} aria-label="Template">
                  Template
                </span>
              </>
            ) : null}
          </span>
        </div>
        <div className={styles.overlayEnd}>
          <CanvasZoomToolbar
            zoom={zoom}
            zoomProgress={zoomProgress}
            onZoomChange={(value) => setZoom(normalizeZoom(value))}
          />
          {onToggleRightPanel ? (
            <IconButton
              className={styles.panelToggle}
              onClick={onToggleRightPanel}
              aria-label={rightPanelOpen ? "Hide properties" : "Show properties"}
              title={rightPanelOpen ? "Hide properties" : "Show properties"}
            >
              <SidebarPanelIcon side="right" />
            </IconButton>
          ) : null}
        </div>
      </div>
      <div
        className={styles.stage}
        ref={stageRef}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const target = e.target;
          if (!(target instanceof Node)) return;
          if (deviceFrameRef.current?.contains(target)) return;
          if (target instanceof Element && target.closest('[data-testid="canvas-selection-layer"]')) {
            return;
          }
          selectNode(null);
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
            {showRulers ? (
              <CanvasRulers
                horizontalTicks={horizontalTicks}
                verticalTicks={verticalTicks}
                scaledW={scaledW}
                scaledH={scaledH}
                renderZoom={renderZoom}
                selectionRect={showSelectionGuides ? overlaySelectionRect : null}
                showSelectionLabels={showSelectionGuides}
              />
            ) : null}

            <div
              className={cn(
                styles.deviceFrame,
                allowCanvasOverflow && showFullWidgets && styles.deviceFrameShowFull,
              )}
              data-testid="canvas-device-frame"
              data-allow-overflow={allowCanvasOverflow ? "true" : undefined}
              data-show-full-widgets={allowCanvasOverflow && showFullWidgets ? "true" : undefined}
              ref={deviceFrameRef}
              style={{
                width: scaledW,
                height: scaledH,
                background: bg,
                left: RULER_SIZE,
                top: RULER_SIZE,
                cursor: activeTool === "marker" ? "crosshair" : undefined,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                if (startMarkerDrawing(e)) return;
                if (startMarquee(e)) return;
              }}
            >
              {showPixelGrid ? (
                <div
                  className={cn(styles.pixelGrid, showGridOverlay && styles.pixelGridOverlay)}
                  data-testid="canvas-pixel-grid"
                  data-overlay={showGridOverlay ? "true" : undefined}
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
              <div
                className={cn(
                  styles.widgetClip,
                  allowCanvasOverflow && showFullWidgets && styles.widgetClipShowFull,
                )}
                data-testid="canvas-widget-clip"
              >
                <div
                  className={styles.scaledContent}
                  data-testid="canvas-scaled-content"
                  style={{
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
                  {markerDraftPoints.map((point, index) => (
                    <div
                      key={`${point.x}:${point.y}:${index}`}
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: point.x,
                        top: point.y,
                        width: markerDraftWidth,
                        height: markerDraftWidth,
                        background: markerDraftColor,
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {showSelectionOverlay && displayedSelectedRect && !isMultiSelection ? (
              <div
                className={styles.selectionLayer}
                data-testid="canvas-selection-layer"
                style={{
                  left: RULER_SIZE,
                  top: RULER_SIZE,
                  width: scaledW,
                  height: scaledH,
                }}
              >
                <SelectionOverlay
                  rect={displayedSelectedRect}
                  renderZoom={renderZoom}
                  scaledW={scaledW}
                  scaledH={scaledH}
                  showGuides={showGuides}
                  showMoveMask={showSelectionMoveMask}
                  showResizeHandles={showSelectionTransformChrome}
                  transformsLocked={isSelectionLocked}
                  lineEndpoints={displayedLineEndpoints}
                  onMoveMouseDown={handleSelectionMoveMouseDown}
                  onFrameDoubleClick={
                    showSelectionFrameDoubleClick ? handleSelectionFrameDoubleClick : undefined
                  }
                  allowContentInteraction={allowSelectionContentInteraction}
                  onResizeHandleMouseDown={handleResizeMouseDown}
                  onLineEndpointMouseDown={handleLineEndpointMouseDown}
                />
              </div>
            ) : null}
            {isMultiSelection ? (
              <div
                className={styles.selectionLayer}
                data-testid="canvas-selection-layer"
                style={{
                  left: RULER_SIZE,
                  top: RULER_SIZE,
                  width: scaledW,
                  height: scaledH,
                }}
              >
                {selectedMemberOverlays.map((member) => (
                  <SelectionOverlay
                    key={member.id}
                    rect={member.rect}
                    renderZoom={renderZoom}
                    scaledW={scaledW}
                    scaledH={scaledH}
                    showGuides={false}
                    showMoveMask={false}
                    showResizeHandles={false}
                    lineEndpoints={null}
                    onResizeHandleMouseDown={handleResizeMouseDown}
                    onLineEndpointMouseDown={handleLineEndpointMouseDown}
                  />
                ))}
                {groupSelectionRect ? (
                  <SelectionOverlay
                    rect={groupSelectionRect}
                    renderZoom={renderZoom}
                    scaledW={scaledW}
                    scaledH={scaledH}
                    showGuides={showGuides}
                    showMoveMask={showSelectionMoveMask}
                    showResizeHandles={false}
                    frameTestId="selection-group-frame"
                    lineEndpoints={null}
                    onMoveMouseDown={handleSelectionMoveMouseDown}
                    allowContentInteraction={false}
                    onResizeHandleMouseDown={handleResizeMouseDown}
                    onLineEndpointMouseDown={handleLineEndpointMouseDown}
                  />
                ) : null}
              </div>
            ) : null}
            {marqueeRect ? (
              <div
                className={styles.selectionLayer}
                style={{
                  left: RULER_SIZE,
                  top: RULER_SIZE,
                  width: scaledW,
                  height: scaledH,
                }}
              >
                <MarqueeOverlay rect={marqueeRect} renderZoom={renderZoom} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <CanvasToolbar />
    </div>
  );
}

function rasterPixelSegment(start: PixelPoint, end: PixelPoint): PixelPoint[] {
  const points: PixelPoint[] = [];
  let currentX = start.x;
  let currentY = start.y;
  const dx = Math.abs(end.x - start.x);
  const sx = start.x < end.x ? 1 : -1;
  const dy = -Math.abs(end.y - start.y);
  const sy = start.y < end.y ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ x: currentX, y: currentY });
    if (currentX === end.x && currentY === end.y) break;
    const doubledError = error * 2;
    if (doubledError >= dy) {
      error += dy;
      currentX += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      currentY += sy;
    }
  }

  return points;
}
