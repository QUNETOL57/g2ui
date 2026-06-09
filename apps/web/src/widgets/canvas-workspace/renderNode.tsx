import { memo, useCallback, useEffect, useRef, useState } from "react";

import type {
  ButtonProps,
  Frame,
  IconProps,
  LabelProps,
  LineProps,
  PaletteEntry,
  RectProps,
  WidgetNode,
} from "@entities/ui-project";
import type { LayoutNode } from "@entities/ui-project/lib/layoutEngine";
import { resolveColor } from "@entities/ui-project/lib/color";
import { BitmapText, type BitmapTextAlign } from "@entities/font/BitmapText";
import type { BitmapFontFace } from "@entities/font/fontTypes";
import { findFontFace, measureTextWidth, measureTextInkBounds, measureTextInkHeight, textInkOriginY } from "@entities/font/fontLibrary";
import { IconGlyph } from "@entities/icon/iconLibrary";
import { DEFAULT_ICON_ID, getIconScaleForFrame, getResolvedIconDefinition } from "@entities/icon/iconSizing";

import { innerFillScanline, roundedRowInset } from "./lib/pixelRounded";
import styles from "./renderNode.module.css";

interface RenderCtx {
  palette: PaletteEntry[] | undefined;
  selectedId: string | null;
  movableId: string | null;
  dragPreview: { nodeId: string; rect: Frame; lineProps?: Partial<LineProps> } | null;
  draftFrame?: { nodeId: string; frame: Frame } | null;
  onSelect: (id: string) => void;
  onNodeMouseDown?: (nodeId: string, event: React.MouseEvent<HTMLDivElement>) => void;
  onLabelEditStart?: (nodeId: string) => void;
  editingLabelId?: string | null;
  onLabelTextCommit?: (nodeId: string, text: string, frame?: Frame) => void;
  onLabelDraftFrame?: (nodeId: string, frame: Frame) => void;
}

function PreviewNodeImpl({
  layoutNode,
  ctx,
  dragOffset = { x: 0, y: 0 },
  stackIndex = 0,
}: {
  layoutNode: LayoutNode;
  ctx: RenderCtx;
  dragOffset?: { x: number; y: number };
  stackIndex?: number;
}) {
  const { node, rect, children } = layoutNode;
  if (node.visible === false) return null;
  const preview = ctx.dragPreview?.nodeId === node.id ? ctx.dragPreview : null;
  const draftRect = ctx.draftFrame?.nodeId === node.id ? ctx.draftFrame.frame : null;
  const previewRect = preview?.rect ?? draftRect;
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
  const isLayerNode = node.type !== "screen";
  const nodeStackBase = isLayerNode ? stackIndex : 0;
  const style: React.CSSProperties = {
    left: rect.x + nextDragOffset.x,
    top: rect.y + nextDragOffset.y,
    width: displayRect.width,
    height: visualHeight,
    cursor: node.id === ctx.movableId ? "move" : undefined,
    zIndex: isLayerNode ? nodeStackBase : undefined,
  };
  const visualNode: WidgetNode =
    node.type === "line" && preview?.lineProps
      ? { ...node, props: { ...((node.props ?? {}) as LineProps), ...preview.lineProps } }
      : node;

  return (
    <>
      <div
        className={styles.previewNode}
        data-testid="canvas-widget"
        data-widget-id={node.id}
        data-widget-type={node.type}
        style={style}
        onMouseDown={(e) => {
          e.stopPropagation();
          ctx.onSelect(node.id);
          ctx.onNodeMouseDown?.(node.id, e);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (node.type === "label" || node.type === "button") {
            ctx.onLabelEditStart?.(node.id);
          }
        }}
      >
        <NodeVisual node={visualNode} ctx={ctx} rect={{ ...displayRect, height: visualHeight }} />
      </div>
      {children.map((child, index) => (
        <PreviewNode
          key={child.node.id}
          layoutNode={child}
          ctx={ctx}
          dragOffset={nextDragOffset}
          stackIndex={nodeStackBase + (children.length - index)}
        />
      ))}
    </>
  );
}

const PreviewNode = memo(PreviewNodeImpl, (prev, next) => {
  if (prev.layoutNode !== next.layoutNode) return false;
  if (prev.dragOffset?.x !== next.dragOffset?.x) return false;
  if (prev.dragOffset?.y !== next.dragOffset?.y) return false;
  if (prev.stackIndex !== next.stackIndex) return false;

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

  const prevDrafted = pc.draftFrame?.nodeId === nid;
  const nextDrafted = nc.draftFrame?.nodeId === nid;
  if (prevDrafted !== nextDrafted) return false;
  if (prevDrafted && nextDrafted && pc.draftFrame?.frame !== nc.draftFrame?.frame) return false;

  const prevEditing = pc.editingLabelId === nid;
  const nextEditing = nc.editingLabelId === nid;
  if (prevEditing !== nextEditing) return false;

  if (pc.onSelect !== nc.onSelect) return false;
  if (pc.onNodeMouseDown !== nc.onNodeMouseDown) return false;
  if (pc.onLabelEditStart !== nc.onLabelEditStart) return false;
  if (pc.onLabelTextCommit !== nc.onLabelTextCommit) return false;
  if (pc.onLabelDraftFrame !== nc.onLabelDraftFrame) return false;

  return true;
});

export { PreviewNode };

function NodeVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  switch (node.type) {
    case "screen":
    case "panel":
      return <PanelVisual node={node} ctx={ctx} rect={rect} />;
    case "rect":
      return <PanelVisual node={node} ctx={ctx} rect={rect} />;
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
  rect,
}: {
  node: WidgetNode;
  ctx: RenderCtx;
  rect: Frame;
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
  const rectProps = (node.props ?? {}) as Partial<RectProps>;
  const borderRadius = Math.max(0, node.style?.borderRadius ?? rectProps.radius ?? 0);
  if (borderRadius > 0) {
    return (
      <PixelRoundedBox
        width={rect.width}
        height={rect.height}
        radius={borderRadius}
        background={bg}
        borderColor={borderColor}
        borderWidth={borderWidth}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: bg,
        border: `${borderWidth}px solid ${borderColor}`,
      }}
    />
  );
}

function PixelRoundedBox({
  width,
  height,
  radius,
  background,
  borderColor,
  borderWidth = 0,
}: {
  width: number;
  height: number;
  radius: number;
  background: string;
  borderColor: string;
  borderWidth?: number;
}) {
  const w = Math.max(0, Math.round(width));
  const h = Math.max(0, Math.round(height));
  const bw = Math.max(0, Math.round(borderWidth));
  const hasBorder = bw > 0 && borderColor !== "transparent";
  const hasFill = background !== "transparent";
  const outerColor = hasBorder ? borderColor : background;
  const innerW = Math.max(0, w - bw * 2);
  const innerH = Math.max(0, h - bw * 2);

  return (
    <svg
      data-testid="pixel-rounded-box"
      aria-hidden
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        shapeRendering: "crispEdges",
      }}
    >
      {(hasBorder || hasFill) && outerColor !== "transparent"
        ? Array.from({ length: h }, (_, y) => {
            const inset = roundedRowInset(y, w, h, radius);
            return (
              <rect
                key={`outer-${y}`}
                x={inset}
                y={y}
                width={Math.max(0, w - inset * 2)}
                height={1}
                fill={outerColor}
              />
            );
          })
        : null}
      {hasBorder && hasFill
        ? Array.from({ length: innerH }, (_, y) => {
            const svgY = bw + y;
            const { x, width: fillWidth } = innerFillScanline(svgY, w, h, radius, bw);
            return (
              <rect
                key={`inner-${y}`}
                x={x}
                y={svgY}
                width={fillWidth}
                height={1}
                fill={background}
              />
            );
          })
        : null}
    </svg>
  );
}

function labelTextOrigin(
  face: BitmapFontFace,
  text: string,
  align: BitmapTextAlign,
  boxWidth: number,
  boxHeight: number,
  verticalAlign: "top" | "center" | "bottom" = "center",
) {
  const textWidth = measureTextWidth(face, text);
  const ink = measureTextInkBounds(face, text);
  let originX = 0;
  if (align === "center") {
    originX = Math.floor((boxWidth - textWidth) / 2);
  } else if (align === "right") {
    originX = boxWidth - textWidth;
  }
  const originY = textInkOriginY(face, text, boxHeight, verticalAlign);
  return { originX, originY, textWidth, textHeight: ink.height };
}

function expandedLabelFrameForText(
  face: BitmapFontFace,
  text: string,
  caretIndex: number,
  rect: Frame,
): Frame {
  const textWidth = measureTextWidth(face, text);
  const caretWidth = measureTextWidth(face, text.slice(0, caretIndex));
  return {
    ...rect,
    width: Math.max(rect.width, textWidth + 1, caretWidth + 1),
    height: Math.max(rect.height, measureTextInkHeight(face, text)),
  };
}

function caretIndexForClientX(
  face: BitmapFontFace,
  text: string,
  align: BitmapTextAlign,
  boxWidth: number,
  localX: number,
): number {
  const { originX } = labelTextOrigin(face, text, align, boxWidth, face.lineHeight, "top");
  const textX = localX - originX;
  const chars = Array.from(text);
  let width = 0;
  let codeUnitIndex = 0;

  for (const char of chars) {
    const nextWidth = width + measureTextWidth(face, char);
    if (textX < width + (nextWidth - width) / 2) {
      return codeUnitIndex;
    }
    width = nextWidth;
    codeUnitIndex += char.length;
  }

  return text.length;
}

function LabelInlineEditor({
  nodeId,
  face,
  initialText,
  color,
  bg,
  align,
  verticalAlign = "top",
  rect,
  onCommit,
  onDraftFrame,
  onSelect,
}: {
  nodeId: string;
  face: BitmapFontFace;
  initialText: string;
  color: string;
  bg: string;
  align: BitmapTextAlign;
  verticalAlign?: "top" | "center" | "bottom";
  rect: Frame;
  onCommit: (nodeId: string, text: string, frame?: Frame) => void;
  onDraftFrame?: (nodeId: string, frame: Frame) => void;
  onSelect: (id: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const textRef = useRef(initialText);
  const frameRef = useRef(rect);
  const visualRectRef = useRef(rect);
  const [text, setText] = useState(initialText);
  const [caretIndex, setCaretIndex] = useState(initialText.length);
  textRef.current = text;
  visualRectRef.current = rect;

  const expandForText = useCallback(
    (nextText: string, nextCaretIndex: number) => {
      const previousFrame = frameRef.current;
      const nextFrame = expandedLabelFrameForText(face, nextText, nextCaretIndex, frameRef.current);
      frameRef.current = nextFrame;
      if (nextFrame.width !== previousFrame.width || nextFrame.height !== previousFrame.height) {
        onDraftFrame?.(nodeId, nextFrame);
      }
      return nextFrame;
    },
    [face, nodeId, onDraftFrame],
  );

  const syncCaret = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const nextIndex = input.selectionStart ?? text.length;
    setCaretIndex((current) => (current === nextIndex ? current : nextIndex));
  }, [text.length]);

  const placeCaretAtClientX = useCallback(
    (clientX: number) => {
      const input = inputRef.current;
      const root = rootRef.current;
      if (!input || !root) return;
      const bounds = root.getBoundingClientRect();
      const visualRect = visualRectRef.current;
      const scaleX = bounds.width > 0 && visualRect.width > 0
        ? bounds.width / visualRect.width
        : 1;
      const localX = (clientX - bounds.left) / scaleX;
      const nextIndex = caretIndexForClientX(
        face,
        textRef.current,
        align,
        visualRect.width,
        localX,
      );
      input.focus({ preventScroll: true });
      input.setSelectionRange(nextIndex, nextIndex);
      setCaretIndex(nextIndex);
      expandForText(textRef.current, nextIndex);
    },
    [align, expandForText, face],
  );

  useEffect(() => {
    frameRef.current = rect;
    setText(initialText);
    setCaretIndex(initialText.length);
    expandForText(initialText, initialText.length);
  }, [nodeId, initialText]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
    const end = input.value.length;
    input.setSelectionRange(end, end);
    setCaretIndex(end);
  }, [nodeId]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      onCommit(nodeId, textRef.current, frameRef.current);
    };

    window.addEventListener("mousedown", handleMouseDown, { capture: true });
    return () => window.removeEventListener("mousedown", handleMouseDown, { capture: true });
  }, [nodeId, onCommit]);

  const { originX, originY, textHeight } = labelTextOrigin(
    face,
    text,
    align,
    rect.width,
    rect.height,
    verticalAlign,
  );
  const rawCaretLeft = originX + measureTextWidth(face, text.slice(0, caretIndex));
  const caretLeft = Math.max(0, Math.min(rawCaretLeft, Math.max(0, rect.width - 1)));

  return (
    <div
      ref={rootRef}
      className={styles.labelVisual}
      data-testid="label-inline-editor"
      data-widget-id={nodeId}
      style={{
        width: "100%",
        height: "100%",
        background: bg,
      }}
    >
      <BitmapText
        face={face}
        text={text}
        color={color}
        align={align}
        verticalAlign={verticalAlign}
        boxWidth={rect.width}
        boxHeight={rect.height}
      />
      <span
        className={styles.textCaret}
        aria-hidden
        style={{
          left: caretLeft,
          top: originY,
          height: textHeight,
          backgroundColor: color,
        }}
      />
      <input
        ref={inputRef}
        aria-label="edit label text"
        className={styles.inlineTextInput}
        value={text}
        spellCheck={false}
        style={{
          lineHeight: `${face.lineHeight}px`,
          textAlign: align,
        }}
        onChange={(event) => {
          const nextText = event.target.value;
          const nextCaretIndex = event.target.selectionStart ?? nextText.length;
          setText(nextText);
          setCaretIndex(nextCaretIndex);
          expandForText(nextText, nextCaretIndex);
        }}
        onFocus={() => onSelect(nodeId)}
        onBlur={(event) => onCommit(nodeId, event.target.value, frameRef.current)}
        onMouseDown={(event) => {
          event.stopPropagation();
          event.preventDefault();
          onSelect(nodeId);
          placeCaretAtClientX(event.clientX);
        }}
        onClick={(event) => {
          event.preventDefault();
          placeCaretAtClientX(event.clientX);
        }}
        onKeyUp={() => {
          syncCaret();
          const input = inputRef.current;
          expandForText(text, input?.selectionStart ?? text.length);
        }}
        onSelect={() => {
          syncCaret();
          const input = inputRef.current;
          expandForText(text, input?.selectionStart ?? text.length);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
          event.stopPropagation();
        }}
      />
    </div>
  );
}

function LabelVisual({ node, ctx, rect }: { node: WidgetNode; ctx: RenderCtx; rect: Frame }) {
  const props = (node.props ?? {}) as LabelProps;
  const color = resolveColor(node.style?.textColor, ctx.palette, "#FFFFFF");
  const bg = node.style?.drawBackground
    ? resolveColor(node.style?.background, ctx.palette, "#FFFFFF")
    : "transparent";
  const face = findFontFace(props);
  const align = props.align ?? "left";
  const isEditing = ctx.editingLabelId === node.id;

  if (isEditing && ctx.onLabelTextCommit) {
    return (
      <LabelInlineEditor
        nodeId={node.id}
        face={face}
        initialText={props.text ?? ""}
        color={color}
        bg={bg}
        align={align}
        rect={rect}
        onCommit={ctx.onLabelTextCommit}
        onDraftFrame={ctx.onLabelDraftFrame}
        onSelect={ctx.onSelect}
      />
    );
  }

  return (
    <div
      className={styles.labelVisual}
      style={{
        width: "100%",
        height: "100%",
        background: bg,
      }}
    >
      <BitmapText
        face={face}
        text={props.text ?? ""}
        color={color}
        align={align}
        verticalAlign="top"
        boxWidth={rect.width}
        boxHeight={rect.height}
      />
    </div>
  );
}

function alignedOffset(align: "left" | "center" | "right", outerWidth: number, innerWidth: number): number {
  if (align === "center") return Math.floor((outerWidth - innerWidth) / 2);
  if (align === "right") return outerWidth - innerWidth;
  return 0;
}

function verticalOffset(
  align: "top" | "center" | "bottom",
  outerHeight: number,
  innerHeight: number,
): number {
  if (align === "center") return Math.floor((outerHeight - innerHeight) / 2);
  if (align === "bottom") return outerHeight - innerHeight;
  return 0;
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
  const face = findFontFace(props);
  const horizontalAlign = props.horizontalAlign ?? "center";
  const verticalAlign = props.verticalAlign ?? "center";
  const isEditing = ctx.editingLabelId === node.id;
  const text = props.text ?? "";
  const icon = props.iconId !== undefined ? getResolvedIconDefinition(props.iconId) : null;
  const iconPosition = props.iconPosition ?? "left";
  const iconGap = text && icon ? Math.max(0, props.iconGap ?? 2) : 0;
  const isIconVertical = iconPosition === "top" || iconPosition === "bottom";
  const textWidth = text ? measureTextWidth(face, text) : 0;
  const textHeight = text ? face.lineHeight : 0;
  const iconPixelSize = 1;
  const iconWidth = icon ? icon.width * iconPixelSize : 0;
  const iconHeight = icon ? icon.height * iconPixelSize : 0;
  const groupWidth = isIconVertical
    ? Math.max(iconWidth, textWidth)
    : iconWidth + (icon ? iconGap : 0) + textWidth;
  const groupHeight = isIconVertical
    ? iconHeight + (icon ? iconGap : 0) + textHeight
    : Math.max(iconHeight, textHeight);
  const groupLeft = Math.max(0, alignedOffset(horizontalAlign, contentWidth, groupWidth));
  const groupTop = Math.max(0, verticalOffset(verticalAlign, contentHeight, groupHeight));
  const iconLeft = isIconVertical
    ? groupLeft + Math.max(0, Math.floor((groupWidth - iconWidth) / 2))
    : groupLeft + (iconPosition === "right" ? textWidth + iconGap : 0);
  const iconTop = isIconVertical
    ? groupTop + (iconPosition === "bottom" ? textHeight + iconGap : 0)
    : groupTop + Math.max(0, Math.floor((groupHeight - iconHeight) / 2));
  const textLeft = isIconVertical
    ? groupLeft + Math.max(0, Math.floor((groupWidth - textWidth) / 2))
    : groupLeft + (iconPosition === "left" && icon ? iconWidth + iconGap : 0);
  const textTop = isIconVertical
    ? groupTop + (iconPosition === "top" && icon ? iconHeight + iconGap : 0)
    : groupTop + Math.max(0, Math.floor((groupHeight - textHeight) / 2));
  const textBoxWidth = isIconVertical || iconPosition === "left"
    ? Math.max(0, contentWidth - textLeft)
    : Math.max(0, iconLeft - iconGap - textLeft);
  const textBoxHeight = !isIconVertical || iconPosition === "top"
    ? Math.max(0, contentHeight - textTop)
    : Math.max(0, iconTop - iconGap - textTop);
  const borderRadius = Math.max(0, node.style?.borderRadius ?? 0);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {borderRadius > 0 ? (
        <div aria-hidden style={{ position: "absolute", inset: 0 }}>
          <PixelRoundedBox
            width={rect.width}
            height={rect.height}
            radius={borderRadius}
            background={bg}
            borderColor={bc}
            borderWidth={bw}
          />
        </div>
      ) : (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: bg,
            border: `${bw}px solid ${bc}`,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          width: contentWidth,
          height: contentHeight,
          margin: `${bw + paddingTop}px ${bw + paddingRight}px ${bw + paddingBottom}px ${bw + paddingLeft}px`,
          overflow: "hidden",
        }}
      >
        {!icon ? (
          isEditing && ctx.onLabelTextCommit ? (
            <LabelInlineEditor
              nodeId={node.id}
              face={face}
              initialText={text}
              color={fg}
              bg="transparent"
              align={horizontalAlign}
              verticalAlign={verticalAlign}
              rect={{ x: 0, y: 0, width: contentWidth, height: contentHeight }}
              onCommit={ctx.onLabelTextCommit}
              onSelect={ctx.onSelect}
            />
          ) : (
            <BitmapText
              face={face}
              text={text}
              color={fg}
              align={horizontalAlign}
              verticalAlign={verticalAlign}
              boxWidth={contentWidth}
              boxHeight={contentHeight}
            />
          )
        ) : (
          <>
            <div
              style={{
                position: "absolute",
                left: iconLeft,
                top: iconTop,
                width: iconWidth,
                height: iconHeight,
              }}
            >
              <IconGlyph iconId={icon.id} color={fg} pixelSize={iconPixelSize} />
            </div>
            {isEditing && ctx.onLabelTextCommit ? (
              <div
                style={{
                  position: "absolute",
                  left: textLeft,
                  top: textTop,
                  width: textBoxWidth,
                  height: Math.max(textBoxHeight, face.lineHeight),
                  overflow: "hidden",
                }}
              >
                <LabelInlineEditor
                  nodeId={node.id}
                  face={face}
                  initialText={text}
                  color={fg}
                  bg="transparent"
                  align="left"
                  verticalAlign="top"
                  rect={{
                    x: 0,
                    y: 0,
                    width: textBoxWidth,
                    height: Math.max(textBoxHeight, face.lineHeight),
                  }}
                  onCommit={ctx.onLabelTextCommit}
                  onSelect={ctx.onSelect}
                />
              </div>
            ) : text ? (
              <div
                style={{
                  position: "absolute",
                  left: textLeft,
                  top: textTop,
                  width: textBoxWidth,
                  height: Math.max(textBoxHeight, textHeight),
                  overflow: "hidden",
                }}
              >
                <BitmapText
                  face={face}
                  text={text}
                  color={fg}
                  align="left"
                  verticalAlign="top"
                  boxWidth={textBoxWidth}
                  boxHeight={Math.max(textBoxHeight, textHeight)}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
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
