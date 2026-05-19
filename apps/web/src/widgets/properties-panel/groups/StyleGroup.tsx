import type { ColorRef, WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";
import { ColorField } from "../ui/ColorField";
import { InspectorCard } from "../ui/InspectorCard";
import { NumberField } from "../ui/NumberField";

export function StyleGroup({
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
      <div className={cn(styles.group, styles.appearanceGroup)}>
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
      <div className={cn(styles.group, styles.appearanceGroup)}>
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
    <div className={cn(styles.group, styles.appearanceGroup)}>
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
