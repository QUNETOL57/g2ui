import { create } from "zustand";
import type { Frame, IconProps, UiProject, WidgetNode, WidgetType, ScreenNode } from "../ui-ir";
import { makeWidget, nextId, validateProject } from "../ui-ir";
import { findFontFace } from "../features/fonts/fontLibrary";
import { getIconDefinition } from "../features/icons/iconLibrary";
import { DEFAULT_ICON_ID, getResolvedIconDefinition, normalizeIconNodeFrame } from "../features/icons/iconSizing";

import { blankProject, helloSample } from "../samples/hello";

interface EditorState {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
  draftFrame: { nodeId: string; frame: Frame } | null;
  lastError: string | null;

  setProject: (project: UiProject) => void;
  setActiveScreen: (screenId: string) => void;
  selectNode: (id: string | null) => void;
  setDisplaySize: (width: number, height: number) => void;
  loadHelloSample: () => void;

  addWidget: (parentId: string, type: WidgetType) => string | null;
  deleteNode: (id: string) => void;
  moveNode: (id: string, direction: "up" | "down") => void;
  moveNodeToIndex: (id: string, index: number) => void;
  absolutizeLayout: (parentId: string, childFrames: Array<{ id: string; frame: Frame }>) => void;
  reparentNode: (id: string, newParentId: string) => void;

  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
  updateFrame: (id: string, frame: Partial<NonNullable<WidgetNode["frame"]>>) => void;
  updateProps: (id: string, patch: Record<string, unknown>) => void;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
  setDraftFrame: (draftFrame: { nodeId: string; frame: Frame } | null) => void;

  importJson: (json: string) => boolean;
  exportJson: () => string;
}

const initialProject = blankProject();

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  activeScreenId: initialProject.initialScreenId,
  selectedNodeId: null,
  draftFrame: null,
  lastError: null,

  setProject: (project) => {
    normalizeProjectTextFrames(project);
    set({ project, activeScreenId: project.initialScreenId, selectedNodeId: null, draftFrame: null });
  },

  setActiveScreen: (screenId) => set({ activeScreenId: screenId, selectedNodeId: null, draftFrame: null }),

  selectNode: (id) => set({ selectedNodeId: id, draftFrame: null }),

  setDisplaySize: (width, height) =>
    set((state) => {
      if (width <= 0 || height <= 0) return state;
      const next = cloneProject(state.project);
      const prevW = next.display.width;
      const prevH = next.display.height;
      next.display.width = width;
      next.display.height = height;
      // Resize screens that currently span the full old display so new
      // projects and fresh samples stay in sync with the picked resolution.
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
      return { project: next };
    }),

  loadHelloSample: () => {
    const p = helloSample();
    normalizeProjectTextFrames(p);
    set({ project: p, activeScreenId: p.initialScreenId, selectedNodeId: null, draftFrame: null });
  },

  addWidget: (parentId, type) => {
    let newId: string | null = null;
    set((state) => {
      const nextProject = cloneProject(state.project);
      const usedIds = collectIds(nextProject);
      const id = nextId(type.slice(0, 3), usedIds);
      newId = id;
      const node = makeWidget(id, type);
      node.frame = defaultFrameFor(type, parentId, nextProject);
      insertChild(nextProject, parentId, node);
      return { project: nextProject, selectedNodeId: id };
    });
    return newId;
  },

  deleteNode: (id) =>
    set((state) => {
      const next = cloneProject(state.project);
      removeNode(next, id);
      return {
        project: next,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
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
      return { project: next };
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
      return { project: next };
    }),

  absolutizeLayout: (parentId, childFrames) =>
    set((state) => {
      const next = cloneProject(state.project);
      const parent = findNode(next, parentId);
      if (!parent) return state;

      parent.layout = {
        ...(parent.layout ?? {}),
        mode: "absolute",
      };

      for (const childPatch of childFrames) {
        const child = findNode(next, childPatch.id);
        if (!child) continue;
        child.frame = { ...childPatch.frame };
      }

      return { project: next };
    }),

  reparentNode: (id, newParentId) =>
    set((state) => {
      if (id === newParentId) return state;
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      if (isAncestor(next, id, newParentId)) return state; // prevent cycles
      const detached = removeNode(next, id);
      if (!detached) return state;
      const parent = findNode(next, newParentId);
      if (!parent) return state;
      if (!parent.children) parent.children = [];
      parent.children.push(detached);
      return { project: next };
    }),

  updateNode: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      Object.assign(node, patch);
      return { project: next };
    }),

  updateFrame: (id, framePatch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      const nextFrame = { x: 0, y: 0, width: 0, height: 0, ...(node.frame ?? {}), ...framePatch };
      node.frame = normalizeIconNodeFrame(node, nextFrame);
      return { project: next };
    }),

  updateProps: (id, patch) =>
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
      return { project: next };
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
      return { project: next };
    }),

  updateStyle: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      node.style = { ...(node.style ?? {}), ...patch };
      return { project: next };
    }),

  setDraftFrame: (draftFrame) => set({ draftFrame }),

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      const result = validateProject(parsed);
      if (!result.ok) {
        set({ lastError: result.issues.map((i) => `${i.path}: ${i.message}`).join("\n") });
        return false;
      }
      set({
        project: normalizeProjectTextFrames(parsed),
        activeScreenId: parsed.initialScreenId,
        selectedNodeId: null,
        draftFrame: null,
        lastError: null,
      });
      return true;
    } catch (err) {
      set({ lastError: String(err) });
      return false;
    }
  },

  exportJson: () => JSON.stringify(get().project, null, 2),
}));

/* -------------------- helpers -------------------- */

function cloneProject(p: UiProject): UiProject {
  return JSON.parse(JSON.stringify(p)) as UiProject;
}

export function collectIds(p: UiProject): Set<string> {
  const ids = new Set<string>();
  const walk = (n: WidgetNode) => {
    ids.add(n.id);
    (n.children ?? []).forEach(walk);
  };
  p.screens.forEach(walk);
  return ids;
}

export function findNode(p: UiProject, id: string): WidgetNode | null {
  const walk = (n: WidgetNode): WidgetNode | null => {
    if (n.id === id) return n;
    for (const c of n.children ?? []) {
      const hit = walk(c);
      if (hit) return hit;
    }
    return null;
  };
  for (const s of p.screens) {
    const hit = walk(s);
    if (hit) return hit;
  }
  return null;
}

export function findParent(p: UiProject, id: string): WidgetNode | null {
  const walk = (n: WidgetNode): WidgetNode | null => {
    for (const c of n.children ?? []) {
      if (c.id === id) return n;
      const hit = walk(c);
      if (hit) return hit;
    }
    return null;
  };
  for (const s of p.screens) {
    const hit = walk(s);
    if (hit) return hit;
  }
  return null;
}

export function findScreenOf(p: UiProject, id: string): ScreenNode | null {
  for (const s of p.screens) {
    if (containsId(s, id)) return s;
  }
  return null;
}

function containsId(n: WidgetNode, id: string): boolean {
  if (n.id === id) return true;
  return (n.children ?? []).some((c) => containsId(c, id));
}

function insertChild(p: UiProject, parentId: string, child: WidgetNode): void {
  const parent = findNode(p, parentId);
  if (!parent) return;
  if (!parent.children) parent.children = [];
  parent.children.push(child);
}

function removeNode(p: UiProject, id: string): WidgetNode | null {
  const parent = findParent(p, id);
  if (!parent || !parent.children) return null;
  const idx = parent.children.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const [detached] = parent.children.splice(idx, 1);
  return detached;
}

function isAncestor(p: UiProject, ancestorId: string, nodeId: string): boolean {
  const ancestor = findNode(p, ancestorId);
  if (!ancestor) return false;
  return containsId(ancestor, nodeId);
}

function clampIndex(value: number, max: number): number {
  return Math.min(Math.max(0, value), max);
}

function defaultFrameFor(type: WidgetType, parentId: string, p: UiProject) {
  const parent = findNode(p, parentId);
  const parentW = (parent?.frame?.width ?? p.display.width) || 240;
  const parentH = (parent?.frame?.height ?? p.display.height) || 240;
  switch (type) {
    case "label":
      return normalizeTextNodeFrame(makeWidget("label_measure", "label"), {
        x: 8,
        y: 8,
        width: Math.min(120, parentW - 16),
        height: findFontFace({ fontFamily: "BDF", fontSize: 7 }).lineHeight,
      });
    case "button":
      return { x: 8, y: 8, width: 80, height: 24 };
    case "icon": {
      const icon = getResolvedIconDefinition(DEFAULT_ICON_ID);
      return { x: 8, y: 8, width: icon.width, height: icon.height };
    }
    case "panel":
      return { x: 0, y: 0, width: parentW, height: Math.min(60, parentH) };
    case "line":
      return { x: 8, y: 8, width: 60, height: 1 };
    case "rect":
      return { x: 8, y: 8, width: 40, height: 24 };
    case "image":
      return { x: 8, y: 8, width: 32, height: 32 };
    default:
      return { x: 0, y: 0, width: 40, height: 20 };
  }
}

function normalizeTextNodeFrame(node: WidgetNode, frame: Frame): Frame {
  if (node.type !== "label") {
    return frame;
  }
  const face = findFontFace((node.props ?? {}) as Parameters<typeof findFontFace>[0]);
  return {
    ...frame,
    height: face.lineHeight,
  };
}

function normalizeProjectTextFrames(project: UiProject): UiProject {
  const walk = (node: WidgetNode) => {
    if (node.frame) {
      node.frame = normalizeTextNodeFrame(node, node.frame);
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  };
  for (const screen of project.screens) {
    walk(screen);
  }
  return project;
}
