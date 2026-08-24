import type { ColorRef, LabelProps, WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";
import { AppearanceSection } from "../ui/AppearanceSection";
import { ColorField } from "../ui/ColorField";
import { InspectorCard } from "../ui/InspectorCard";
import { TypographyCard } from "../ui/TypographyCard";

export function LabelGroup({
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
  const s = node.style ?? {};
  const fillColor = s.background ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
  const fillEnabled = Boolean(s.drawBackground);

  return (
    <>
      <div className={cn(styles.group, styles.textGroup, styles.textGroupCollapsible)}>
        <div className={styles.textGroupBody}>
          <TypographyCard
            title="Text"
            props={p}
            style={node.style}
            palette={palette}
            backgroundDefaultEnabled={false}
            showBackground
            omitColors
            showTextField
            textFieldAriaLabel="label text"
            onPropsChange={(patch) => onChange(patch as Partial<LabelProps>)}
            onStyleChange={onStyleChange}
            align={p.align ?? "left"}
            onAlignChange={(align) => onChange({ align })}
            verticalAlign={p.verticalAlign ?? "top"}
            onVerticalAlignChange={(verticalAlign) => onChange({ verticalAlign })}
          />
        </div>
      </div>
      <AppearanceSection>
        <InspectorCard title="Color">
          <ColorField
            label="color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => onStyleChange({ textColor: v })}
          />
        </InspectorCard>
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
      </AppearanceSection>
    </>
  );
}
