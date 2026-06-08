import type { WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

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
      <label className={styles.visibilityToggle}>
        <input
          type="checkbox"
          checked={node.visible !== false}
          onChange={(e) => updateNode(node.id, { visible: e.target.checked })}
        />
        Visible on canvas
      </label>
    </div>
  );
}
