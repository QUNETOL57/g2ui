import type { ColorRef, WidgetNode } from "@entities/ui-project";
import { isCornersEnabled } from "@entities/ui-project/lib/style";
import { qrBoxSize, qrRenderedSize, normalizeQrProps } from "@entities/ui-project/lib/qrcode";
import type { QrCodeProps } from "@entities/ui-project/types";
import type { Frame } from "@entities/ui-project/types";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { useState, type ReactNode } from "react";
import { cn } from "@shared/lib/cn";
import { IconButton } from "@shared/ui/IconButton";
import { RangeSlider } from "@shared/ui/RangeSlider";
import { SectionTitle } from "@shared/ui/SectionTitle";

import styles from "../PropertiesPanel.module.css";
import { ColorField } from "../ui/ColorField";
import { InspectorCard } from "../ui/InspectorCard";
import { NumberField } from "../ui/NumberField";

function AppearanceSection({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const collapseAction = (
    <IconButton
      className={styles.sectionCollapseButton}
      onClick={() => setCollapsed((current) => !current)}
      aria-label={collapsed ? "Expand appearance section" : "Collapse appearance section"}
      title={collapsed ? "Expand appearance" : "Collapse appearance"}
      data-testid="appearance-collapse"
    >
      {collapsed ? (
        <ExpandLessOutlinedIcon fontSize="inherit" />
      ) : (
        <ExpandMoreOutlinedIcon fontSize="inherit" />
      )}
    </IconButton>
  );

  return (
    <div className={cn(styles.group, styles.appearanceGroup, styles.appearanceGroupCollapsible)}>
      <SectionTitle actions={collapseAction}>Appearance</SectionTitle>
      {!collapsed ? <div className={styles.appearanceGroupBody}>{children}</div> : null}
    </div>
  );
}

export function StyleGroup({
  node,
  palette,
  updateStyle,
  onFrameChange,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
  onFrameChange?: (id: string, frame: Frame) => void;
}) {
  const s = node.style ?? {};
  const isQrCode = node.type === "qrcode";
  const defaultFillColor = node.type === "button" ? "#333333" : "#FFFFFF";
  const fillColor = s.background ?? { kind: "hex", value: defaultFillColor } satisfies ColorRef;
  const defaultBorderColor = "#FFFFFF";
  const borderColor = s.borderColor ?? { kind: "hex", value: defaultBorderColor } satisfies ColorRef;
  const fillEnabled = s.drawBackground !== false;
  const borderEnabled = Boolean(s.drawBorder);
  const cornersEnabled = isCornersEnabled(s);
  const showFill = node.type !== "label";
  const showRadius = node.type === "button" || node.type === "panel" || node.type === "rect";
  const radius = Math.max(0, s.borderRadius ?? 0);
  const radiusMax = Math.max(
    1,
    radius,
    Math.floor(Math.min(node.frame?.width ?? 32, node.frame?.height ?? 32) / 2),
  );
  const radiusProgress = (radius / radiusMax) * 100;
  const showText =
    node.type !== "screen" &&
    node.type !== "panel" &&
    node.type !== "label" &&
    node.type !== "button" &&
    node.type !== "rect" &&
    node.type !== "circle" &&
    node.type !== "triangle" &&
    node.type !== "freehand";
  const textTitle = isQrCode ? "Background" : "Text";

  if (node.type === "icon") {
    return (
      <AppearanceSection>
        <InspectorCard title="Icon color">
          <ColorField
            label="color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { textColor: v })}
          />
        </InspectorCard>
      </AppearanceSection>
    );
  }

  if (node.type === "line" || node.type === "freehand") {
    return (
      <AppearanceSection>
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
      </AppearanceSection>
    );
  }

  if (node.type === "qrcode") {
    const fillColor = s.textColor ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
    const bgEnabled = s.drawBackground !== false;
    const bgColor = s.background ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
    const renderedSize = qrRenderedSize(
      normalizeQrProps((node.props ?? {}) as Partial<QrCodeProps>).version,
      normalizeQrProps((node.props ?? {}) as Partial<QrCodeProps>).size,
    );
    const setBorder = (nextWidth: number, checked: boolean) => {
      updateStyle(node.id, {
        drawBorder: checked,
        borderColor: checked ? borderColor : s.borderColor,
        borderWidth: checked ? Math.max(1, nextWidth) : s.borderWidth,
      });
      if (onFrameChange && node.frame) {
        const total = checked ? qrBoxSize(renderedSize, Math.max(1, nextWidth)) : renderedSize;
        onFrameChange(node.id, { ...node.frame, width: total, height: total });
      }
    };
    return (
      <AppearanceSection>
        <InspectorCard title="Fill">
          <ColorField
            label="color"
            value={fillColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { textColor: v })}
          />
        </InspectorCard>
        <InspectorCard
          title="Background"
          checked={bgEnabled}
          onToggle={(checked) =>
            updateStyle(node.id, {
              drawBackground: checked,
              background: checked ? bgColor : s.background,
            })
          }
        >
          {bgEnabled ? (
            <ColorField
              label="color"
              value={bgColor}
              palette={palette}
              onChange={(v) => updateStyle(node.id, { background: v, drawBackground: true })}
            />
          ) : null}
        </InspectorCard>
        <InspectorCard
          title="Border"
          checked={borderEnabled}
          onToggle={(checked) => setBorder(s.borderWidth ?? 1, checked)}
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
                onChange={(v) => setBorder(Math.max(1, v), true)}
              />
            </>
          ) : null}
        </InspectorCard>
      </AppearanceSection>
    );
  }

  return (
    <AppearanceSection>
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
      {showRadius ? (
        <InspectorCard
          title="Corners"
          checked={cornersEnabled}
          onToggle={(checked) =>
            updateStyle(node.id, {
              drawCorners: checked,
              borderRadius: checked ? radius : s.borderRadius,
            })
          }
        >
          {cornersEnabled ? (
            <div className={cn(styles.row, styles.radiusRow)}>
              <label htmlFor={`${node.id}-corner-radius`}>radius</label>
              <div className={styles.radiusControl}>
                <RangeSlider
                  aria-label="corner radius"
                  min={0}
                  max={radiusMax}
                  step={1}
                  value={radius}
                  progress={radiusProgress}
                  onChange={(event) =>
                    updateStyle(node.id, {
                      drawCorners: true,
                      borderRadius: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
                <input
                  id={`${node.id}-corner-radius`}
                  className={styles.inputText}
                  type="number"
                  min={0}
                  max={radiusMax}
                  value={radius}
                  onChange={(event) =>
                    updateStyle(node.id, {
                      drawCorners: true,
                      borderRadius: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </div>
            </div>
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
        <InspectorCard
          title={textTitle}
          checked={isQrCode ? fillEnabled : undefined}
          onToggle={
            isQrCode
              ? (checked) =>
                  updateStyle(node.id, {
                    drawBackground: checked,
                    background: checked ? fillColor : s.background,
                  })
              : undefined
          }
        >
          {!isQrCode || fillEnabled ? (
            <ColorField
              label="color"
              value={isQrCode ? fillColor : s.textColor}
              palette={palette}
              onChange={(v) =>
                updateStyle(node.id, isQrCode ? { background: v, drawBackground: true } : { textColor: v })
              }
            />
          ) : null}
        </InspectorCard>
      ) : null}
    </AppearanceSection>
  );
}
