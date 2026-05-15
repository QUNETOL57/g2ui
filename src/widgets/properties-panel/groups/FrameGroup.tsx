import type { Frame, IconProps, WidgetNode } from "@entities/ui-project";
import { getResolvedIconDefinition } from "@entities/icon/iconSizing";
import { DraftNumberInput } from "@shared/ui/DraftNumberInput";

export function FrameGroup({
  node,
  draftFrame,
  updateFrame,
}: {
  node: WidgetNode;
  draftFrame: Frame | null;
  updateFrame: (id: string, patch: Partial<NonNullable<WidgetNode["frame"]>>) => void;
}) {
  const f = draftFrame ?? node.frame ?? { x: 0, y: 0, width: 0, height: 0 };
  const icon = node.type === "icon"
    ? getResolvedIconDefinition(((node.props ?? {}) as Partial<IconProps>).iconId)
    : null;
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
      <DraftNumberInput value={value} min={min} onChange={onChange} />
    </label>
  );
}
