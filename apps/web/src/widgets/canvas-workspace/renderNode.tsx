import { memo } from "react";

import type {
  ButtonProps,
  Frame,
  IconProps,
  LabelProps,
  LineProps,
  PaletteEntry,
  WidgetNode,
} from "@entities/ui-project";
import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";
import { resolveColor } from "@entities/ui-project/lib/color";
import { BitmapText } from "@entities/font/BitmapText";
import { findFontFace } from "@entities/font/fontLibrary";
import { IconGlyph } from "@entities/icon/iconLibrary";
import { DEFAULT_ICON_ID, getIconScaleForFrame, getResolvedIconDefinition } from "@entities/icon/iconSizing";

import styles from "./renderNode.module.css";

interface RenderCtx {
  palette: PaletteEntry[] | undefined;
  selectedId: string | null;
  movableId: string | null;
  dragPreview: { nodeId: string; rect: Frame; lineProps?: Partial<LineProps> } | null;
  onSelect: (id: string) => void;
  onNodeMouseDown?: (nodeId: string, event: React.MouseEvent<HTMLDivElement>) => void;
  inlineLabelText?: {
    nodeId: string | null;
    text: string;
    onChange: (nodeId: string, text: string) => void;
    onCommit: (nodeId: string, text: string) => void;
  };
}

function PreviewNodeImpl({
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
  const preview = ctx.dragPreview?.nodeId === node.id ? ctx.dragPreview : null;
  const previewRect = preview?.rect ?? null;
  const nextDragOffset = previewRect
    ? { x: previewRect.x - rect.x, y: previewRect.y - rect.y }
    : dragOffset;
  const displayRect = previewRect ?? rect;
  const lineStrokeWidth = node.type === "line"
    ? Math.max(1, node.style?.borderWidth ?? ((node.props ?? {}) as Partial<LineProps>).strokeWidth ?? 1)
    : 0;
  const visualHeight = node.type === "line"
    ? Math.max(displayRect.height, lineStrokeWidth)
    : displayRect.height;
  const style: React.CSSProperties = {
    left: rect.x + nextDragOffset.x,
    top: rect.y + nextDragOffset.y,
    width: displayRect.width,
    height: visualHeight,
    cursor: node.id === ctx.movableId ? "move" : undefined,
  };
  const visualNode: WidgetNode =
    node.type === "line" && preview?.lineProps
      ? { ...node, props: { ...((node.props ?? {}) as LineProps), ...preview.lineProps } }
      : node;

  return (
    <>
      <div
        className={styles.previewNode}
        style={style}
        onMouseDown={(e) => {
          e.stopPropagation();
          ctx.onSelect(node.id);
          ctx.onNodeMouseDown?.(node.id, e);
        }}
      >
        <NodeVisual node={visualNode} ctx={ctx} rect={{ ...displayRect, height: visualHeight }} />
      </div>
      {children.map((child) => (
        <PreviewNode key={child.node.id} layoutNode={child} ctx={ctx} dragOffset={nextDragOffset} />
      ))}
    </>
  );
}

const PreviewNode = memo(PreviewNodeImpl, (prev, next) => {
  if (prev.layoutNode !== next.layoutNode) return false;
  if (prev.dragOffset?.x !== next.dragOffset?.x) return false;
  if (prev.dragOffset?.y !== next.dragOffset?.y) return false;

  const pc = prev.ctx;
  const nc = next.ctx;

  if (prev.layoutNode.children.length > 0) {
    return pc === nc;
  }

  const nid = prev.layoutNode.node.id;

  if (pc.palette !== nc.palette) return false;
  if ((pc.selectedId === nid) !== (nc.selectedId === nid)) return false;
  if ((pc.movableId === nid) !== (nc.movableId === nid)) return false;

  const prevDragged = pc.dragPreview?.nodeId === nid;
  const nextDragged = nc.dragPreview?.nodeId === nid;
  if (prevDragged !== nextDragged) return false;
  if (prevDragged && nextDragged && pc.dragPreview?.rect !== nc.dragPreview?.rect) return false;

  const prevEditing = pc.inlineLabelText?.nodeId === nid;
  const nextEditing = nc.inlineLabelText?.nodeId === nid;
  if (prevEditing !== nextEditing) return false;
  if (prevEditing && nextEditing && pc.inlineLabelText?.text !== nc.inlineLabelText?.text) return false;

  if (pc.onSelect !== nc.onSelect) return false;
  if (pc.onNodeMouseDown !== nc.onNodeMouseDown) return false;

  return true;
});

export { PreviewNode };

function NodeVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  switch (node.type) {
    case "screen":
    case "panel":
      return <PanelVisual node={node} ctx={ctx} />;
    case "rect":
      return <PanelVisual node={node} ctx={ctx} rectMode />;
    case "label":
      return <LabelVisual node={node} ctx={ctx} rect={rect} />;
    case "button":
      return <ButtonVisual node={node} ctx={ctx} rect={rect} />;
    case "icon":
      return <IconVisual node={node} ctx={ctx} rect={rect} />;
    case "image":
      return <ImageVisual node={node} ctx={ctx} />;
    case "line":
      return <LineVisual node={node} ctx={ctx} rect={rect} />;
    default:
      return null;
  }
}

interface PixelPoint {
  x: number;
  y: number;
}

function visibleLineY(value: number | undefined, height: number, strokeWidth: number): number {
  const fallback = Math.floor(height / 2);
  const pad = Math.floor(strokeWidth / 2);
  const max = Math.max(pad, height - Math.ceil(strokeWidth / 2));
  return Math.min(max, Math.max(pad, Math.round(value ?? fallback)));
}

function rasterLine(x1: number, y1: number, x2: number, y2: number): PixelPoint[] {
  const points: PixelPoint[] = [];
  let currentX = x1;
  let currentY = y1;
  const dx = Math.abs(x2 - x1);
  const sx = x1 < x2 ? 1 : -1;
  const dy = -Math.abs(y2 - y1);
  const sy = y1 < y2 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ x: currentX, y: currentY });
    if (currentX === x2 && currentY === y2) break;
    const doubledError = error * 2;
    if (doubledError >= dy) {
      error += dy;
      currentX += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      currentY += sy;
    }
  }

  return points;
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
  const defaultBg = node.type === "screen" ? "transparent" : "#FFFFFF";
  const bg = node.type === "screen"
    ? "transparent"
    : node.style?.drawBackground !== false
      ? resolveColor(node.style?.background, ctx.palette, defaultBg)
      : "transparent";
  const borderWidth = node.style?.borderWidth ?? 0;
  const borderColor =
    node.style?.drawBorder && borderWidth > 0
      ? resolveColor(node.style?.borderColor, ctx.palette, "#FFFFFF")
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

function LabelVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  const props = (node.props ?? {}) as LabelProps;
  const color = resolveColor(node.style?.textColor, ctx.palette, "#FFFFFF");
  const bg = node.style?.drawBackground
    ? resolveColor(node.style?.background, ctx.palette, "#FFFFFF")
    : "transparent";
  const face = findFontFace(props);
  const canEditInline = ctx.selectedId === node.id && ctx.inlineLabelText?.nodeId === node.id;
  const text = canEditInline ? ctx.inlineLabelText?.text ?? "" : props.text ?? "";
  return (
    <div
      className={styles.labelVisual}
      style={{
        width: "100%",
        height: "100%",
        background: bg,
      }}
    >
      {canEditInline ? (
        <>
          <BitmapText
            face={face}
            text={text}
            color={color}
            align={props.align ?? "left"}
            boxWidth={rect.width}
            boxHeight={rect.height}
          />
          <input
            aria-label="edit label text"
            className={styles.inlineTextInput}
            autoFocus
            value={text}
            spellCheck={false}
            style={{
              color: "transparent",
              caretColor: "transparent",
              fontFamily: props.fontFamily ?? face.family,
              fontSize: Math.max(1, face.lineHeight),
              lineHeight: `${Math.max(1, rect.height)}px`,
              textAlign: props.align ?? "left",
            }}
            onChange={(event) => ctx.inlineLabelText?.onChange(node.id, event.target.value)}
            onFocus={() => ctx.onSelect(node.id)}
            onBlur={(event) => ctx.inlineLabelText?.onCommit(node.id, event.target.value)}
            onMouseDown={(event) => {
              event.stopPropagation();
              ctx.onSelect(node.id);
            }}
            onDoubleClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              event.stopPropagation();
            }}
          />
        </>
      ) : (
        <BitmapText
          face={face}
          text={text}
          color={color}
          align={props.align ?? "left"}
          boxWidth={rect.width}
          boxHeight={rect.height}
        />
      )}
    </div>
  );
}

function ButtonVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  const props = (node.props ?? {}) as ButtonProps;
  const bg = node.style?.drawBackground === false
    ? "transparent"
    : resolveColor(node.style?.background, ctx.palette, "#333");
  const fg = resolveColor(node.style?.textColor, ctx.palette, "#FFF");
  const bw = node.style?.drawBorder ? node.style?.borderWidth ?? 1 : 0;
  const bc =
    bw > 0 ? resolveColor(node.style?.borderColor, ctx.palette, "#FFF") : "transparent";
  const paddingLeft = Math.max(0, props.paddingLeft ?? props.paddingX ?? 0);
  const paddingRight = Math.max(0, props.paddingRight ?? props.paddingX ?? 0);
  const paddingTop = Math.max(0, props.paddingTop ?? props.paddingY ?? 0);
  const paddingBottom = Math.max(0, props.paddingBottom ?? props.paddingY ?? 0);
  const contentWidth = Math.max(0, rect.width - bw * 2 - paddingLeft - paddingRight);
  const contentHeight = Math.max(0, rect.height - bw * 2 - paddingTop - paddingBottom);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        border: `${bw}px solid ${bc}`,
        padding: `${paddingTop}px ${paddingRight}px ${paddingBottom}px ${paddingLeft}px`,
      }}
    >
      <BitmapText
        face={findFontFace(props)}
        text={props.text ?? ""}
        color={fg}
        align={props.horizontalAlign ?? "center"}
        verticalAlign={props.verticalAlign ?? "center"}
        boxWidth={contentWidth}
        boxHeight={contentHeight}
      />
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

function LineVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  const props = (node.props ?? {}) as LineProps;
  const strokeWidth = Math.max(1, node.style?.borderWidth ?? props.strokeWidth ?? 1);
  const viewWidth = Math.max(strokeWidth, rect.width);
  const viewHeight = Math.max(strokeWidth, rect.height);
  const fallbackY = Math.floor(viewHeight / 2);
  const x1 = Math.round(props.x1 ?? 0);
  const y1 = visibleLineY(props.y1 ?? fallbackY, viewHeight, strokeWidth);
  const x2 = Math.round(props.x2 ?? viewWidth - 1);
  const y2 = visibleLineY(props.y2 ?? fallbackY, viewHeight, strokeWidth);
  const color = resolveColor(node.style?.borderColor ?? node.style?.textColor, ctx.palette, "#FFFFFF");
  const strokeOffset = Math.floor(strokeWidth / 2);
  const pixels = rasterLine(x1, y1, x2, y2);

  return (
    <div style={{ position: "relative", width: viewWidth, height: viewHeight }}>
      {pixels.map((pixel, index) => (
        <div
          key={`${pixel.x}:${pixel.y}:${index}`}
          style={{
            position: "absolute",
            left: pixel.x - strokeOffset,
            top: pixel.y - strokeOffset,
            width: strokeWidth,
            height: strokeWidth,
            background: color,
          }}
        />
      ))}
    </div>
  );
}
