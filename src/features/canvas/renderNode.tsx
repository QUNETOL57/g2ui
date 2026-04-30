import type {
  ButtonProps,
  Frame,
  IconProps,
  LabelProps,
  LineProps,
  PaletteEntry,
  WidgetNode,
} from "../../ui-ir";

import type { LayoutNode } from "../../layout/layoutEngine";
import { resolveColor } from "../../layout/color";
import { IconGlyph } from "../icons/iconLibrary";
import { DEFAULT_ICON_ID, getIconScaleForFrame, getResolvedIconDefinition } from "../icons/iconSizing";

interface RenderCtx {
  palette: PaletteEntry[] | undefined;
  selectedId: string | null;
  movableId: string | null;
  dragPreview: { nodeId: string; rect: Frame } | null;
  onSelect: (id: string) => void;
  onNodeMouseDown?: (nodeId: string, event: React.MouseEvent<HTMLDivElement>) => void;
}

export function PreviewNode({
  layoutNode,
  ctx,
  dragOffset = { x: 0, y: 0 },
}: {
  layoutNode: LayoutNode;
  ctx: RenderCtx;
  dragOffset?: { x: number; y: number };
}) {
  const { node, rect, children } = layoutNode;
  if (node.visible === false) return null;
  const previewRect = ctx.dragPreview?.nodeId === node.id ? ctx.dragPreview.rect : null;
  const nextDragOffset = previewRect
    ? { x: previewRect.x - rect.x, y: previewRect.y - rect.y }
    : dragOffset;
  const style: React.CSSProperties = {
    left: rect.x + nextDragOffset.x,
    top: rect.y + nextDragOffset.y,
    width: previewRect?.width ?? rect.width,
    height: previewRect?.height ?? rect.height,
    cursor: node.id === ctx.movableId ? "move" : undefined,
  };

  return (
    <>
      <div
        className="preview-node"
        style={style}
        onMouseDown={(e) => {
          e.stopPropagation();
          ctx.onSelect(node.id);
          ctx.onNodeMouseDown?.(node.id, e);
        }}
      >
        <NodeVisual node={node} ctx={ctx} rect={previewRect ?? rect} />
      </div>
      {children.map((child) => (
        <PreviewNode key={child.node.id} layoutNode={child} ctx={ctx} dragOffset={nextDragOffset} />
      ))}
    </>
  );
}

function NodeVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  switch (node.type) {
    case "screen":
    case "panel":
      return <PanelVisual node={node} ctx={ctx} />;
    case "rect":
      return <PanelVisual node={node} ctx={ctx} rectMode />;
    case "label":
      return <LabelVisual node={node} ctx={ctx} />;
    case "button":
      return <ButtonVisual node={node} ctx={ctx} />;
    case "icon":
      return <IconVisual node={node} ctx={ctx} rect={rect} />;
    case "image":
      return <ImageVisual node={node} ctx={ctx} />;
    case "line":
      return <LineVisual node={node} ctx={ctx} />;
    default:
      return null;
  }
}

function PanelVisual({
  node,
  ctx,
  rectMode,
}: {
  node: WidgetNode;
  ctx: RenderCtx;
  rectMode?: boolean;
}) {
  const bg = node.style?.drawBackground !== false
    ? resolveColor(node.style?.background, ctx.palette, "transparent")
    : "transparent";
  const borderWidth = node.style?.borderWidth ?? 0;
  const borderColor =
    node.style?.drawBorder && borderWidth > 0
      ? resolveColor(node.style?.borderColor, ctx.palette, "#000")
      : "transparent";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: rectMode ? undefined : 0,
      }}
    />
  );
}

function LabelVisual({ node, ctx }: { node: WidgetNode; ctx: RenderCtx }) {
  const props = (node.props ?? {}) as LabelProps;
  const color = resolveColor(node.style?.textColor, ctx.palette, "#FFFFFF");
  const align =
    props.align === "center" ? "center" : props.align === "right" ? "flex-end" : "flex-start";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: align,
        color,
        fontSize: 8 * (props.scale ?? 1),
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        width: "100%",
        height: "100%",
        padding: 0,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {props.text ?? ""}
    </div>
  );
}

function ButtonVisual({ node, ctx }: { node: WidgetNode; ctx: RenderCtx }) {
  const props = (node.props ?? {}) as ButtonProps;
  const bg = resolveColor(node.style?.background, ctx.palette, "#333");
  const fg = resolveColor(node.style?.textColor, ctx.palette, "#FFF");
  const bw = node.style?.borderWidth ?? 0;
  const bc =
    bw > 0 ? resolveColor(node.style?.borderColor, ctx.palette, "#FFF") : "transparent";
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        color: fg,
        border: `${bw}px solid ${bc}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 8 * (props.scale ?? 1),
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      }}
    >
      {props.text ?? ""}
    </div>
  );
}

function IconVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  const props = (node.props ?? {}) as IconProps;
  const color = resolveColor(node.style?.textColor, ctx.palette, "#FFF");
  const icon = getResolvedIconDefinition(props.iconId);
  const iconId = props.iconId && icon.id === props.iconId ? props.iconId : DEFAULT_ICON_ID;
  const pixelSize = getIconScaleForFrame(icon, rect);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        color,
        opacity: 0.9,
        overflow: "hidden",
      }}
      title={`icon: ${iconId}`}
    >
      <IconGlyph iconId={iconId} color={color} pixelSize={pixelSize} />
    </div>
  );
}

function ImageVisual({ node, ctx }: { node: WidgetNode; ctx: RenderCtx }) {
  const color = resolveColor(node.style?.textColor, ctx.palette, "#FFF");
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background:
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 4px, transparent 4px 8px)",
        color,
        border: "1px dashed currentColor",
        opacity: 0.7,
      }}
    />
  );
}

function LineVisual({ node, ctx }: { node: WidgetNode; ctx: RenderCtx }) {
  const props = (node.props ?? {}) as LineProps;
  const color = resolveColor(node.style?.borderColor ?? node.style?.textColor, ctx.palette, "#FFF");
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${Math.max(1, node.frame?.width ?? 1)} ${Math.max(1, node.frame?.height ?? 1)}`}
      preserveAspectRatio="none"
    >
      <line
        x1={0}
        y1={0}
        x2={props.x2 ?? node.frame?.width ?? 0}
        y2={props.y2 ?? 0}
        stroke={color}
        strokeWidth={props.strokeWidth ?? 1}
      />
    </svg>
  );
}
