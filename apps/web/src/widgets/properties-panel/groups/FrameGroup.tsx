import { useMemo } from "react";

import type { Frame, IconProps, UiProject, WidgetNode } from "@entities/ui-project";
import {
  alignFrameInParent,
  canAlignFrameInParent,
  parentContentBounds,
  type ParentAlignHorizontal,
  type ParentAlignVertical,
} from "@entities/ui-project/lib/frameAlignment";
import { getResolvedIconDefinition } from "@entities/icon/iconSizing";
import { findParent } from "@entities/ui-project/model/tree-ops";
import { DraftNumberInput } from "@shared/ui/DraftNumberInput";

import styles from "../PropertiesPanel.module.css";
import { ParentAlignControls } from "../ui/ParentAlignControls";

export function FrameGroup({
  node,
  project,
  draftFrame,
  updateFrame,
  updateNode,
  disabled = false,
}: {
  node: WidgetNode;
  project: UiProject;
  draftFrame: Frame | null;
  updateFrame: (id: string, patch: Partial<NonNullable<WidgetNode["frame"]>>) => void;
  updateNode?: (id: string, patch: Partial<WidgetNode>) => void;
  disabled?: boolean;
}) {
  const f = draftFrame ?? node.frame ?? { x: 0, y: 0, width: 0, height: 0 };
  const canRotate = ["rect", "circle", "triangle", "line", "freehand"].includes(node.type);
  const icon = node.type === "icon"
    ? getResolvedIconDefinition(((node.props ?? {}) as Partial<IconProps>).iconId)
    : null;

  const parent = useMemo(() => findParent(project, node.id), [project, node.id]);
  const canAlignInParent = canAlignFrameInParent(parent);
  const parentBounds = useMemo(
    () => (parent ? parentContentBounds(parent, project) : null),
    [parent, project],
  );

  const applyHorizontalAlign = (horizontal: ParentAlignHorizontal) => {
    if (disabled || !parentBounds) return;
    const { x } = alignFrameInParent(f, parentBounds, horizontal, "top");
    updateFrame(node.id, { x });
  };

  const applyVerticalAlign = (vertical: ParentAlignVertical) => {
    if (disabled || !parentBounds) return;
    const { y } = alignFrameInParent(f, parentBounds, "left", vertical);
    updateFrame(node.id, { y });
  };

  return (
    <div className={styles.group} aria-disabled={disabled || undefined}>
      <h4>Transform</h4>
      <div className={styles.transformGrid}>
        <TransformField
          label="X"
          value={f.x}
          disabled={disabled}
          onChange={(v) => updateFrame(node.id, { x: v })}
        />
        <TransformField
          label="Y"
          value={f.y}
          disabled={disabled}
          onChange={(v) => updateFrame(node.id, { y: v })}
        />
        <TransformField
          label="W"
          value={f.width}
          min={icon?.width}
          disabled={disabled}
          onChange={(v) => updateFrame(node.id, { width: v })}
        />
        <TransformField
          label="H"
          value={f.height}
          min={icon?.height}
          disabled={disabled}
          onChange={(v) => updateFrame(node.id, { height: v })}
        />
        {canRotate && updateNode ? (
          <TransformField
            label="R"
            value={node.rotation ?? 0}
            disabled={disabled}
            onChange={(v) => updateNode(node.id, { rotation: normalizeRotation(v) })}
          />
        ) : null}
      </div>
      {canAlignInParent && parentBounds ? (
        <ParentAlignControls
          disabled={disabled}
          onHorizontalChange={applyHorizontalAlign}
          onVerticalChange={applyVerticalAlign}
        />
      ) : null}
    </div>
  );
}

function normalizeRotation(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function TransformField({
  label,
  value,
  onChange,
  min,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  disabled?: boolean;
}) {
  return (
    <label className={styles.transformField}>
      <span>{label}</span>
      <DraftNumberInput
        value={value}
        min={min}
        disabled={disabled}
        onChange={onChange}
        variant="bare"
      />
    </label>
  );
}
