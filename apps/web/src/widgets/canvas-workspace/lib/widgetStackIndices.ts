import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";

/**
 * Assigns canvas z-index values from the widget tree:
 * - Earlier siblings (higher in the tree list) get a higher z-index.
 * - A panel is always below every descendant inside it.
 * - Inside a panel, the same sibling rule applies to its children.
 */
export function computeWidgetStackIndices(root: LayoutNode): ReadonlyMap<string, number> {
  const indices = new Map<string, number>();

  function assignSiblings(siblings: LayoutNode[], zStart: number): number {
    let z = zStart;
    for (let i = siblings.length - 1; i >= 0; i -= 1) {
      z = assignNode(siblings[i], z);
    }
    return z;
  }

  function assignNode(layoutNode: LayoutNode, zStart: number): number {
    const { node, children } = layoutNode;

    if (node.type === "screen") {
      return children.length > 0 ? assignSiblings(children, zStart) : zStart;
    }

    if (node.type === "panel" && children.length > 0) {
      let z = zStart;
      indices.set(node.id, z);
      z += 1;
      return assignSiblings(children, z);
    }

    if (children.length > 0) {
      return assignSiblings(children, zStart);
    }

    indices.set(node.id, zStart);
    return zStart + 1;
  }

  assignNode(root, 1);
  return indices;
}
