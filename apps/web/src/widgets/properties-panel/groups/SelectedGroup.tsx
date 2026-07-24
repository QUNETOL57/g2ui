import type { WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";
import { LockToggleButton } from "@shared/ui/LockToggleButton";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";
import { WidgetTypeIcon } from "@widgets/canvas-workspace/toolbarIcons";

import styles from "../PropertiesPanel.module.css";

export function SelectedGroup({
  node,
  updateNode,
}: {
  node: WidgetNode;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
}) {
  const nameInputId = `selected-node-name-${node.id}`;
  const isLocked = node.locked === true;

  return (
    <div className={cn(styles.group, styles.summary)}>
      <span
        className={styles.typeIcon}
        role="img"
        aria-label={`${node.type} node`}
        title={node.type}
      >
        <WidgetTypeIcon type={node.type} size={16} />
      </span>
      <span className={styles.summaryId} title={node.id}>
        {node.id}
      </span>
      <div className={styles.summaryActions}>
        {node.type !== "screen" ? (
          <>
            <VisibilityToggleButton
              visible={node.visible !== false}
              label={node.name ?? node.id}
              onToggle={() => updateNode(node.id, { visible: node.visible === false })}
            />
            <LockToggleButton
              locked={isLocked}
              label={node.name ?? node.id}
              onToggle={() => updateNode(node.id, { locked: node.locked !== true })}
            />
          </>
        ) : (
          <span className={styles.summaryActionsSpacer} aria-hidden="true" />
        )}
      </div>
      <div className={cn(styles.row, styles.summaryNameRow)}>
        <label htmlFor={nameInputId}>name</label>
        <input
          id={nameInputId}
          type="text"
          className={styles.inputText}
          value={node.name ?? ""}
          placeholder={node.id}
          disabled={isLocked}
          onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
