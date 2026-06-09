import type { Frame, UiProject, WidgetNode } from "@entities/ui-project";

export type ParentAlignHorizontal = "left" | "center" | "right";
export type ParentAlignVertical = "top" | "center" | "bottom";

export interface ParentContentBounds {
  inset: number;
  width: number;
  height: number;
}

function borderInsetFor(node: WidgetNode): number {
  if (!node.style?.drawBorder) return 0;
  return Math.max(0, node.style.borderWidth ?? 1);
}

export function parentFrameFor(
  parent: WidgetNode,
  project?: Pick<UiProject, "display">,
): Frame {
  if (parent.frame) return parent.frame;
  if (parent.type === "screen") {
    return {
      x: 0,
      y: 0,
      width: parent.width ?? project?.display.width ?? 0,
      height: parent.height ?? project?.display.height ?? 0,
    };
  }
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function parentContentBounds(
  parent: WidgetNode,
  project?: Pick<UiProject, "display">,
): ParentContentBounds {
  const frame = parentFrameFor(parent, project);
  const inset = borderInsetFor(parent);
  return {
    inset,
    width: Math.max(0, frame.width - inset * 2),
    height: Math.max(0, frame.height - inset * 2),
  };
}

export function canAlignFrameInParent(parent: WidgetNode | null | undefined): boolean {
  if (!parent) return false;
  return (parent.layout?.mode ?? "absolute") === "absolute";
}

export function alignFrameInParent(
  child: Frame,
  bounds: ParentContentBounds,
  horizontal: ParentAlignHorizontal,
  vertical: ParentAlignVertical,
): Pick<Frame, "x" | "y"> {
  const { inset, width: contentW, height: contentH } = bounds;

  let x = inset;
  if (horizontal === "center") {
    x = inset + Math.max(0, Math.floor((contentW - child.width) / 2));
  } else if (horizontal === "right") {
    x = inset + Math.max(0, contentW - child.width);
  }

  let y = inset;
  if (vertical === "center") {
    y = inset + Math.max(0, Math.floor((contentH - child.height) / 2));
  } else if (vertical === "bottom") {
    y = inset + Math.max(0, contentH - child.height);
  }

  return { x, y };
}

export function detectHorizontalAlign(
  frame: Frame,
  bounds: ParentContentBounds,
): ParentAlignHorizontal {
  const candidates = (["left", "center", "right"] as const).map((value) => ({
    value,
    x: alignFrameInParent(frame, bounds, value, "top").x,
  }));
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate.x - frame.x) < Math.abs(best.x - frame.x) ? candidate : best,
  ).value;
}

export function detectVerticalAlign(
  frame: Frame,
  bounds: ParentContentBounds,
): ParentAlignVertical {
  const candidates = (["top", "center", "bottom"] as const).map((value) => ({
    value,
    y: alignFrameInParent(frame, bounds, "left", value).y,
  }));
  return candidates.reduce((best, candidate) =>
    Math.abs(candidate.y - frame.y) < Math.abs(best.y - frame.y) ? candidate : best,
  ).value;
}
