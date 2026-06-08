import { create } from "zustand";
import type {
  ButtonProps,
  Frame,
  IconProps,
  LabelProps,
  PaletteEntry,
  ScreenNode,
  UiProject,
  WidgetNode,
  WidgetType,
} from "..";
import { defaultLayout } from "../defaults";
import { normalizePalette } from "../lib/palette";
import { makeWidget, nextId, validateProject } from "..";
import { getIconDefinition } from "@entities/icon/iconLibrary";
import { normalizeIconNodeFrame } from "@entities/icon/iconSizing";

import { blankProject, helloSample } from "../samples/hello";
import {
  clampIndex,
  cloneProject,
  cloneScreenSubtree,
  collectIds,
  defaultFrameFor,
  findNode,
  findParent,
  insertChild,
  isAncestor,
  normalizeProjectTextFrames,
  normalizeTextNodeFrame,
  removeNode,
} from "./tree-ops";
import {
  MAX_HISTORY,
  recordHistory,
  snapshotState,
  type HistorySnapshot,
} from "./history";

interface EditorState {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  editingLabelId: string | null;
  draftFrame: { nodeId: string; frame: Frame } | null;
  historyBatchBase: HistorySnapshot | null;
  lastError: string | null;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];

  setProject: (project: UiProject) => void;
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
  setPalette: (palette: PaletteEntry[]) => void;
  loadHelloSample: () => void;
  undo: () => void;
  redo: () => void;

  addWidget: (parentId: string, type: WidgetType) => string | null;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  moveNode: (id: string, direction: "up" | "down") => void;
  moveNodeToIndex: (id: string, index: number) => void;
  moveNodeToParentIndex: (id: string, parentId: string, index: number) => void;
  moveNodesToTarget: (ids: string[], targetId: string, position: "before" | "inside" | "after") => void;
  absolutizeLayout: (parentId: string, childFrames: Array<{ id: string; frame: Frame }>) => void;
  reparentNode: (id: string, newParentId: string) => void;

  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
  updateFrame: (id: string, frame: Partial<NonNullable<WidgetNode["frame"]>>) => void;
  updateProps: (id: string, patch: Record<string, unknown>, options?: { history?: boolean }) => void;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
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
  selectedNodeId: null,
  selectedNodeIds: [],
  editingLabelId: null,
  draftFrame: null,
  historyBatchBase: null,
  lastError: null,
  historyPast: [],
  historyFuture: [],

  setProject: (project) => {
    normalizeProjectTextFrames(project);
    set((state) => ({
      ...recordHistory(state),
      project,
      activeScreenId: resolveActiveScreenId(project),
      selectedNodeId: null,
      selectedNodeIds: [],
      editingLabelId: null,
      draftFrame: null,
      historyBatchBase: null,
    }));
  },

  setActiveScreen: (screenId) =>
    set({
      activeScreenId: screenId,
      selectedNodeId: null,
      selectedNodeIds: [],
      editingLabelId: null,
      draftFrame: null,
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
        draftFrame: null,
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
        draftFrame: null,
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
        draftFrame: null,
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
      return { ...recordHistory(state), project: next, draftFrame: null };
    }),

  selectNode: (id) =>
    set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [], draftFrame: null }),

  toggleNodeSelection: (id) =>
    set((state) => {
      const exists = state.selectedNodeIds.includes(id);
      const nextIds = exists
        ? state.selectedNodeIds.filter((x) => x !== id)
        : [...state.selectedNodeIds, id];
      const nextPrimary = exists ? (nextIds.at(-1) ?? null) : id;
      return { selectedNodeIds: nextIds, selectedNodeId: nextPrimary, draftFrame: null };
    }),

  setSelection: (ids, primaryId) =>
    set({
      selectedNodeIds: ids,
      selectedNodeId: primaryId !== undefined ? primaryId : (ids.at(-1) ?? null),
      draftFrame: null,
    }),

  beginLabelTextEdit: (nodeId) => {
    const node = findNode(get().project, nodeId);
    if (!node || (node.type !== "label" && node.type !== "button")) return;
    get().selectNode(nodeId);
    get().beginHistoryBatch();
    set({ editingLabelId: nodeId });
  },

  commitLabelText: (nodeId, text, frame) => {
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, nodeId);
      if (node?.type !== "label" && node?.type !== "button") {
        return { editingLabelId: null, draftFrame: null };
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
        draftFrame: null,
      };
    });
    get().commitHistoryBatch();
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
      return { ...recordHistory(state), project: next, draftFrame: null };
    }),

  setPalette: (palette) =>
    set((state) => {
      const result = normalizePalette(palette);
      if (!result.ok) {
        return { lastError: result.error };
      }
      const current = JSON.stringify(state.project.palette ?? []);
      const nextPalette = JSON.stringify(result.entries);
      if (current === nextPalette) return state;
      const next = cloneProject(state.project);
      next.palette = result.entries;
      return { ...recordHistory(state), project: next, lastError: null, draftFrame: null };
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
      draftFrame: null,
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
        selectedNodeId: previous.selectedNodeId,
        selectedNodeIds: previous.selectedNodeId ? [previous.selectedNodeId] : [],
        draftFrame: null,
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
        selectedNodeId: next.selectedNodeId,
        selectedNodeIds: next.selectedNodeId ? [next.selectedNodeId] : [],
        draftFrame: null,
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
      insertChild(nextProject, parentId, node);
      return {
        ...recordHistory(state),
        project: nextProject,
        selectedNodeId: id,
        selectedNodeIds: [id],
        draftFrame: null,
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
        draftFrame: null,
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
        draftFrame: null,
      };
    }),

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
      return { ...recordHistory(state), project: next, draftFrame: null };
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
      return { ...recordHistory(state), project: next, draftFrame: null };
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
        draftFrame: null,
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
        draftFrame: null,
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

      return { ...recordHistory(state), project: next, draftFrame: null };
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
        draftFrame: null,
      };
    }),

  updateNode: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      Object.assign(node, patch);
      return { ...recordHistory(state), project: next, draftFrame: null };
    }),

  updateFrame: (id, framePatch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      const nextFrame = { x: 0, y: 0, width: 0, height: 0, ...(node.frame ?? {}), ...framePatch };
      node.frame = normalizeIconNodeFrame(node, nextFrame);
      if (
        node.type === "label" &&
        (framePatch.width !== undefined || framePatch.height !== undefined)
      ) {
        node.props = { ...(node.props ?? {}), textAutoSize: false } as LabelProps;
      }
      return { ...recordHistory(state), project: next, draftFrame: null };
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
      return { ...history, project: next, draftFrame: null };
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
      return { ...recordHistory(state), project: next, draftFrame: null };
    }),

  updateStyle: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      node.style = { ...(node.style ?? {}), ...patch };
      return { ...recordHistory(state), project: next, draftFrame: null };
    }),

  setDraftFrame: (draftFrame) => set({ draftFrame }),

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
        draftFrame: null,
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

function historySnapshotMatchesState(snapshot: HistorySnapshot, state: EditorState): boolean {
  return (
    snapshot.activeScreenId === state.activeScreenId &&
    snapshot.selectedNodeId === state.selectedNodeId &&
    JSON.stringify(snapshot.project) === JSON.stringify(state.project)
  );
}
