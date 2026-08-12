import type { LayoutMode, WidgetNode } from "@entities/ui-project";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { useState } from "react";
import { cn } from "@shared/lib/cn";
import { CustomSelect } from "@shared/ui/CustomSelect";
import { IconButton } from "@shared/ui/IconButton";
import { SectionTitle } from "@shared/ui/SectionTitle";
import styles from "../PropertiesPanel.module.css";
import { InspectorCard } from "../ui/InspectorCard";
import { NumberField } from "../ui/NumberField";

export function LayoutGroup({
  node,
  updateLayout,
}: {
  node: WidgetNode;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
}) {
  const l = node.layout ?? { mode: "absolute" as LayoutMode };
  const [collapsed, setCollapsed] = useState(false);

  const collapseAction = (
    <IconButton
      className={styles.sectionCollapseButton}
      onClick={() => setCollapsed((c) => !c)}
      aria-label={collapsed ? "Expand layout section" : "Collapse layout section"}
      title={collapsed ? "Expand layout" : "Collapse layout"}
      data-testid="layout-collapse"
    >
      {collapsed ? (
        <ExpandLessOutlinedIcon fontSize="inherit" />
      ) : (
        <ExpandMoreOutlinedIcon fontSize="inherit" />
      )}
    </IconButton>
  );

  return (
    <div className={cn(styles.group, styles.layoutGroupCollapsible)}>
      <SectionTitle actions={collapseAction}>Layout</SectionTitle>
      {!collapsed ? (
        <div className={styles.layoutGroupBody}>
      <InspectorCard title="Flow">
        <div className={styles.row}>
          <label>mode</label>
          <CustomSelect
            ariaLabel="layout mode"
            size="sm"
            value={l.mode}
            options={[
              { value: "absolute", label: "absolute" },
              { value: "row", label: "row" },
              { value: "column", label: "column" },
            ]}
            onChange={(value) => updateLayout(node.id, { mode: value as LayoutMode })}
          />
        </div>
        <div className={styles.inlineGrid2}>
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
        <div className={styles.row}>
          <label>align</label>
          <CustomSelect
            ariaLabel="layout align"
            size="sm"
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
        <p className={styles.fieldHint}>Controls how children are arranged inside this container.</p>
      </InspectorCard>
        </div>
      ) : null}
    </div>
  );
}
