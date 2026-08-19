import { create } from "zustand";
import type {
  ButtonProps,
  ColorRef,
  Frame,
  FreehandProps,
  IconProps,
  LabelProps,
  PaletteEntry,
  PixelPoint,
  ScreenNode,
  UiProject,
  WidgetNode,
  WidgetType,
} from "..";
import { defaultLayout } from "../defaults";
import { normalizePalette } from "../lib/palette";
import { isRotatableShapeType } from "../lib/rotation";
import { bakeShapeRotationTo, rotateShapeByQuarterTurns } from "../lib/shapeRotation";
import { makeWidget, nextId, validateProject } from "..";
import { getIconDefinition } from "@entities/icon/iconLibrary";
import { fitIconFrameToContent, normalizeIconNodeFrame } from "@entities/icon/iconSizing";

import { blankProject, helloSample } from "../samples/hello";
import {
  clampIndex,
  cloneProject,
  cloneScreenSubtree,
  cloneWidgetSubtree,
  collectIds,
  deepCloneWidget,
  defaultFrameFor,
  findNode,
  findParent,
  fitTextNodeFrame,
  insertChild,
  insertChildAfter,
  isAncestor,
  normalizeProjectTextFrames,
  normalizeTextNodeFrame,
  offsetWidgetFrame,
  prependChild,
  pruneCopySelection,
  flattenSelectableIds,
  removeNode,
  renameNodeInProject,
  remapColorTokenRefs,
  resolvePasteParentOutsideClipboard,
  lockWidgetSubtree,
} from "./tree-ops";
import { normalizeClass } from "../lib/cssClass";
import {
  MAX_HISTORY,
  recordHistory,
  restoreSelectionSnapshot,
  sameSelectionIds,
  snapshotState,
  type HistorySnapshot,
} from "./history";

export type EditorTool = "select" | "marker";

export interface MarkerStyle {
  color: ColorRef;
  width: number;
}

const DEFAULT_MARKER_STYLE: MarkerStyle = {
  color: { kind: "hex", value: "#FFFFFF" },
  width: 1,
};

const DUPLICATE_FRAME_OFFSET = 8;

/** In-memory widget clipboard; remapped on paste/duplicate. */
let widgetClipboard: WidgetNode[] = [];

interface EditorState {
  project: UiProject;
  activeScreenId: string;
  activeTool: EditorTool;
  markerStyle: MarkerStyle;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  editingLabelId: string | null;
  draftFrames: Record<string, Frame> | null;
  historyBatchBase: HistorySnapshot | null;
  lastError: string | null;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
  hasClipboard: boolean;

  setProject: (project: UiProject) => void;
  setActiveTool: (tool: EditorTool) => void;
  updateMarkerStyle: (patch: Partial<MarkerStyle>) => void;
  setActiveScreen: (screenId: string) => void;
  addScreen: (name?: string) => string | null;
  duplicateScreen: (screenId: string) => string | null;
  removeScreen: (screenId: string) => boolean;
  moveScreen: (screenId: string, toIndex: number) => void;
  selectNode: (id: string | null) => void;
  toggleNodeSelection: (id: string) => void;
  setSelection: (ids: string[], primaryId?: string | null) => void;
  beginLabelTextEdit: (nodeId: string) => void;
  commitLabelText: (nodeId: string, text: string, frame?: Frame) => void;
  cancelLabelTextEdit: () => void;
  setDisplaySize: (width: number, height: number) => void;
  setPalette: (
    palette: PaletteEntry[],
    options?: { remaps?: Array<{ from: string; to: ColorRef }> },
  ) => void;
  loadHelloSample: () => void;
  undo: () => void;
  redo: () => void;

  addWidget: (parentId: string, type: WidgetType) => string | null;
  addFreehandStroke: (parentId: string, points: PixelPoint[]) => string | null;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  copySelectedNodes: () => boolean;
  pasteClipboard: () => string[] | null;
  duplicateSelectedNodes: () => string[] | null;
  clearClipboard: () => void;
  moveNode: (id: string, direction: "up" | "down") => void;
  moveNodes: (ids: string[], direction: "up" | "down") => void;
  moveNodeToIndex: (id: string, index: number) => void;
  moveNodeToParentIndex: (id: string, parentId: string, index: number) => void;
  moveNodesToTarget: (ids: string[], targetId: string, position: "before" | "inside" | "after") => void;
  absolutizeLayout: (parentId: string, childFrames: Array<{ id: string; frame: Frame }>) => void;
  reparentNode: (id: string, newParentId: string) => void;

  /** Rename a widget id with uniqueness/format checks and reference remapping. */
  renameNode: (oldId: string, newId: string) => boolean;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
  /** Rotate selected rotatable shapes by `quarterTurns` × 90° (positive = clockwise). */
  rotateSelectedNodes: (quarterTurns?: number) => boolean;
  updateFrame: (id: string, frame: Partial<NonNullable<WidgetNode["frame"]>>) => void;
  updateFrames: (updates: Array<{ id: string; frame: Partial<NonNullable<WidgetNode["frame"]>> }>) => void;
  fitNodeFrameToContent: (id: string) => void;
  updateProps: (id: string, patch: Record<string, unknown>, options?: { history?: boolean }) => void;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
  setDraftFrames: (draftFrames: Record<string, Frame> | null) => void;
  setDraftFrame: (draftFrame: { nodeId: string; frame: Frame } | null) => void;
  beginHistoryBatch: () => void;
  commitHistoryBatch: () => void;

  importJson: (json: string) => boolean;
  exportJson: () => string;
}

const initialProject = blankProject();

function resolveActiveScreenId(project: UiProject): string {
  return project.screens[0]?.id ?? project.initialScreenId;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  activeScreenId: resolveActiveScreenId(initialProject),
  activeTool: "select",
  markerStyle: DEFAULT_MARKER_STYLE,
  selectedNodeId: null,
  selectedNodeIds: [],
  editingLabelId: null,
  draftFrames: null,
  historyBatchBase: null,
  lastError: null,
  historyPast: [],
  historyFuture: [],
  hasClipboard: false,

  setProject: (project) => {
    normalizeProjectTextFrames(project);
    set((state) => ({
      ...recordHistory(state),
      project,
      activeScreenId: resolveActiveScreenId(project),
      activeTool: "select",
      selectedNodeId: null,
      selectedNodeIds: [],
      editingLabelId: null,
      draftFrames: null,
      historyBatchBase: null,
    }));
  },

  setActiveTool: (activeTool) => set({ activeTool }),

  updateMarkerStyle: (patch) =>
    set((state) => ({
      markerStyle: {
        ...state.markerStyle,
        ...patch,
        width: Math.max(1, Math.round(patch.width ?? state.markerStyle.width)),
      },
    })),

  setActiveScreen: (screenId) =>
    set({
      activeScreenId: screenId,
      activeTool: "select",
      selectedNodeId: null,
      selectedNodeIds: [],
      editingLabelId: null,
      draftFrames: null,
    }),

  addScreen: (name) => {
    let newId: string | null = null;
    set((state) => {
      const next = cloneProject(state.project);
      const usedIds = collectIds(next);
      const id = nextId("screen", usedIds);
      newId = id;
      const { width, height } = next.display;
      const screen: ScreenNode = {
        id,
        type: "screen",
        name: name ?? `Screen ${next.screens.length + 1}`,
        width,
        height,
        visible: true,
        layout: defaultLayout("absolute"),
        style: { background: { kind: "token", token: "bg" } },
        props: { background: { kind: "token", token: "bg" } },
        children: [],
      };
      next.screens.push(screen);
      return {
        ...recordHistory(state),
        project: next,
        activeScreenId: id,
        selectedNodeId: null,
        selectedNodeIds: [],
        editingLabelId: null,
        draftFrames: null,
      };
    });
    return newId;
  },

  duplicateScreen: (screenId) => {
    let newId: string | null = null;
    set((state) => {
      const next = cloneProject(state.project);
      const source = next.screens.find((s) => s.id === screenId);
      if (!source) return state;
      const usedIds = collectIds(next);
      const copy = cloneScreenSubtree(source, usedIds);
      copy.name = source.name ? `${source.name} copy` : `${copy.id} copy`;
      const sourceIndex = next.screens.findIndex((s) => s.id === screenId);
      next.screens.splice(sourceIndex + 1, 0, copy);
      newId = copy.id;
      return {
        ...recordHistory(state),
        project: next,
        activeScreenId: copy.id,
        selectedNodeId: null,
        selectedNodeIds: [],
        editingLabelId: null,
        draftFrames: null,
      };
    });
    return newId;
  },

  removeScreen: (screenId) => {
    let removed = false;
    set((state) => {
      if (state.project.screens.length <= 1) return state;
      const next = cloneProject(state.project);
      const index = next.screens.findIndex((s) => s.id === screenId);
      if (index < 0) return state;
      next.screens.splice(index, 1);
      removed = true;

      let nextActive = state.activeScreenId;
      if (nextActive === screenId) {
        const fallback = next.screens[Math.min(index, next.screens.length - 1)];
        nextActive = fallback.id;
      }

      let nextInitial = next.initialScreenId;
      if (nextInitial === screenId) {
        nextInitial = nextActive;
      }
      next.initialScreenId = nextInitial;

      return {
        ...recordHistory(state),
        project: next,
        activeScreenId: nextActive,
        selectedNodeId: null,
        selectedNodeIds: [],
        editingLabelId: null,
        draftFrames: null,
      };
    });
    return removed;
  },

  moveScreen: (screenId, toIndex) =>
    set((state) => {
      const next = cloneProject(state.project);
      const currentIndex = next.screens.findIndex((s) => s.id === screenId);
      if (currentIndex < 0) return state;
      const clamped = clampIndex(toIndex, next.screens.length - 1);
      if (clamped === currentIndex) return state;
      const [screen] = next.screens.splice(currentIndex, 1);
      next.screens.splice(clamped, 0, screen);
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  selectNode: (id) =>
    set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [], draftFrames: null }),

  toggleNodeSelection: (id) =>
    set((state) => {
      const exists = state.selectedNodeIds.includes(id);
      const nextIds = exists
        ? state.selectedNodeIds.filter((x) => x !== id)
        : [...state.selectedNodeIds, id];
      const nextPrimary = exists ? (nextIds.at(-1) ?? null) : id;
      return { selectedNodeIds: nextIds, selectedNodeId: nextPrimary, draftFrames: null };
    }),

  setSelection: (ids, primaryId) =>
    set({
      selectedNodeIds: ids,
      selectedNodeId: primaryId !== undefined ? primaryId : (ids.at(-1) ?? null),
      draftFrames: null,
    }),

  beginLabelTextEdit: (nodeId) => {
    const node = findNode(get().project, nodeId);
    if (!node || (node.type !== "label" && node.type !== "button")) return;
    if (node.type === "button" && (node.props as ButtonProps | undefined)?.text === undefined) {
      return;
    }
    get().selectNode(nodeId);
    get().beginHistoryBatch();
    set({ editingLabelId: nodeId });
  },

  commitLabelText: (nodeId, text, frame) => {
    const wasEditing = get().editingLabelId === nodeId;
    set((state) => {
      if (state.editingLabelId !== nodeId) return state;

      const next = cloneProject(state.project);
      const node = findNode(next, nodeId);
      if (node?.type !== "label" && node?.type !== "button") {
        return { editingLabelId: null, draftFrames: null };
      }

      if (node.type === "label") {
        node.props = { ...(node.props ?? {}), text } as LabelProps;
        node.frame = normalizeTextNodeFrame(
          node,
          frame ?? node.frame ?? defaultFrameFor("label", "", next),
        );
      } else {
        node.props = { ...(node.props ?? {}), text } as ButtonProps;
      }

      return {
        project: next,
        editingLabelId: null,
        draftFrames: null,
      };
    });
    if (wasEditing) get().commitHistoryBatch();
  },

  cancelLabelTextEdit: () => set({ editingLabelId: null }),

  setDisplaySize: (width, height) =>
    set((state) => {
      if (width <= 0 || height <= 0) return state;
      if (state.project.display.width === width && state.project.display.height === height) return state;
      const next = cloneProject(state.project);
      const prevW = next.display.width;
      const prevH = next.display.height;
      next.display.width = width;
      next.display.height = height;
      for (const screen of next.screens) {
        if (screen.width === prevW && screen.height === prevH) {
          screen.width = width;
          screen.height = height;
          if (screen.frame) {
            screen.frame.width = width;
            screen.frame.height = height;
          }
        }
      }
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  setPalette: (palette, options) =>
    set((state) => {
      const result = normalizePalette(palette);
      if (!result.ok) {
        return { lastError: result.error };
      }
      const remaps = options?.remaps ?? [];
      const current = JSON.stringify(state.project.palette ?? []);
      const nextPalette = JSON.stringify(result.entries);
      const hasRemaps = remaps.length > 0;
      if (current === nextPalette && !hasRemaps) return state;

      const next = cloneProject(state.project);
      next.palette = result.entries;
      for (const remap of remaps) {
        if (!remap.from) continue;
        remapColorTokenRefs(next, remap.from, remap.to);
      }

      let markerStyle = state.markerStyle;
      const markerColor = markerStyle.color;
      if (hasRemaps && markerColor.kind === "token") {
        const hit = remaps.find((remap) => remap.from === markerColor.token);
        if (hit) {
          markerStyle = { ...markerStyle, color: { ...hit.to } };
        }
      }

      return {
        ...recordHistory(state),
        project: next,
        markerStyle,
        lastError: null,
        draftFrames: null,
      };
    }),

  loadHelloSample: () => {
    const p = helloSample();
    normalizeProjectTextFrames(p);
    set((state) => ({
      ...recordHistory(state),
      project: p,
      activeScreenId: resolveActiveScreenId(p),
      selectedNodeId: null,
      selectedNodeIds: [],
      draftFrames: null,
      historyBatchBase: null,
    }));
  },

  undo: () =>
    set((state) => {
      const previous = state.historyPast.at(-1);
      if (!previous) return state;
      const nextPast = state.historyPast.slice(0, -1);
      return {
        project: cloneProject(previous.project),
        activeScreenId: previous.activeScreenId,
        ...restoreSelectionSnapshot(previous),
        draftFrames: null,
        historyBatchBase: null,
        historyPast: nextPast,
        historyFuture: [snapshotState(state), ...state.historyFuture].slice(0, MAX_HISTORY),
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.historyFuture[0];
      if (!next) return state;
      return {
        project: cloneProject(next.project),
        activeScreenId: next.activeScreenId,
        ...restoreSelectionSnapshot(next),
        draftFrames: null,
        historyBatchBase: null,
        historyPast: [...state.historyPast, snapshotState(state)].slice(-MAX_HISTORY),
        historyFuture: state.historyFuture.slice(1),
      };
    }),

  addWidget: (parentId, type) => {
    let newId: string | null = null;
    set((state) => {
      const nextProject = cloneProject(state.project);
      const usedIds = collectIds(nextProject);
      const id = nextId(type.slice(0, 3), usedIds);
      newId = id;
      const node = makeWidgetWithFrame(id, type, parentId, nextProject);
      prependChild(nextProject, parentId, node);
      return {
        ...recordHistory(state),
        project: nextProject,
        activeTool: "select",
        selectedNodeId: id,
        selectedNodeIds: [id],
        draftFrames: null,
      };
    });
    return newId;
  },

  addFreehandStroke: (parentId, points) => {
    let newId: string | null = null;
    const normalizedPoints = normalizeStrokePoints(points);
    if (normalizedPoints.length === 0) return null;
    set((state) => {
      const nextProject = cloneProject(state.project);
      const usedIds = collectIds(nextProject);
      const id = nextId("fre", usedIds);
      const stroke = makeFreehandStroke(id, parentId, normalizedPoints, nextProject, state.markerStyle);
      prependChild(nextProject, parentId, stroke);
      newId = id;
      return {
        ...recordHistory(state),
        project: nextProject,
        activeTool: "select",
        selectedNodeId: id,
        selectedNodeIds: [id],
        draftFrames: null,
      };
    });
    return newId;
  },

  deleteNode: (id) =>
    set((state) => {
      const next = cloneProject(state.project);
      const removed = removeNode(next, id);
      if (!removed) return state;
      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        selectedNodeIds: state.selectedNodeIds.filter((x) => x !== id),
        editingLabelId: state.editingLabelId === id ? null : state.editingLabelId,
        draftFrames: null,
      };
    }),

  deleteNodes: (ids) =>
    set((state) => {
      const removable = ids.filter((id) => id && id !== state.activeScreenId);
      if (removable.length === 0) return state;
      const next = cloneProject(state.project);
      let removedAny = false;
      for (const id of removable) {
        if (removeNode(next, id)) removedAny = true;
      }
      if (!removedAny) return state;
      const removedSet = new Set(removable);
      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId:
          state.selectedNodeId && removedSet.has(state.selectedNodeId) ? null : state.selectedNodeId,
        selectedNodeIds: state.selectedNodeIds.filter((x) => !removedSet.has(x)),
        editingLabelId:
          state.editingLabelId && removedSet.has(state.editingLabelId) ? null : state.editingLabelId,
        draftFrames: null,
      };
    }),

  copySelectedNodes: () => {
    const state = get();
    const roots = pruneCopySelection(state.project, state.selectedNodeIds, state.activeScreenId);
    if (roots.length === 0) return false;

    const snapshots: WidgetNode[] = [];
    for (const id of roots) {
      const node = findNode(state.project, id);
      if (!node || node.type === "screen") continue;
      snapshots.push(deepCloneWidget(node));
    }
    if (snapshots.length === 0) return false;

    widgetClipboard = snapshots;
    set({ hasClipboard: true });
    return true;
  },

  pasteClipboard: () => {
    if (widgetClipboard.length === 0) return null;
    let pastedIds: string[] | null = null;
    set((state) => {
      if (widgetClipboard.length === 0) return state;
      const parentId = resolvePasteParentId(state, widgetClipboard);
      const parent = findNode(state.project, parentId);
      if (!parent || (parent.type !== "screen" && parent.type !== "panel")) return state;

      const next = cloneProject(state.project);
      const usedIds = collectIds(next);
      const created: WidgetNode[] = [];
      for (const snapshot of widgetClipboard) {
        created.push(cloneWidgetSubtree(snapshot, usedIds));
      }
      for (const node of created) {
        insertChild(next, parentId, node);
      }

      pastedIds = created.map((node) => node.id);
      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId: pastedIds.at(-1) ?? null,
        selectedNodeIds: pastedIds,
        editingLabelId: null,
        draftFrames: null,
      };
    });
    return pastedIds;
  },

  duplicateSelectedNodes: () => {
    let duplicatedIds: string[] | null = null;
    set((state) => {
      const roots = pruneCopySelection(state.project, state.selectedNodeIds, state.activeScreenId);
      if (roots.length === 0) return state;

      const next = cloneProject(state.project);
      const usedIds = collectIds(next);
      const createdIds: string[] = [];

      for (const rootId of roots) {
        const source = findNode(next, rootId);
        const parent = findParent(next, rootId);
        if (!source || !parent || source.type === "screen") continue;
        const clone = cloneWidgetSubtree(source, usedIds);
        offsetWidgetFrame(clone, DUPLICATE_FRAME_OFFSET, DUPLICATE_FRAME_OFFSET);
        if (!insertChildAfter(next, rootId, clone)) {
          insertChild(next, parent.id, clone);
        }
        createdIds.push(clone.id);
      }

      if (createdIds.length === 0) return state;
      duplicatedIds = createdIds;
      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId: createdIds.at(-1) ?? null,
        selectedNodeIds: createdIds,
        editingLabelId: null,
        draftFrames: null,
      };
    });
    return duplicatedIds;
  },

  clearClipboard: () => {
    widgetClipboard = [];
    set({ hasClipboard: false });
  },

  moveNode: (id, direction) =>
    set((state) => {
      const next = cloneProject(state.project);
      const parent = findParent(next, id);
      if (!parent?.children) return state;
      const idx = parent.children.findIndex((c) => c.id === id);
      if (idx < 0) return state;
      const j = direction === "up" ? idx - 1 : idx + 1;
      if (j < 0 || j >= parent.children.length) return state;
      [parent.children[idx], parent.children[j]] = [parent.children[j], parent.children[idx]];
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  moveNodes: (ids, direction) =>
    set((state) => {
      const unique = [...new Set(ids.filter((id) => id && id !== state.activeScreenId))];
      if (unique.length === 0) return state;
      const next = cloneProject(state.project);
      const documentOrder = flattenSelectableIds(next, state.activeScreenId).filter((id) =>
        unique.includes(id),
      );
      const sequence = direction === "up" ? documentOrder : [...documentOrder].reverse();
      let changed = false;
      for (const id of sequence) {
        const parent = findParent(next, id);
        if (!parent?.children) continue;
        const idx = parent.children.findIndex((child) => child.id === id);
        if (idx < 0) continue;
        const swapWith = direction === "up" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= parent.children.length) continue;
        [parent.children[idx], parent.children[swapWith]] = [
          parent.children[swapWith],
          parent.children[idx],
        ];
        changed = true;
      }
      if (!changed) return state;
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  moveNodeToIndex: (id, index) =>
    set((state) => {
      const next = cloneProject(state.project);
      const parent = findParent(next, id);
      if (!parent?.children) return state;
      const currentIndex = parent.children.findIndex((c) => c.id === id);
      if (currentIndex < 0) return state;
      const clampedIndex = clampIndex(index, parent.children.length - 1);
      if (clampedIndex === currentIndex) return state;
      const [node] = parent.children.splice(currentIndex, 1);
      parent.children.splice(clampedIndex, 0, node);
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  moveNodeToParentIndex: (id, parentId, index) =>
    set((state) => {
      if (id === parentId) return state;
      const next = cloneProject(state.project);
      const currentParent = findParent(next, id);
      const nextParent = findNode(next, parentId);
      if (!currentParent?.children || !nextParent) return state;
      if (isAncestor(next, id, parentId)) return state;

      const currentIndex = currentParent.children.findIndex((child) => child.id === id);
      if (currentIndex < 0) return state;
      const [node] = currentParent.children.splice(currentIndex, 1);
      if (!nextParent.children) nextParent.children = [];

      const adjustedIndex = currentParent.id === nextParent.id && currentIndex < index ? index - 1 : index;
      const clampedIndex = clampIndex(adjustedIndex, nextParent.children.length);
      nextParent.children.splice(clampedIndex, 0, node);
      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId: id,
        selectedNodeIds: [id],
        draftFrames: null,
      };
    }),

  moveNodesToTarget: (ids, targetId, position) =>
    set((state) => {
      const next = cloneProject(state.project);
      const target = findNode(next, targetId);
      if (!target) return state;

      let destParentId: string;
      let beforeId: string | null;
      if (position === "inside") {
        destParentId = targetId;
        beforeId = null;
      } else {
        const parent = findParent(next, targetId);
        if (!parent?.children) return state;
        destParentId = parent.id;
        const ti = parent.children.findIndex((c) => c.id === targetId);
        if (ti < 0) return state;
        beforeId = position === "before" ? targetId : (parent.children[ti + 1]?.id ?? null);
      }

      const movable = ids.filter((id) => {
        if (id === state.activeScreenId || id === destParentId) return false;
        if (!findParent(next, id)) return false;
        if (isAncestor(next, id, destParentId)) return false;
        return !ids.some((other) => other !== id && isAncestor(next, other, id));
      });
      if (movable.length === 0) return state;

      const order = new Map<string, number>();
      let counter = 0;
      const indexWalk = (node: WidgetNode) => {
        order.set(node.id, counter++);
        (node.children ?? []).forEach(indexWalk);
      };
      next.screens.forEach(indexWalk);
      const ordered = [...movable].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
      const movedSet = new Set(ordered);

      const detached: WidgetNode[] = [];
      for (const id of ordered) {
        const node = removeNode(next, id);
        if (node) detached.push(node);
      }

      const destParent = findNode(next, destParentId);
      if (!destParent) return state;
      if (!destParent.children) destParent.children = [];

      let insertAt = destParent.children.length;
      if (beforeId && !movedSet.has(beforeId)) {
        const bi = destParent.children.findIndex((c) => c.id === beforeId);
        if (bi >= 0) insertAt = bi;
      }
      destParent.children.splice(insertAt, 0, ...detached);

      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId: ordered.at(-1) ?? null,
        selectedNodeIds: ordered,
        draftFrames: null,
      };
    }),

  absolutizeLayout: (parentId, childFrames) =>
    set((state) => {
      const next = cloneProject(state.project);
      const parent = findNode(next, parentId);
      if (!parent) return state;

      parent.layout = { ...(parent.layout ?? {}), mode: "absolute" };

      for (const childPatch of childFrames) {
        const child = findNode(next, childPatch.id);
        if (!child) continue;
        child.frame = { ...childPatch.frame };
      }

      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  reparentNode: (id, newParentId) =>
    set((state) => {
      if (id === newParentId) return state;
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      if (isAncestor(next, id, newParentId)) return state;
      const detached = removeNode(next, id);
      if (!detached) return state;
      const parent = findNode(next, newParentId);
      if (!parent) return state;
      if (!parent.children) parent.children = [];
      parent.children.push(detached);
      return {
        ...recordHistory(state),
        project: next,
        selectedNodeId: id,
        selectedNodeIds: [id],
        draftFrames: null,
      };
    }),

  renameNode: (oldId, newId) => {
    const trimmed = newId.trim();
    if (oldId === trimmed) return true;
    const state = get();
    const next = cloneProject(state.project);
    if (!renameNodeInProject(next, oldId, trimmed)) return false;

    const mapId = (id: string | null) => (id === oldId ? trimmed : id);
    const selectedNodeIds = state.selectedNodeIds.map((id) => (id === oldId ? trimmed : id));
    const draftFrames = remapDraftFrameIds(state.draftFrames, oldId, trimmed);

    set({
      ...recordHistory(state),
      project: next,
      selectedNodeId: mapId(state.selectedNodeId),
      selectedNodeIds,
      activeScreenId: mapId(state.activeScreenId) ?? state.activeScreenId,
      editingLabelId: mapId(state.editingLabelId),
      draftFrames,
    });
    return true;
  },

  updateNode: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      const { rotation: nextRotation, id: _ignoredId, class: nextClass, ...restPatch } = patch;
      Object.assign(node, restPatch);
      if ("class" in patch) {
        const normalized =
          typeof nextClass === "string" ? normalizeClass(nextClass) : nextClass;
        if (normalized) node.class = normalized;
        else delete node.class;
      }
      if (
        nextRotation !== undefined &&
        isRotatableShapeType(node.type) &&
        !node.locked
      ) {
        bakeShapeRotationTo(node, nextRotation);
      } else if (nextRotation !== undefined && !isRotatableShapeType(node.type)) {
        node.rotation = nextRotation;
      }
      if (restPatch.locked === true && node.type === "panel") {
        lockWidgetSubtree(node);
      }
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  rotateSelectedNodes: (quarterTurns = 1) => {
    const state = get();
    const ids = state.selectedNodeIds;
    if (ids.length === 0) return false;

    let changed = false;
    const next = cloneProject(state.project);
    for (const id of ids) {
      const node = findNode(next, id);
      if (!node) continue;
      if (rotateShapeByQuarterTurns(node, quarterTurns)) changed = true;
    }
    if (!changed) return false;
    set({ ...recordHistory(state), project: next, draftFrames: null });
    return true;
  },

  updateFrame: (id, framePatch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      applyFramePatch(node, framePatch);
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  updateFrames: (updates) =>
    set((state) => {
      if (updates.length === 0) return state;
      const next = cloneProject(state.project);
      let changed = false;
      for (const { id, frame } of updates) {
        const node = findNode(next, id);
        if (!node) {
          console.warn("[store.updateFrames] node not found", { id });
          continue;
        }
        if (applyFramePatch(node, frame)) changed = true;
      }
      if (!changed) return state;
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  fitNodeFrameToContent: (id) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node?.frame) return state;

      if (node.type === "label") {
        const props = { ...(node.props ?? {}) } as LabelProps;
        delete props.textAutoSize;
        node.props = props;
        node.frame = fitTextNodeFrame(node, node.frame);
      } else if (node.type === "icon") {
        node.frame = fitIconFrameToContent(
          ((node.props ?? {}) as Partial<IconProps>).iconId,
          node.frame,
        );
      } else {
        return state;
      }

      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  updateProps: (id, patch, options = {}) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      node.props = { ...(node.props ?? {}), ...patch } as WidgetNode["props"];
      if (node.type === "icon") {
        delete (node.props as Partial<IconProps> & { size?: unknown }).size;
      }
      if (node.type === "icon" && typeof patch.iconId === "string") {
        const icon = getIconDefinition(patch.iconId);
        if (icon) {
          node.frame = {
            x: node.frame?.x ?? 0,
            y: node.frame?.y ?? 0,
            width: icon.width,
            height: icon.height,
          };
        }
      }
      if (node.type === "label") {
        node.frame = normalizeTextNodeFrame(node, node.frame ?? defaultFrameFor("label", "", next));
      }
      const history = options.history === false ? {} : recordHistory(state);
      return { ...history, project: next, draftFrames: null };
    }),

  updateLayout: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      node.layout = {
        mode: "absolute",
        padding: 0,
        gap: 0,
        align: "start",
        justify: "start",
        ...(node.layout ?? {}),
        ...patch,
      };
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  updateStyle: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      node.style = { ...(node.style ?? {}), ...patch };
      return { ...recordHistory(state), project: next, draftFrames: null };
    }),

  setDraftFrames: (draftFrames) => set({ draftFrames }),

  setDraftFrame: (draftFrame) =>
    set({
      draftFrames: draftFrame ? { [draftFrame.nodeId]: draftFrame.frame } : null,
    }),

  beginHistoryBatch: () =>
    set((state) => {
      if (state.historyBatchBase) return state;
      return { historyBatchBase: snapshotState(state) };
    }),

  commitHistoryBatch: () =>
    set((state) => {
      if (!state.historyBatchBase) return state;
      if (historySnapshotMatchesState(state.historyBatchBase, state)) {
        return { historyBatchBase: null };
      }
      return {
        historyBatchBase: null,
        historyPast: [...state.historyPast, state.historyBatchBase].slice(-MAX_HISTORY),
        historyFuture: [],
      };
    }),

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      const result = validateProject(parsed);
      if (!result.ok) {
        set({ lastError: result.issues.map((i) => `${i.path}: ${i.message}`).join("\n") });
        return false;
      }
      set((state) => ({
        ...recordHistory(state),
        project: normalizeProjectTextFrames(parsed),
        activeScreenId: resolveActiveScreenId(parsed),
        selectedNodeId: null,
        selectedNodeIds: [],
        draftFrames: null,
        historyBatchBase: null,
        lastError: null,
      }));
      return true;
    } catch (err) {
      set({ lastError: String(err) });
      return false;
    }
  },

  exportJson: () => JSON.stringify(get().project, null, 2),
}));

function makeWidgetWithFrame(id: string, type: WidgetType, parentId: string, p: UiProject): WidgetNode {
  const node = makeWidget(id, type);
  node.frame = defaultFrameFor(type, parentId, p);
  return node;
}

function resolvePasteParentId(state: EditorState, clipboard: readonly WidgetNode[]): string {
  const primaryId = state.selectedNodeId;
  let parentId = state.activeScreenId;
  if (primaryId) {
    const selected = findNode(state.project, primaryId);
    if (selected) {
      if (selected.type === "screen" || selected.type === "panel") {
        parentId = selected.id;
      } else {
        parentId = findParent(state.project, primaryId)?.id ?? state.activeScreenId;
      }
    }
  }
  return resolvePasteParentOutsideClipboard(
    state.project,
    parentId,
    clipboard,
    state.activeScreenId,
  );
}

function makeFreehandStroke(
  id: string,
  parentId: string,
  points: PixelPoint[],
  p: UiProject,
  markerStyle: MarkerStyle,
): WidgetNode {
  const strokeWidth = Math.max(1, Math.round(markerStyle.width));
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const node = makeWidgetWithFrame(id, "freehand", parentId, p);
  node.frame = {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX + strokeWidth),
    height: Math.max(1, maxY - minY + strokeWidth),
  };
  node.style = {
    ...(node.style ?? {}),
    borderColor: markerStyle.color,
    borderWidth: strokeWidth,
  };
  node.props = {
    ...((node.props ?? {}) as FreehandProps),
    points: points.map((point) => ({ x: point.x - minX, y: point.y - minY })),
    strokeWidth,
  } satisfies FreehandProps;
  return node;
}

function normalizeStrokePoints(points: PixelPoint[]): PixelPoint[] {
  const result: PixelPoint[] = [];
  const seen = new Set<string>();
  for (const point of points) {
    const x = Math.round(point.x);
    const y = Math.round(point.y);
    const key = `${x}:${y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ x, y });
  }
  return result;
}

function historySnapshotMatchesState(snapshot: HistorySnapshot, state: EditorState): boolean {
  return (
    snapshot.activeScreenId === state.activeScreenId &&
    snapshot.selectedNodeId === state.selectedNodeId &&
    sameSelectionIds(snapshot.selectedNodeIds, state.selectedNodeIds) &&
    JSON.stringify(snapshot.project) === JSON.stringify(state.project)
  );
}

function applyFramePatch(
  node: WidgetNode,
  framePatch: Partial<NonNullable<WidgetNode["frame"]>>,
): boolean {
  const previous = node.frame;
  const nextFrame = { x: 0, y: 0, width: 0, height: 0, ...(previous ?? {}), ...framePatch };
  node.frame = normalizeIconNodeFrame(node, nextFrame);
  if (
    node.type === "label" &&
    (framePatch.width !== undefined || framePatch.height !== undefined)
  ) {
    node.props = { ...(node.props ?? {}), textAutoSize: false } as LabelProps;
  }
  const applied = node.frame;
  return (
    previous?.x !== applied.x ||
    previous?.y !== applied.y ||
    previous?.width !== applied.width ||
    previous?.height !== applied.height
  );
}

function remapDraftFrameIds(
  draftFrames: Record<string, Frame> | null,
  oldId: string,
  newId: string,
): Record<string, Frame> | null {
  if (!draftFrames || !(oldId in draftFrames)) return draftFrames;
  const next = { ...draftFrames };
  next[newId] = next[oldId];
  delete next[oldId];
  return next;
}
