import type { ButtonProps, WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";
import { TypographyCard } from "../ui/TypographyCard";

export function ButtonGroup({
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
    <div className={cn(styles.group, styles.textGroup)}>
      <h4>Content</h4>
      <div className={styles.textFieldStack}>
        <label>text</label>
        <input
          aria-label="button text"
          type="text"
          className={styles.inputText}
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
