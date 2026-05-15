import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";

export function findLayoutNode(layoutNode: LayoutNode, nodeId: string | null): LayoutNode | null {
  if (!nodeId) return null;
  if (layoutNode.node.id === nodeId) return layoutNode;
  for (const child of layoutNode.children) {
    const match = findLayoutNode(child, nodeId);
    if (match) return match;
  }
  return null;
}

export function findParentLayoutNode(
  layoutNode: LayoutNode,
  nodeId: string | null,
): LayoutNode | null {
  if (!nodeId) return null;
  for (const child of layoutNode.children) {
    if (child.node.id === nodeId) return layoutNode;
    const match = findParentLayoutNode(child, nodeId);
    if (match) return match;
  }
  return null;
}
