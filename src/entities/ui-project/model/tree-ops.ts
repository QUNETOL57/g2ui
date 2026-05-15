import type { Frame, ScreenNode, UiProject, WidgetNode, WidgetType } from "..";
import { makeWidget } from "..";
import { findFontFace } from "@entities/font/fontLibrary";
import { DEFAULT_ICON_ID, getResolvedIconDefinition } from "@entities/icon/iconSizing";

export function cloneProject(p: UiProject): UiProject {
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

export function containsId(n: WidgetNode, id: string): boolean {
  if (n.id === id) return true;
  return (n.children ?? []).some((c) => containsId(c, id));
}

export function insertChild(p: UiProject, parentId: string, child: WidgetNode): void {
  const parent = findNode(p, parentId);
  if (!parent) return;
  if (!parent.children) parent.children = [];
  parent.children.push(child);
}

export function removeNode(p: UiProject, id: string): WidgetNode | null {
  const parent = findParent(p, id);
  if (!parent || !parent.children) return null;
  const idx = parent.children.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  const [detached] = parent.children.splice(idx, 1);
  return detached;
}

export function isAncestor(p: UiProject, ancestorId: string, nodeId: string): boolean {
  const ancestor = findNode(p, ancestorId);
  if (!ancestor) return false;
  return containsId(ancestor, nodeId);
}

export function clampIndex(value: number, max: number): number {
  return Math.min(Math.max(0, value), max);
}

export function defaultFrameFor(type: WidgetType, parentId: string, p: UiProject): Frame {
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

export function normalizeTextNodeFrame(node: WidgetNode, frame: Frame): Frame {
  if (node.type !== "label") return frame;
  const face = findFontFace((node.props ?? {}) as Parameters<typeof findFontFace>[0]);
  return { ...frame, height: face.lineHeight };
}

export function normalizeProjectTextFrames(project: UiProject): UiProject {
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
