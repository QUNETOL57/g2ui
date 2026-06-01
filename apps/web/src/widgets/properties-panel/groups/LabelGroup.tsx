import type { LabelProps, WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";
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

  return (
    <div className={cn(styles.group, styles.textGroup)}>
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
