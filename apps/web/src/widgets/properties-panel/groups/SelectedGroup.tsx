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
  return (
    <div className={cn(styles.group, styles.summary)}>
      <div className={styles.summaryTitleRow}>
        <span className={styles.typePill}>{node.type}</span>
        <span className={styles.summaryId} title={node.id}>
          {node.id}
        </span>
        <VisibilityToggleButton
          className={styles.summaryVisibility}
          visible={node.visible !== false}
          label={node.name ?? node.id}
          onToggle={() => updateNode(node.id, { visible: node.visible === false })}
        />
      </div>
      <div className={styles.row}>
        <label>name</label>
        <input
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
