import { create } from "zustand";
import type {
  ButtonProps,
  Frame,
  IconProps,
  LabelProps,
  UiProject,
  WidgetNode,
  WidgetType,
} from "..";
import { makeWidget, nextId, validateProject } from "..";
import { getIconDefinition } from "@entities/icon/iconLibrary";
import { normalizeIconNodeFrame } from "@entities/icon/iconSizing";

import { blankProject, helloSample } from "../samples/hello";
import {
  clampIndex,
  cloneProject,
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
  editingLabelId: string | null;
  draftFrame: { nodeId: string; frame: Frame } | null;
  historyBatchBase: HistorySnapshot | null;
  lastError: string | null;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];

  setProject: (project: UiProject) => void;
  setActiveScreen: (screenId: string) => void;
  selectNode: (id: string | null) => void;
  beginLabelTextEdit: (nodeId: string) => void;
  commitLabelText: (nodeId: string, text: string, frame?: Frame) => void;
  cancelLabelTextEdit: () => void;
  setDisplaySize: (width: number, height: number) => void;
  loadHelloSample: () => void;
  undo: () => void;
  redo: () => void;

  addWidget: (parentId: string, type: WidgetType) => string | null;
  deleteNode: (id: string) => void;
  moveNode: (id: string, direction: "up" | "down") => void;
  moveNodeToIndex: (id: string, index: number) => void;
  moveNodeToParentIndex: (id: string, parentId: string, index: number) => void;
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

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  activeScreenId: initialProject.initialScreenId,
  selectedNodeId: null,
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
      activeScreenId: project.initialScreenId,
      selectedNodeId: null,
      editingLabelId: null,
      draftFrame: null,
      historyBatchBase: null,
    }));
  },

  setActiveScreen: (screenId) =>
    set({ activeScreenId: screenId, selectedNodeId: null, editingLabelId: null, draftFrame: null }),

  selectNode: (id) => set({ selectedNodeId: id, draftFrame: null }),

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

  loadHelloSample: () => {
    const p = helloSample();
    normalizeProjectTextFrames(p);
    set((state) => ({
      ...recordHistory(state),
      project: p,
      activeScreenId: p.initialScreenId,
      selectedNodeId: null,
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
      return { ...recordHistory(state), project: nextProject, selectedNodeId: id, draftFrame: null };
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
        editingLabelId: state.editingLabelId === id ? null : state.editingLabelId,
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
      return { ...recordHistory(state), project: next, selectedNodeId: id, draftFrame: null };
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
      return { ...recordHistory(state), project: next, selectedNodeId: id, draftFrame: null };
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
        activeScreenId: parsed.initialScreenId,
        selectedNodeId: null,
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
