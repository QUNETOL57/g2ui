import type { LayoutMode, WidgetNode } from "@entities/ui-project";
import { CustomSelect } from "@shared/ui/CustomSelect";

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
