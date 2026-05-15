import type { WidgetNode } from "@entities/ui-project";

export function SelectedGroup({
  node,
  updateNode,
}: {
  node: WidgetNode;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
}) {
  return (
    <div className="prop-group inspector-summary">
      <div className="inspector-title-row">
        <span className="type-pill">{node.type}</span>
        <span className="inspector-id" title={node.id}>
          {node.id}
        </span>
      </div>
      <div className="prop-row">
        <label>name</label>
        <input
          type="text"
          value={node.name ?? ""}
          placeholder={node.id}
          onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        />
      </div>
      <label className="visibility-toggle">
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
