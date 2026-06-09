import type { WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";

import styles from "../PropertiesPanel.module.css";

export function SelectedGroup({
  node,
  updateNode,
}: {
  node: WidgetNode;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
}) {
  const nameInputId = `selected-node-name-${node.id}`;

  return (
    <div className={cn(styles.group, styles.summary)}>
      <span className={styles.typePill}>{node.type}</span>
      <span className={styles.summaryId} title={node.id}>
        {node.id}
      </span>
      <div className={styles.summaryActions}>
        {node.type !== "screen" ? (
          <VisibilityToggleButton
            visible={node.visible !== false}
            label={node.name ?? node.id}
            onToggle={() => updateNode(node.id, { visible: node.visible === false })}
          />
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
          onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
