import { useMemo, type ReactNode } from "react";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import RotateRightIcon from "@mui/icons-material/RotateRight";

import type { Frame, IconProps, UiProject, WidgetNode } from "@entities/ui-project";
import {
  alignFrameInParent,
  canAlignFrameInParent,
  parentContentBounds,
  type ParentAlignHorizontal,
  type ParentAlignVertical,
} from "@entities/ui-project/lib/frameAlignment";
import {
  isRotatableShapeType,
  rotateBy90,
  snapRotation90,
} from "@entities/ui-project/lib/rotation";
import { getResolvedIconDefinition } from "@entities/icon/iconSizing";
import { findParent } from "@entities/ui-project/model/tree-ops";
import { DraftNumberInput } from "@shared/ui/DraftNumberInput";
import { IconButton } from "@shared/ui/IconButton";

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
  const canRotate = isRotatableShapeType(node.type);
  const rotation = snapRotation90(node.rotation ?? 0);
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

  const applyRotation = (next: number) => {
    if (disabled || !updateNode) return;
    updateNode(node.id, { rotation: snapRotation90(next) });
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
      </div>
      {canAlignInParent && parentBounds ? (
        <ParentAlignControls
          disabled={disabled}
          trailing={
            canRotate && updateNode ? (
              <RotateButtons
                disabled={disabled}
                onRotateCounterClockwise={() => applyRotation(rotateBy90(rotation, -1))}
                onRotateClockwise={() => applyRotation(rotateBy90(rotation, 1))}
              />
            ) : undefined
          }
          onHorizontalChange={applyHorizontalAlign}
          onVerticalChange={applyVerticalAlign}
        />
      ) : canRotate && updateNode ? (
        <div className={styles.parentAlignButtons} role="toolbar" aria-label="Rotate shape">
          <RotateButtons
            disabled={disabled}
            onRotateCounterClockwise={() => applyRotation(rotateBy90(rotation, -1))}
            onRotateClockwise={() => applyRotation(rotateBy90(rotation, 1))}
          />
        </div>
      ) : null}
    </div>
  );
}

function RotateButtons({
  disabled,
  onRotateCounterClockwise,
  onRotateClockwise,
}: {
  disabled?: boolean;
  onRotateCounterClockwise: () => void;
  onRotateClockwise: () => void;
}) {
  return (
    <div role="group" aria-label="Rotate shape" className={styles.inlineButtonGroup}>
      <RotateButton
        label="Rotate 90° counter-clockwise"
        tooltip="Rotate −90°"
        disabled={disabled}
        onClick={onRotateCounterClockwise}
      >
        <RotateLeftIcon fontSize="inherit" />
      </RotateButton>
      <RotateButton
        label="Rotate 90° clockwise"
        tooltip="Rotate +90°"
        disabled={disabled}
        onClick={onRotateClockwise}
      >
        <RotateRightIcon fontSize="inherit" />
      </RotateButton>
    </div>
  );
}

function RotateButton({
  label,
  tooltip,
  onClick,
  children,
  disabled = false,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <IconButton
      className={styles.parentAlignButton}
      aria-label={label}
      tooltip={tooltip}
      disabled={disabled}
      onClick={onClick}
      onMouseUp={(event) => {
        event.currentTarget.blur();
      }}
    >
      {children}
    </IconButton>
  );
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
