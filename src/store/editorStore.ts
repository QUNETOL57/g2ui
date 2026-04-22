import { create } from "zustand";
import type { UiProject, WidgetNode, WidgetType, ScreenNode } from "@guimintlab/ui-ir";
import { makeWidget, nextId, validateProject } from "@guimintlab/ui-ir";

import { blankProject, helloSample } from "../samples/hello";

interface EditorState {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
  lastError: string | null;

  setProject: (project: UiProject) => void;
  setActiveScreen: (screenId: string) => void;
  selectNode: (id: string | null) => void;
  setDisplaySize: (width: number, height: number) => void;
  loadHelloSample: () => void;

  addWidget: (parentId: string, type: WidgetType) => string | null;
  deleteNode: (id: string) => void;
  moveNode: (id: string, direction: "up" | "down") => void;
  reparentNode: (id: string, newParentId: string) => void;

  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
  updateFrame: (id: string, frame: Partial<NonNullable<WidgetNode["frame"]>>) => void;
  updateProps: (id: string, patch: Record<string, unknown>) => void;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;

  importJson: (json: string) => boolean;
  exportJson: () => string;
}

const initialProject = blankProject();

export const useEditorStore = create<EditorState>((set, get) => ({
  project: initialProject,
  activeScreenId: initialProject.initialScreenId,
  selectedNodeId: null,
  lastError: null,

  setProject: (project) =>
    set({ project, activeScreenId: project.initialScreenId, selectedNodeId: null }),

  setActiveScreen: (screenId) => set({ activeScreenId: screenId, selectedNodeId: null }),

  selectNode: (id) => set({ selectedNodeId: id }),

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
    set({ project: p, activeScreenId: p.initialScreenId, selectedNodeId: null });
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
      node.frame = { x: 0, y: 0, width: 0, height: 0, ...(node.frame ?? {}), ...framePatch };
      return { project: next };
    }),

  updateProps: (id, patch) =>
    set((state) => {
      const next = cloneProject(state.project);
      const node = findNode(next, id);
      if (!node) return state;
      node.props = { ...(node.props ?? {}), ...patch } as WidgetNode["props"];
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

  importJson: (json) => {
    try {
      const parsed = JSON.parse(json);
      const result = validateProject(parsed);
      if (!result.ok) {
        set({ lastError: result.issues.map((i) => `${i.path}: ${i.message}`).join("\n") });
        return false;
      }
      set({
        project: parsed,
        activeScreenId: parsed.initialScreenId,
        selectedNodeId: null,
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

function defaultFrameFor(type: WidgetType, parentId: string, p: UiProject) {
  const parent = findNode(p, parentId);
  const parentW = (parent?.frame?.width ?? p.display.width) || 240;
  const parentH = (parent?.frame?.height ?? p.display.height) || 240;
  switch (type) {
    case "label":
      return { x: 8, y: 8, width: Math.min(120, parentW - 16), height: 16 };
    case "button":
      return { x: 8, y: 8, width: 80, height: 24 };
    case "icon":
      return { x: 8, y: 8, width: 16, height: 16 };
    case "panel":
      return { x: 0, y: 0, width: parentW, height: Math.min(60, parentH) };
    case "line":
      return { x: 0, y: 0, width: 60, height: 1 };
    case "rect":
      return { x: 8, y: 8, width: 40, height: 24 };
    case "image":
      return { x: 8, y: 8, width: 32, height: 32 };
    default:
      return { x: 0, y: 0, width: 40, height: 20 };
  }
}
