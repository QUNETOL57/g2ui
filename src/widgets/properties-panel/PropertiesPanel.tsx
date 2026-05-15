import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FormatAlignCenterIcon from "@mui/icons-material/FormatAlignCenter";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import FormatAlignRightIcon from "@mui/icons-material/FormatAlignRight";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import VerticalAlignBottomIcon from "@mui/icons-material/VerticalAlignBottom";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import VerticalAlignTopIcon from "@mui/icons-material/VerticalAlignTop";
import type {
  ButtonProps,
  ColorRef,
  Frame,
  IconProps,
  LabelProps,
  LayoutMode,
  WidgetNode,
} from "../../ui-ir";

import { CustomSelect } from "../../components/CustomSelect";
import { DraftNumberInput } from "../../components/DraftNumberInput";
import { useEditorStore, findNode } from "../../store/editorStore";
import { findFontFace, getFontFamilyOptions, getFontSizes } from "../fonts/fontLibrary";
import type { BitmapFontStyle } from "../fonts/fontTypes";
import { ICON_GROUPS, IconGlyph } from "../icons/iconLibrary";
import { getResolvedIconDefinition } from "../icons/iconSizing";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const draftFrame = useEditorStore((s) => s.draftFrame);
  const updateNode = useEditorStore((s) => s.updateNode);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const updateProps = useEditorStore((s) => s.updateProps);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  if (!selectedNodeId) {
    return (
      <>
        <div className="section-title">Properties</div>
        <div className="empty-state">
          Select a widget in the tree or canvas.
        </div>
      </>
    );
  }

  const node = findNode(project, selectedNodeId);
  if (!node) return null;

  return (
    <>
      <div className="section-title">Properties · {node.type}</div>

      <SelectedGroup node={node} updateNode={updateNode} />

      {node.type !== "screen" ? (
        <FrameGroup
          node={node}
          draftFrame={draftFrame?.nodeId === node.id ? draftFrame.frame : null}
          updateFrame={updateFrame}
        />
      ) : null}

      {node.type === "icon" ? (
        <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />
      ) : null}

      {node.type === "label" && (
        <LabelGroup
          node={node}
          palette={project.palette}
          onChange={(patch) => updateProps(node.id, patch)}
          onStyleChange={(patch) => updateStyle(node.id, patch)}
        />
      )}
      {node.type === "button" && (
        <ButtonGroup
          node={node}
          palette={project.palette}
          onChange={(patch) => updateProps(node.id, patch)}
          onStyleChange={(patch) => updateStyle(node.id, patch)}
        />
      )}
      {node.type === "icon" && (
        <IconGroup node={node} onChange={(patch) => updateProps(node.id, patch)} />
      )}

      {(node.type === "screen" || node.type === "panel") && (
        <LayoutGroup node={node} updateLayout={updateLayout} />
      )}

      {node.type !== "icon" && node.type !== "label" ? (
        <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />
      ) : null}
    </>
  );
}

function SelectedGroup({
  node,
  updateNode,
}: {
  node: WidgetNode;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
}) {
  return (
    <div className="prop-group inspector-summary">
      <div className="inspector-title-row">
        <span className="type-pill">{node.type}</span>
        <span className="inspector-id" title={node.id}>
          {node.id}
        </span>
      </div>
      <div className="prop-row">
        <label>name</label>
        <input
          type="text"
          value={node.name ?? ""}
          placeholder={node.id}
          onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        />
      </div>
      <label className="visibility-toggle">
        <input
          type="checkbox"
          checked={node.visible !== false}
          onChange={(e) => updateNode(node.id, { visible: e.target.checked })}
        />
        Visible on canvas
      </label>
    </div>
  );
}

function FrameGroup({
  node,
  draftFrame,
  updateFrame,
}: {
  node: WidgetNode;
  draftFrame: Frame | null;
  updateFrame: (id: string, patch: Partial<NonNullable<WidgetNode["frame"]>>) => void;
}) {
  const f = draftFrame ?? node.frame ?? { x: 0, y: 0, width: 0, height: 0 };
  const icon = node.type === "icon" ? getResolvedIconDefinition(((node.props ?? {}) as Partial<IconProps>).iconId) : null;
  return (
    <div className="prop-group">
      <h4>Transform</h4>
      <div className="transform-grid">
        <TransformField label="X" value={f.x} onChange={(v) => updateFrame(node.id, { x: v })} />
        <TransformField label="Y" value={f.y} onChange={(v) => updateFrame(node.id, { y: v })} />
        <TransformField
          label="W"
          value={f.width}
          min={icon?.width}
          onChange={(v) => updateFrame(node.id, { width: v })}
        />
        <TransformField
          label="H"
          value={f.height}
          min={icon?.height}
          onChange={(v) => updateFrame(node.id, { height: v })}
        />
      </div>
    </div>
  );
}

function TransformField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <label className="transform-field">
      <span>{label}</span>
      <DraftNumberInput
        value={value}
        min={min}
        onChange={onChange}
      />
    </label>
  );
}

function LayoutGroup({
  node,
  updateLayout,
}: {
  node: WidgetNode;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
}) {
  const l = node.layout ?? { mode: "absolute" as LayoutMode };
  return (
    <div className="prop-group layout-group">
      <h4>Layout</h4>
      <InspectorCard title="Flow">
        <div className="prop-row">
          <label>mode</label>
          <CustomSelect
            ariaLabel="layout mode"
            value={l.mode}
            options={[
              { value: "absolute", label: "absolute" },
              { value: "row", label: "row" },
              { value: "column", label: "column" },
            ]}
            onChange={(value) => updateLayout(node.id, { mode: value as LayoutMode })}
          />
        </div>
        <div className="inline-grid-2">
          <NumberField
            label="padding"
            value={l.padding ?? 0}
            min={0}
            onChange={(v) => updateLayout(node.id, { padding: Math.max(0, v) })}
          />
          <NumberField
            label="gap"
            value={l.gap ?? 0}
            min={0}
            onChange={(v) => updateLayout(node.id, { gap: Math.max(0, v) })}
          />
        </div>
        <div className="prop-row">
          <label>align</label>
          <CustomSelect
            ariaLabel="layout align"
            value={l.align ?? "start"}
            options={["start", "center", "end", "stretch"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(value) =>
              updateLayout(node.id, {
                align: value as NonNullable<typeof l.align>,
              })
            }
          />
        </div>
        <p className="field-hint">Controls how children are arranged inside this container.</p>
      </InspectorCard>
    </div>
  );
}

function StyleGroup({
  node,
  palette,
  updateStyle,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
}) {
  const s = node.style ?? {};
  const defaultFillColor = node.type === "button" ? "#333333" : "#FFFFFF";
  const fillColor = s.background ?? { kind: "hex", value: defaultFillColor } satisfies ColorRef;
  const defaultBorderColor = "#FFFFFF";
  const borderColor = s.borderColor ?? { kind: "hex", value: defaultBorderColor } satisfies ColorRef;
  const fillEnabled = s.drawBackground !== false;
  const borderEnabled = Boolean(s.drawBorder);
  const showFill = node.type !== "label";
  const showText =
    node.type !== "screen" &&
    node.type !== "panel" &&
    node.type !== "label" &&
    node.type !== "button" &&
    node.type !== "rect";

  if (node.type === "icon") {
    return (
      <div className="prop-group appearance-group">
        <h4>Appearance</h4>
        <InspectorCard title="Icon color">
          <ColorField
            label="color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { textColor: v })}
          />
        </InspectorCard>
      </div>
    );
  }

  if (node.type === "line") {
    return (
      <div className="prop-group appearance-group">
        <h4>Appearance</h4>
        <InspectorCard title="Stroke">
          <ColorField
            label="color"
            value={borderColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { borderColor: v })}
          />
          <NumberField
            label="width"
            value={s.borderWidth ?? 1}
            min={1}
            onChange={(v) => updateStyle(node.id, { borderWidth: Math.max(1, v) })}
          />
        </InspectorCard>
      </div>
    );
  }

  return (
    <div className="prop-group appearance-group">
      <h4>Appearance</h4>
      {showFill ? (
        <InspectorCard
          title="Fill"
          checked={fillEnabled}
          onToggle={(checked) =>
            updateStyle(node.id, {
              drawBackground: checked,
              background: checked ? fillColor : s.background,
            })
          }
        >
          {fillEnabled ? (
            <ColorField
              label="color"
              value={fillColor}
              palette={palette}
              onChange={(v) => updateStyle(node.id, { background: v, drawBackground: true })}
            />
          ) : null}
        </InspectorCard>
      ) : null}
      <InspectorCard
        title="Border"
        checked={borderEnabled}
        onToggle={(checked) =>
          updateStyle(node.id, {
            drawBorder: checked,
            borderColor: checked ? borderColor : s.borderColor,
            borderWidth: checked ? Math.max(1, s.borderWidth ?? 1) : s.borderWidth,
          })
        }
      >
        {borderEnabled ? (
          <>
            <ColorField
              label="color"
              value={borderColor}
              palette={palette}
              onChange={(v) => updateStyle(node.id, { borderColor: v, drawBorder: true })}
            />
            <NumberField
              label="width"
              value={s.borderWidth ?? 1}
              min={1}
              onChange={(v) => updateStyle(node.id, { borderWidth: Math.max(1, v), drawBorder: true })}
            />
          </>
        ) : null}
      </InspectorCard>
      {showText ? (
        <InspectorCard title="Text">
          <ColorField
            label="color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { textColor: v })}
          />
        </InspectorCard>
      ) : null}
    </div>
  );
}

function InspectorCard({
  title,
  subtitle,
  checked,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  children: ReactNode;
}) {
  const titleContent = (
    <span className="inspector-card-title-stack">
      <span className="typography-card-title">{title}</span>
      {subtitle ? <small>{subtitle}</small> : null}
    </span>
  );

  return (
    <div className="inspector-card">
      {onToggle ? (
        <label className="inspector-card-head inspector-card-toggle">
          {titleContent}
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={(event) => onToggle(event.target.checked)}
          />
        </label>
      ) : (
        <div className="inspector-card-head">{titleContent}</div>
      )}
      {children}
    </div>
  );
}

function LabelGroup({
  node,
  palette,
  onChange,
  onStyleChange,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (patch: Partial<LabelProps>) => void;
  onStyleChange: (patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
}) {
  const p = (node.props ?? {}) as LabelProps;
  return (
    <div className="prop-group text-prop-group">
      <h4>Content</h4>
      <div className="text-field-stack">
        <label>text</label>
        <input
          aria-label="label text"
          type="text"
          value={p.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <TypographyCard
        props={p}
        style={node.style}
        palette={palette}
        backgroundDefaultEnabled={false}
        showBackground
        onPropsChange={(patch) => onChange(patch as Partial<LabelProps>)}
        onStyleChange={onStyleChange}
        align={p.align ?? "left"}
        onAlignChange={(align) => onChange({ align })}
      />
    </div>
  );
}

function ButtonGroup({
  node,
  palette,
  onChange,
  onStyleChange,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (patch: Partial<ButtonProps>) => void;
  onStyleChange: (patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
}) {
  const p = (node.props ?? {}) as ButtonProps;
  const paddingTop = p.paddingTop ?? p.paddingY ?? 0;
  const paddingRight = p.paddingRight ?? p.paddingX ?? 0;
  const paddingBottom = p.paddingBottom ?? p.paddingY ?? 0;
  const paddingLeft = p.paddingLeft ?? p.paddingX ?? 0;
  return (
    <div className="prop-group text-prop-group">
      <h4>Content</h4>
      <div className="text-field-stack">
        <label>text</label>
        <input
          aria-label="button text"
          type="text"
          value={p.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <TypographyCard
        props={p}
        style={node.style}
        palette={palette}
        backgroundDefaultEnabled
        showBackground={false}
        onPropsChange={(patch) => onChange(patch as Partial<ButtonProps>)}
        onStyleChange={onStyleChange}
        paddingControls={{
          horizontalAlign: p.horizontalAlign ?? "center",
          verticalAlign: p.verticalAlign ?? "center",
          top: paddingTop,
          right: paddingRight,
          bottom: paddingBottom,
          left: paddingLeft,
          onChange,
        }}
      />
    </div>
  );
}

function TypographyCard({
  props,
  style,
  palette,
  backgroundDefaultEnabled,
  showBackground = true,
  onPropsChange,
  onStyleChange,
  align,
  onAlignChange,
  paddingControls,
}: {
  props: Partial<LabelProps & ButtonProps>;
  style: WidgetNode["style"] | undefined;
  palette: { token: string; hex: string }[] | undefined;
  backgroundDefaultEnabled: boolean;
  showBackground?: boolean;
  onPropsChange: (patch: Partial<LabelProps & ButtonProps>) => void;
  onStyleChange: (patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
  align?: NonNullable<LabelProps["align"]>;
  onAlignChange?: (align: NonNullable<LabelProps["align"]>) => void;
  paddingControls?: {
    horizontalAlign: NonNullable<ButtonProps["horizontalAlign"]>;
    verticalAlign: NonNullable<ButtonProps["verticalAlign"]>;
    top: number;
    right: number;
    bottom: number;
    left: number;
    onChange: (patch: Partial<ButtonProps>) => void;
  };
}) {
  const s = style ?? {};
  const fillColor = s.background ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
  const fillEnabled = backgroundDefaultEnabled ? s.drawBackground !== false : Boolean(s.drawBackground);

  return (
    <div className="typography-card">
      <div className="typography-card-title">Typography</div>
      <FontFields props={props} onChange={onPropsChange} compact />
      {align && onAlignChange ? (
        <AlignIconGroup
          value={align}
          onChange={onAlignChange}
          wide
        />
      ) : null}
      {paddingControls ? (
        <InspectorCard title="Padding">
          <AlignIconGroup
            label="horizontal"
            value={paddingControls.horizontalAlign}
            onChange={(horizontalAlign) => paddingControls.onChange({ horizontalAlign })}
            wide
          />
          <VerticalAlignIconGroup
            value={paddingControls.verticalAlign}
            onChange={(verticalAlign) => paddingControls.onChange({ verticalAlign })}
          />
          <div className="padding-grid-4">
            <NumberField
              label="top"
              value={paddingControls.top}
              min={0}
              onChange={(v) => paddingControls.onChange({ paddingTop: Math.max(0, v) })}
            />
            <NumberField
              label="right"
              value={paddingControls.right}
              min={0}
              onChange={(v) => paddingControls.onChange({ paddingRight: Math.max(0, v) })}
            />
            <NumberField
              label="bottom"
              value={paddingControls.bottom}
              min={0}
              onChange={(v) => paddingControls.onChange({ paddingBottom: Math.max(0, v) })}
            />
            <NumberField
              label="left"
              value={paddingControls.left}
              min={0}
              onChange={(v) => paddingControls.onChange({ paddingLeft: Math.max(0, v) })}
            />
          </div>
        </InspectorCard>
      ) : null}
      <div className="typography-color-grid">
        <InspectorCard title="Text color">
          <ColorField
            label="color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => onStyleChange({ textColor: v })}
          />
        </InspectorCard>
        {showBackground ? (
          <InspectorCard
            title="Background"
            checked={fillEnabled}
            onToggle={(checked) =>
              onStyleChange({
                drawBackground: checked,
                background: checked ? fillColor : s.background,
              })
            }
          >
            {fillEnabled ? (
              <ColorField
                label="color"
                value={fillColor}
                palette={palette}
                onChange={(v) => onStyleChange({ background: v, drawBackground: true })}
              />
            ) : null}
          </InspectorCard>
        ) : null}
      </div>
    </div>
  );
}

function FontFields({
  props,
  onChange,
  compact = false,
}: {
  props: Partial<LabelProps & ButtonProps>;
  onChange: (patch: Partial<LabelProps & ButtonProps>) => void;
  compact?: boolean;
}) {
  const families = useMemo(() => getFontFamilyOptions(), []);
  const currentFace = findFontFace(props);
  const selectedFamily = props.fontFamily ?? currentFace.family;
  const selectedStyle = props.fontStyle ?? currentFace.style;
  const family = families.find((entry) => entry.family === selectedFamily) ?? families[0];
  const styleOptions = family?.styles.length ? family.styles : [currentFace.style];
  const facesForSelection = families.length > 0
    ? getFontSizes(selectedFamily, selectedStyle)
    : [currentFace.size];
  const selectedSize = props.fontSize ?? currentFace.size;

  if (compact) {
    return (
      <div className="font-fields-compact">
        <div className="prop-row">
          <label>font</label>
          <CustomSelect
            ariaLabel="font family"
            value={selectedFamily}
            options={families.map((entry) => ({ value: entry.family, label: entry.family }))}
            onChange={(value) => {
              const nextFamily = families.find((entry) => entry.family === value);
              const nextStyle = nextFamily?.styles.includes(selectedStyle) ? selectedStyle : nextFamily?.styles[0] ?? "regular";
              const nextSize = getFontSizes(value, nextStyle)[0] ?? currentFace.size;
              onChange({ fontFamily: value, fontStyle: nextStyle, fontSize: nextSize, fontFace: undefined });
            }}
          />
        </div>
        <div className="font-toolbar-row">
          <StyleIconGroup
            value={selectedStyle}
            availableStyles={styleOptions}
            onChange={(style) => {
              const availableSizes = getFontSizes(selectedFamily, style);
              const nextSize = availableSizes.includes(selectedSize) ? selectedSize : availableSizes[0] ?? selectedSize;
              onChange({ fontStyle: style, fontSize: nextSize, fontFace: undefined });
            }}
            compact
          />
          <div className="font-size-control">
            <label>size</label>
            <CustomSelect
              ariaLabel="font size"
              value={String(selectedSize)}
              options={facesForSelection.map((size) => ({ value: String(size), label: `${size}` }))}
              onChange={(value) => onChange({ fontSize: Number(value), fontFace: undefined })}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="prop-row">
        <label>font</label>
        <CustomSelect
          ariaLabel="font family"
          value={selectedFamily}
          options={families.map((entry) => ({ value: entry.family, label: entry.family }))}
          onChange={(value) => {
            const nextFamily = families.find((entry) => entry.family === value);
            const nextStyle = nextFamily?.styles.includes(selectedStyle) ? selectedStyle : nextFamily?.styles[0] ?? "regular";
            const nextSize = getFontSizes(value, nextStyle)[0] ?? currentFace.size;
            onChange({ fontFamily: value, fontStyle: nextStyle, fontSize: nextSize, fontFace: undefined });
          }}
        />
      </div>
      <StyleIconGroup
        value={selectedStyle}
        availableStyles={styleOptions}
        onChange={(style) => {
          const availableSizes = getFontSizes(selectedFamily, style);
          const nextSize = availableSizes.includes(selectedSize) ? selectedSize : availableSizes[0] ?? selectedSize;
          onChange({ fontStyle: style, fontSize: nextSize, fontFace: undefined });
        }}
      />
      <div className="prop-row">
        <label>size</label>
        <CustomSelect
          ariaLabel="font size"
          value={String(selectedSize)}
          options={facesForSelection.map((size) => ({ value: String(size), label: `${size}` }))}
          onChange={(value) => onChange({ fontSize: Number(value), fontFace: undefined })}
        />
      </div>
    </>
  );
}

function StyleIconGroup({
  value,
  availableStyles,
  onChange,
  compact = false,
}: {
  value: BitmapFontStyle;
  availableStyles: BitmapFontStyle[];
  onChange: (style: BitmapFontStyle) => void;
  compact?: boolean;
}) {
  const isBold = value === "bold" || value === "boldOblique";
  const isItalic = value === "oblique" || value === "boldOblique";
  const nextBold = styleFromFlags(!isBold, isItalic);
  const nextItalic = styleFromFlags(isBold, !isItalic);
  const buttons = (
    <IconButtonGroup ariaLabel="font style">
      <IconToggleButton
        label="Bold"
        active={isBold}
        disabled={!availableStyles.includes(nextBold)}
        onClick={() => onChange(nextBold)}
      >
        <FormatBoldIcon fontSize="inherit" />
      </IconToggleButton>
      <IconToggleButton
        label="Italic"
        active={isItalic}
        disabled={!availableStyles.includes(nextItalic)}
        onClick={() => onChange(nextItalic)}
      >
        <FormatItalicIcon fontSize="inherit" />
      </IconToggleButton>
    </IconButtonGroup>
  );

  if (compact) {
    return (
      <div className="font-style-control">
        <label>style</label>
        {buttons}
      </div>
    );
  }

  return (
    <div className="prop-row">
      <label>style</label>
      {buttons}
    </div>
  );
}

function AlignIconGroup({
  label = "align",
  value,
  onChange,
  wide = false,
}: {
  label?: string;
  value: NonNullable<LabelProps["align"]>;
  onChange: (align: NonNullable<LabelProps["align"]>) => void;
  wide?: boolean;
}) {
  return (
    <div className={`prop-row align-control-row${wide ? " align-control-row-wide" : ""}`}>
      <label>{label}</label>
      <IconButtonGroup ariaLabel="label align">
        <IconToggleButton label="Align left" active={value === "left"} onClick={() => onChange("left")}>
          <FormatAlignLeftIcon fontSize="inherit" />
        </IconToggleButton>
        <IconToggleButton label="Align center" active={value === "center"} onClick={() => onChange("center")}>
          <FormatAlignCenterIcon fontSize="inherit" />
        </IconToggleButton>
        <IconToggleButton label="Align right" active={value === "right"} onClick={() => onChange("right")}>
          <FormatAlignRightIcon fontSize="inherit" />
        </IconToggleButton>
      </IconButtonGroup>
    </div>
  );
}

function VerticalAlignIconGroup({
  value,
  onChange,
}: {
  value: NonNullable<ButtonProps["verticalAlign"]>;
  onChange: (align: NonNullable<ButtonProps["verticalAlign"]>) => void;
}) {
  return (
    <div className="prop-row align-control-row align-control-row-wide">
      <label>vertical</label>
      <IconButtonGroup ariaLabel="button vertical align">
        <IconToggleButton label="Align top" active={value === "top"} onClick={() => onChange("top")}>
          <VerticalAlignTopIcon fontSize="inherit" />
        </IconToggleButton>
        <IconToggleButton label="Align middle" active={value === "center"} onClick={() => onChange("center")}>
          <VerticalAlignCenterIcon fontSize="inherit" />
        </IconToggleButton>
        <IconToggleButton label="Align bottom" active={value === "bottom"} onClick={() => onChange("bottom")}>
          <VerticalAlignBottomIcon fontSize="inherit" />
        </IconToggleButton>
      </IconButtonGroup>
    </div>
  );
}

function IconButtonGroup({ ariaLabel, children }: { ariaLabel: string; children: ReactNode }) {
  return (
    <div className="icon-toggle-group" role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}

function IconToggleButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`icon-toggle${active ? " active" : ""}`}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function styleFromFlags(bold: boolean, italic: boolean): BitmapFontStyle {
  if (bold && italic) return "boldOblique";
  if (bold) return "bold";
  if (italic) return "oblique";
  return "regular";
}

function IconGroup({
  node,
  onChange,
}: {
  node: WidgetNode;
  onChange: (patch: Partial<IconProps>) => void;
}) {
  const p = (node.props ?? {}) as IconProps;
  const iconSearch = p.iconId ?? "";
  const normalizedIconSearch = iconSearch.trim().toLowerCase();
  const selectedGroup = useMemo(
    () => ICON_GROUPS.find(([, icons]) => icons.some((icon) => icon.id === p.iconId))?.[0] ?? "Transport & Places",
    [p.iconId],
  );
  const filteredIconGroups = useMemo(
    () =>
      normalizedIconSearch
        ? ICON_GROUPS.map(
            ([group, icons]) =>
              [
                group,
                icons.filter((icon) => icon.id.toLowerCase().includes(normalizedIconSearch)),
              ] as const,
          ).filter(([, icons]) => icons.length > 0)
        : ICON_GROUPS,
    [normalizedIconSearch],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [selectedGroup]: true,
  }));

  useEffect(() => {
    setOpenGroups((current) => ({
      ...current,
      [selectedGroup]: true,
    }));
  }, [node.id, selectedGroup]);

  return (
    <div className="prop-group">
      <h4>Icon Library</h4>
      <div className="prop-row">
        <label>iconId</label>
        <input
          type="search"
          placeholder="search or enter iconId"
          value={iconSearch}
          onChange={(e) => onChange({ iconId: e.target.value })}
        />
      </div>
      <div className="icon-browser">
        {filteredIconGroups.length > 0 ? filteredIconGroups.map(([group, icons]) => (
          <details
            key={group}
            className="icon-accordion"
            open={Boolean(openGroups[group]) || Boolean(normalizedIconSearch)}
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenGroups((current) =>
                current[group] === isOpen ? current : { ...current, [group]: isOpen },
              );
            }}
          >
            <summary>{group}</summary>
            <div className="icon-grid">
              {icons.map((icon) => {
                const isSelected = p.iconId === icon.id;
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => onChange({ iconId: icon.id })}
                    title={icon.id}
                    className={`icon-tile${isSelected ? " selected" : ""}`}
                  >
                    <div className="icon-tile-preview">
                      <IconGlyph iconId={icon.id} />
                    </div>
                    <span className="icon-tile-name">
                      {icon.id}
                    </span>
                    <span className="icon-tile-size">
                      {icon.width}x{icon.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        )) : (
          <p className="field-hint">No icons found for "{iconSearch}".</p>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="prop-row">
      <label>{label}</label>
      <DraftNumberInput
        value={value}
        min={min}
        max={max}
        onChange={onChange}
      />
    </div>
  );
}

function ColorField({
  label,
  value,
  palette,
  onChange,
}: {
  label: string;
  value: ColorRef | undefined;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (v: ColorRef | undefined) => void;
}) {
  const current = value ?? { kind: "hex", value: "#FFFFFF" };
  const mode = current.kind;
  return (
    <div className="prop-row color-field">
      <label>{label}</label>
      <div className="color-field-control">
        <div className={`color-mode-row${mode === "hex" ? "" : " full-width"}`}>
          <CustomSelect
            ariaLabel={`${label} mode`}
            value={mode}
            options={[
              { value: "hex", label: "hex" },
              { value: "token", label: "palette" },
            ]}
            onChange={(value) => {
              const kind = value as "hex" | "token";
              if (kind === "hex") return onChange({ kind: "hex", value: "#FFFFFF" });
              return onChange({
                kind: "token",
                token: palette?.[0]?.token ?? "fg",
              });
            }}
          />
        {mode === "hex" ? (
          <HexColorInput
            value={current.kind === "hex" ? current.value : "#FFFFFF"}
            onChange={(nextValue) => onChange({ kind: "hex", value: nextValue })}
          />
        ) : null}
        </div>
        {mode === "token" ? (
          <CustomSelect
            ariaLabel={`${label} token`}
            value={current.kind === "token" ? current.token : ""}
            options={(palette ?? []).map((p) => ({
              value: p.token,
              label: `${p.token} (${p.hex})`,
              color: p.hex,
            }))}
            onChange={(value) => onChange({ kind: "token", token: value })}
          />
        ) : null}
      </div>
    </div>
  );
}

function HexColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const latestRef = useRef(value);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(value);
    latestRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const commitLatest = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onChange(latestRef.current);
  };

  const scheduleChange = (nextValue: string) => {
    const normalized = nextValue.toUpperCase();
    setDraft(normalized);
    latestRef.current = normalized;

    if (timeoutRef.current !== null) return;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onChange(latestRef.current);
    }, 80);
  };

  return (
    <input
      type="color"
      value={draft}
      onChange={(event) => scheduleChange(event.target.value)}
      onBlur={commitLatest}
    />
  );
}
