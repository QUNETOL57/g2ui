import type { Frame, IconProps, WidgetNode } from "@entities/ui-project";
import { getIconDefinition } from "./iconLibrary";
import type { IconDefinition } from "./iconLibraryData";

export const DEFAULT_ICON_ID = "earth";

export function getResolvedIconDefinition(iconId: string | undefined | null): IconDefinition {
  return getIconDefinition(iconId) ?? getIconDefinition(DEFAULT_ICON_ID)!;
}

export function getIconScaleForFrame(icon: IconDefinition, frame: Pick<Frame, "width" | "height">): number {
  return Math.max(1, Math.floor(Math.min(frame.width / icon.width, frame.height / icon.height)));
}

export function normalizeIconFrame(
  iconId: string | undefined | null,
  frame: Frame,
  options: {
    anchorX?: "left" | "right";
    anchorY?: "top" | "bottom";
    maxWidth?: number;
    maxHeight?: number;
  } = {},
): Frame {
  const icon = getResolvedIconDefinition(iconId);
  const maxScaleByWidth =
    options.maxWidth === undefined ? Number.POSITIVE_INFINITY : Math.floor(options.maxWidth / icon.width);
  const maxScaleByHeight =
    options.maxHeight === undefined ? Number.POSITIVE_INFINITY : Math.floor(options.maxHeight / icon.height);
  const maxScale = Math.max(1, Math.min(maxScaleByWidth, maxScaleByHeight));
  const requestedScale = Math.max(frame.width / icon.width, frame.height / icon.height);
  const scale = Math.min(maxScale, Math.max(1, Math.round(requestedScale)));
  const width = icon.width * scale;
  const height = icon.height * scale;
  const x = options.anchorX === "right" ? frame.x + frame.width - width : frame.x;
  const y = options.anchorY === "bottom" ? frame.y + frame.height - height : frame.y;

  return { x, y, width, height };
}

export function fitIconFrameToContent(iconId: string | undefined | null, frame: Frame): Frame {
  const icon = getResolvedIconDefinition(iconId);
  const scale = getIconScaleForFrame(icon, frame);
  return {
    x: frame.x,
    y: frame.y,
    width: icon.width * scale,
    height: icon.height * scale,
  };
}

export function normalizeIconNodeFrame(node: WidgetNode, frame: Frame): Frame {
  const props = (node.props ?? {}) as Partial<IconProps>;
  return node.type === "icon" ? normalizeIconFrame(props.iconId, frame) : frame;
}
