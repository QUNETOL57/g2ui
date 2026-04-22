import type { Frame, LayoutSpec, WidgetNode } from "@guimintlab/ui-ir";

/**
 * Layout engine v1.
 *
 * MUST match the runtime layout rules in `guimintlab-core/packages/guimintlab/src/internal/guimintlab_builder.c`.
 * Any divergence between this file and the C runtime is a preview-parity bug.
 *
 * Scope v1:
 *  - absolute: child frames are used as-is (relative to parent origin).
 *  - row / column: children flow linearly inside parent padding, with gap,
 *    respecting the child's frame.width/height as the "natural size". Cross-axis
 *    alignment = layout.align, main-axis distribution = layout.justify.
 */

export interface LayoutNode {
  node: WidgetNode;
  rect: Frame;
  children: LayoutNode[];
}

export function layoutTree(root: WidgetNode, parentWidth: number, parentHeight: number): LayoutNode {
  const rect: Frame = root.frame ?? { x: 0, y: 0, width: parentWidth, height: parentHeight };
  const children = layoutChildren(root, { ...rect });
  return { node: root, rect, children };
}

function layoutChildren(parent: WidgetNode, parentRect: Frame): LayoutNode[] {
  const layout: LayoutSpec | undefined = parent.layout;
  const mode = layout?.mode ?? "absolute";
  const children = parent.children ?? [];
  if (children.length === 0) return [];

  if (mode === "absolute") {
    return children.map((child) => {
      const childRect = absoluteChildRect(child, parentRect);
      return {
        node: child,
        rect: childRect,
        children: layoutChildren(child, childRect),
      };
    });
  }

  const padding = layout?.padding ?? 0;
  const gap = layout?.gap ?? 0;
  const axis = mode === "row" ? "x" : "y";
  const crossAxis = axis === "x" ? "y" : "x";
  const mainSize = axis === "x" ? "width" : "height";
  const crossSize = axis === "x" ? "height" : "width";

  const innerX = parentRect.x + padding;
  const innerY = parentRect.y + padding;
  const innerW = Math.max(0, parentRect.width - padding * 2);
  const innerH = Math.max(0, parentRect.height - padding * 2);

  let cursor = axis === "x" ? innerX : innerY;
  const results: LayoutNode[] = [];

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childFrame = child.frame ?? { x: 0, y: 0, width: 0, height: 0 };
    const ms = Math.max(1, childFrame[mainSize]);
    const cs = childFrame[crossSize] || (axis === "x" ? innerH : innerW);

    let crossStart = axis === "x" ? innerY : innerX;
    const availCross = axis === "x" ? innerH : innerW;
    switch (layout?.align ?? "start") {
      case "center":
        crossStart += Math.max(0, Math.floor((availCross - cs) / 2));
        break;
      case "end":
        crossStart += Math.max(0, availCross - cs);
        break;
      case "stretch":
      case "start":
      default:
        break;
    }

    const rect: Frame =
      axis === "x"
        ? {
            x: cursor,
            y: crossStart,
            width: ms,
            height: (layout?.align === "stretch" ? innerH : cs) || innerH,
          }
        : {
            y: cursor,
            x: crossStart,
            height: ms,
            width: (layout?.align === "stretch" ? innerW : cs) || innerW,
          };

    results.push({ node: child, rect, children: layoutChildren(child, rect) });
    cursor += ms + gap;
  }

  return results;
}

function absoluteChildRect(child: WidgetNode, parentRect: Frame): Frame {
  const f = child.frame ?? { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: parentRect.x + f.x,
    y: parentRect.y + f.y,
    width: f.width,
    height: f.height,
  };
}
