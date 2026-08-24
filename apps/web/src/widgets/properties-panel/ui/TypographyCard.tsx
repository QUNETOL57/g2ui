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
import { Textarea } from "@shared/ui/Textarea";
import styles from "../PropertiesPanel.module.css";

import { ColorField } from "./ColorField";
import { CollapsiblePanelCard } from "./CollapsiblePanelCard";
import { InspectorCard } from "./InspectorCard";
import { NumberField } from "./NumberField";

interface TypographyCardProps {
  props: Partial<LabelProps & ButtonProps>;
  style: WidgetNode["style"] | undefined;
  palette: { token: string; hex: string }[] | undefined;
  backgroundDefaultEnabled: boolean;
  showBackground?: boolean;
  /** When true, color cards render as siblings outside the Typography card. */
  colorsOutside?: boolean;
  /** When true, padding card renders as a sibling outside the typography card. */
  paddingOutside?: boolean;
  /** When true, color/background are not rendered (caller owns Appearance). */
  omitColors?: boolean;
  /** When true, a two-line field edits `props.text` at the top of the card. */
  showTextField?: boolean;
  textFieldAriaLabel?: string;
  title?: string;
  headerToggle?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  disabledHint?: string;
  onPropsChange: (patch: Partial<LabelProps & ButtonProps>) => void;
  onStyleChange: (patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
  align?: NonNullable<LabelProps["align"]>;
  onAlignChange?: (align: NonNullable<LabelProps["align"]>) => void;
  verticalAlign?: NonNullable<LabelProps["verticalAlign"]>;
  onVerticalAlignChange?: (align: NonNullable<LabelProps["verticalAlign"]>) => void;
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
  colorsOutside = false,
  paddingOutside = false,
  omitColors = false,
  showTextField = false,
  textFieldAriaLabel = "text",
  title = "Typography",
  headerToggle,
  disabledHint,
  onPropsChange,
  onStyleChange,
  align,
  onAlignChange,
  verticalAlign,
  onVerticalAlignChange,
  paddingControls,
}: TypographyCardProps) {
  const s = style ?? {};
  const fillColor = s.background ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
  const fillEnabled = backgroundDefaultEnabled ? s.drawBackground !== false : Boolean(s.drawBackground);
  const contentEnabled = headerToggle ? headerToggle.checked : true;

  const paddingAlignFields = paddingControls ? (
    <>
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
    </>
  ) : null;

  const paddingFields = paddingControls ? (
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
  ) : null;

  const textColorField = (
    <ColorField
      label="color"
      value={s.textColor}
      palette={palette}
      onChange={(v) => onStyleChange({ textColor: v })}
    />
  );

  const backgroundCard = showBackground ? (
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
  ) : null;

  /** Sibling cards (label): keep Text color / Background as separate inspector cards. */
  const colorGridOutside = (
    <div className={styles.typographyColorGrid}>
      <InspectorCard title="Color">{textColorField}</InspectorCard>
      {backgroundCard}
    </div>
  );

  /** Button content: Color as a sibling card matching Icon / Text. */
  const colorCardOutside = (
    <div className={styles.typographyCard} data-testid="color-card">
      <div className={styles.typographyCardTitle}>Color</div>
      {textColorField}
    </div>
  );

  /** Button Text: nest Typography / Padding; Color may stay inside or move outside. */
  const nestedSections = Boolean(paddingControls) && !paddingOutside;
  const nestTypography = nestedSections || showTextField;

  const textField = showTextField ? (
    <Textarea
      aria-label={textFieldAriaLabel}
      className={styles.labelTextInput}
      rows={1}
      value={props.text ?? ""}
      onChange={(event) => onPropsChange({ text: event.target.value })}
    />
  ) : null;

  const fontBlock = (
    <>
      <FontFields props={props} onChange={onPropsChange} compact />
      {align && onAlignChange ? (
        <AlignIconGroup value={align} onChange={onAlignChange} wide />
      ) : null}
      {verticalAlign && onVerticalAlignChange ? (
        <VerticalAlignIconGroup value={verticalAlign} onChange={onVerticalAlignChange} />
      ) : null}
    </>
  );

  const body = nestTypography ? (
    <>
      {textField}
      <InspectorCard title="Typography">
        {fontBlock}
        {paddingAlignFields}
      </InspectorCard>
      {nestedSections ? (
        <>
          <InspectorCard title="Padding">{paddingFields}</InspectorCard>
          {omitColors || colorsOutside ? null : (
            <>
              <InspectorCard title="Color">{textColorField}</InspectorCard>
              {backgroundCard}
            </>
          )}
        </>
      ) : (
        <>
          {paddingOutside ? null : paddingFields}
          {omitColors || colorsOutside ? null : (
            <>
              {textColorField}
              {backgroundCard}
            </>
          )}
        </>
      )}
    </>
  ) : (
    <>
      {textField}
      {fontBlock}
      {paddingAlignFields}
      {paddingOutside ? null : paddingFields}
      {omitColors || colorsOutside ? null : (
        <>
          {textColorField}
          {backgroundCard}
        </>
      )}
    </>
  );

  return (
    <>
      {headerToggle || showTextField ? (
        <CollapsiblePanelCard
          title={title}
          testId="typography-card"
          headerToggle={headerToggle}
          disabledContent={
            <p className={styles.fieldHint}>
              {disabledHint ?? "Enable text to edit typography and layout."}
            </p>
          }
        >
          {body}
        </CollapsiblePanelCard>
      ) : (
        <InspectorCard title={title} testId="typography-card">
          {body}
        </InspectorCard>
      )}
      {contentEnabled && paddingOutside ? (
        <InspectorCard title="Padding">{paddingFields}</InspectorCard>
      ) : null}
      {omitColors
        ? null
        : colorsOutside
          ? showBackground
            ? colorGridOutside
            : colorCardOutside
          : null}
    </>
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
            size="sm"
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
              size="sm"
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
          size="sm"
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
          size="sm"
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
  value: NonNullable<LabelProps["verticalAlign"] | ButtonProps["verticalAlign"]>;
  onChange: (align: NonNullable<LabelProps["verticalAlign"]>) => void;
}) {
  return (
    <div className={cn(styles.row, styles.alignRowWide)}>
      <label>vertical</label>
      <IconButtonGroup ariaLabel="vertical align">
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
