import type { Frame, LabelProps, ScreenNode, UiProject, WidgetNode, WidgetType } from "..";
import { makeWidget, nextId } from "..";
import { isValidId } from "../ids";
import { defaultProps } from "../defaults";
import { findFontFace, measureTextWidth } from "@entities/font/fontLibrary";
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

export function prependChild(p: UiProject, parentId: string, child: WidgetNode): void {
  const parent = findNode(p, parentId);
  if (!parent) return;
  if (!parent.children) parent.children = [];
  parent.children.unshift(child);
}

export function insertChildAfter(p: UiProject, siblingId: string, child: WidgetNode): boolean {
  const parent = findParent(p, siblingId);
  if (!parent?.children) return false;
  const index = parent.children.findIndex((entry) => entry.id === siblingId);
  if (index < 0) return false;
  parent.children.splice(index + 1, 0, child);
  return true;
}

export function deepCloneWidget(node: WidgetNode): WidgetNode {
  return JSON.parse(JSON.stringify(node)) as WidgetNode;
}

/** Deep-clone a non-screen widget and remap every id against `usedIds`. */
export function cloneWidgetSubtree(node: WidgetNode, usedIds: Set<string>): WidgetNode {
  if (node.type === "screen") {
    throw new Error("cannot clone a screen as a widget subtree");
  }
  const cloned = deepCloneWidget(node);
  const remap = (current: WidgetNode) => {
    const newId = nextId(current.type.slice(0, 3), usedIds);
    usedIds.add(newId);
    current.id = newId;
    (current.children ?? []).forEach(remap);
  };
  remap(cloned);
  return cloned;
}

/**
 * Selection roots suitable for copy/duplicate: skip the active screen,
 * skip screen-typed nodes, and drop descendants when an ancestor is also selected.
 * Result is sorted in document (DFS) order.
 */
export function pruneCopySelection(
  project: UiProject,
  ids: readonly string[],
  activeScreenId: string,
): string[] {
  const candidates = ids.filter((id) => {
    if (!id || id === activeScreenId) return false;
    const node = findNode(project, id);
    return !!node && node.type !== "screen";
  });
  const roots = candidates.filter(
    (id) => !candidates.some((other) => other !== id && isAncestor(project, other, id)),
  );

  const order = new Map<string, number>();
  let counter = 0;
  const indexWalk = (node: WidgetNode) => {
    order.set(node.id, counter++);
    (node.children ?? []).forEach(indexWalk);
  };
  project.screens.forEach(indexWalk);

  return [...roots].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

export function offsetWidgetFrame(node: WidgetNode, dx: number, dy: number): void {
  if (!node.frame) return;
  node.frame = {
    ...node.frame,
    x: node.frame.x + dx,
    y: node.frame.y + dy,
  };
}

/** Set `locked: true` on `node` and every descendant. */
export function lockWidgetSubtree(node: WidgetNode): void {
  node.locked = true;
  for (const child of node.children ?? []) {
    lockWidgetSubtree(child);
  }
}

/**
 * If the paste target would be a panel that is itself in the clipboard
 * (or a descendant of such a panel), lift the target to that panel's parent
 * so the pasted copy is created outside the source panel.
 */
export function resolvePasteParentOutsideClipboard(
  project: UiProject,
  candidateParentId: string,
  clipboard: readonly WidgetNode[],
  activeScreenId: string,
): string {
  for (const snapshot of clipboard) {
    if (snapshot.type !== "panel") continue;
    if (candidateParentId === snapshot.id || isAncestor(project, snapshot.id, candidateParentId)) {
      const panelParent = findParent(project, snapshot.id);
      return panelParent?.id ?? activeScreenId;
    }
  }
  return candidateParentId;
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

/** Rewrite project-level and widget-level references from `oldId` to `newId`. */
export function remapNodeIdRefs(p: UiProject, oldId: string, newId: string): void {
  if (p.initialScreenId === oldId) p.initialScreenId = newId;

  const walk = (n: WidgetNode) => {
    if (n.onPress?.target === oldId) n.onPress.target = newId;
    (n.children ?? []).forEach(walk);
  };
  p.screens.forEach(walk);
}

/**
 * Rename a widget id in-place. Returns false if the node is missing, the new id
 * is invalid, or the new id is already used by another node.
 */
export function renameNodeInProject(p: UiProject, oldId: string, newId: string): boolean {
  if (oldId === newId) return true;
  if (!isValidId(newId)) return false;
  const node = findNode(p, oldId);
  if (!node) return false;
  const used = collectIds(p);
  used.delete(oldId);
  if (used.has(newId)) return false;
  node.id = newId;
  remapNodeIdRefs(p, oldId, newId);
  return true;
}

export function clampIndex(value: number, max: number): number {
  return Math.min(Math.max(0, value), max);
}

export function defaultFrameFor(type: WidgetType, parentId: string, p: UiProject): Frame {
  const parent = findNode(p, parentId);
  const parentW = (parent?.frame?.width ?? p.display.width) || 240;
  const parentH = (parent?.frame?.height ?? p.display.height) || 240;
  switch (type) {
    case "label": {
      const measureNode = makeWidget("label_measure", "label");
      measureNode.props = defaultProps("label");
      return normalizeTextNodeFrame(measureNode, {
        x: 8,
        y: 8,
        width: 1,
        height: 1,
      });
    }
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
    case "circle":
      return { x: 8, y: 8, width: 32, height: 32 };
    case "triangle":
      return { x: 8, y: 8, width: 36, height: 32 };
    case "freehand":
      return { x: 8, y: 8, width: 1, height: 1 };
    case "image":
      return { x: 8, y: 8, width: 32, height: 32 };
    default:
      return { x: 0, y: 0, width: 40, height: 20 };
  }
}

export function measureLabelTextBounds(node: WidgetNode): { width: number; height: number } {
  const props = (node.props ?? {}) as LabelProps;
  const face = findFontFace(props);
  const text = props.text ?? "";
  return {
    width: Math.max(1, measureTextWidth(face, text) + 1),
    height: face.lineHeight,
  };
}

export function fitTextNodeFrame(node: WidgetNode, frame: Frame): Frame {
  if (node.type !== "label") return frame;
  const { width, height } = measureLabelTextBounds(node);
  return { ...frame, width, height };
}

export function canFitNodeFrameToContent(node: WidgetNode): boolean {
  return node.type === "label" || node.type === "icon";
}

export function normalizeTextNodeFrame(node: WidgetNode, frame: Frame): Frame {
  if (node.type !== "label") return frame;
  const props = (node.props ?? {}) as LabelProps;
  const { width, height } = measureLabelTextBounds(node);
  if (props.textAutoSize === false) {
    return {
      ...frame,
      width: Math.max(frame.width, width),
      height: Math.max(frame.height, height),
    };
  }
  return { ...frame, width, height };
}

export function cloneScreenSubtree(screen: ScreenNode, usedIds: Set<string>): ScreenNode {
  const cloned = JSON.parse(JSON.stringify(screen)) as ScreenNode;
  const remap = (node: WidgetNode) => {
    const prefix = node.type === "screen" ? "screen" : node.type.slice(0, 3);
    const newId = nextId(prefix, usedIds);
    usedIds.add(newId);
    node.id = newId;
    (node.children ?? []).forEach(remap);
  };
  remap(cloned);
  return cloned;
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
