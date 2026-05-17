import { useMemo, type ReactNode } from "react";
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
  LabelProps,
  WidgetNode,
} from "@entities/ui-project";
import { findFontFace, getFontFamilyOptions, getFontSizes } from "@entities/font/fontLibrary";
import type { BitmapFontStyle } from "@entities/font/fontTypes";
import { cn } from "@shared/lib/cn";
import { CustomSelect } from "@shared/ui/CustomSelect";

import styles from "../PropertiesPanel.module.css";

import { ColorField } from "./ColorField";
import { InspectorCard } from "./InspectorCard";
import { NumberField } from "./NumberField";

interface TypographyCardProps {
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
}

export function TypographyCard({
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
}: TypographyCardProps) {
  const s = style ?? {};
  const fillColor = s.background ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
  const fillEnabled = backgroundDefaultEnabled ? s.drawBackground !== false : Boolean(s.drawBackground);

  return (
    <div className={styles.typographyCard}>
      <div className={styles.typographyCardTitle}>Typography</div>
      <FontFields props={props} onChange={onPropsChange} compact />
      {align && onAlignChange ? (
        <AlignIconGroup value={align} onChange={onAlignChange} wide />
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
          <div className={styles.paddingGrid4}>
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
      <div className={styles.typographyColorGrid}>
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
      <div className={styles.fontFieldsCompact}>
        <div className={styles.row}>
          <label>font</label>
          <CustomSelect
            ariaLabel="font family"
            value={selectedFamily}
            options={families.map((entry) => ({ value: entry.family, label: entry.family }))}
            onChange={(value) => {
              const nextFamily = families.find((entry) => entry.family === value);
              const nextStyle = nextFamily?.styles.includes(selectedStyle)
                ? selectedStyle
                : nextFamily?.styles[0] ?? "regular";
              const nextSize = getFontSizes(value, nextStyle)[0] ?? currentFace.size;
              onChange({ fontFamily: value, fontStyle: nextStyle, fontSize: nextSize, fontFace: undefined });
            }}
          />
        </div>
        <div className={styles.fontToolbarRow}>
          <StyleIconGroup
            value={selectedStyle}
            availableStyles={styleOptions}
            onChange={(style) => {
              const availableSizes = getFontSizes(selectedFamily, style);
              const nextSize = availableSizes.includes(selectedSize)
                ? selectedSize
                : availableSizes[0] ?? selectedSize;
              onChange({ fontStyle: style, fontSize: nextSize, fontFace: undefined });
            }}
            compact
          />
          <div className={styles.fontSizeControl}>
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
      <div className={styles.row}>
        <label>font</label>
        <CustomSelect
          ariaLabel="font family"
          value={selectedFamily}
          options={families.map((entry) => ({ value: entry.family, label: entry.family }))}
          onChange={(value) => {
            const nextFamily = families.find((entry) => entry.family === value);
            const nextStyle = nextFamily?.styles.includes(selectedStyle)
              ? selectedStyle
              : nextFamily?.styles[0] ?? "regular";
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
          const nextSize = availableSizes.includes(selectedSize)
            ? selectedSize
            : availableSizes[0] ?? selectedSize;
          onChange({ fontStyle: style, fontSize: nextSize, fontFace: undefined });
        }}
      />
      <div className={styles.row}>
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
      <div className={styles.fontStyleControl}>
        <label>style</label>
        {buttons}
      </div>
    );
  }

  return (
    <div className={styles.row}>
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
    <div className={cn(styles.row, wide && styles.alignRowWide)}>
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
    <div className={cn(styles.row, styles.alignRowWide)}>
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
    <div className={styles.iconToggleGroup} role="group" aria-label={ariaLabel}>
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
      className={cn(styles.iconToggle, active && styles.iconToggleActive)}
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
