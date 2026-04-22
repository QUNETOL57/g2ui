import type { WidgetNode, WidgetType } from "@guimintlab/ui-ir";
import { useEditorStore } from "../../store/editorStore";

const ADD_TYPES: WidgetType[] = ["panel", "label", "button", "icon", "rect", "line"];

export function TreePanel() {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const addWidget = useEditorStore((s) => s.addWidget);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const moveNode = useEditorStore((s) => s.moveNode);

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const parentForAdd = selectedNodeId ?? activeScreenId;

  return (
    <div>
      <div className="section-title">Widget tree</div>
      <div className="tree-add-bar">
        {ADD_TYPES.map((type) => (
          <button key={type} onClick={() => addWidget(parentForAdd, type)}>
            + {type}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button
            disabled={!selectedNodeId}
            onClick={() => selectedNodeId && moveNode(selectedNodeId, "up")}
            title="Move up"
          >
            ↑
          </button>
          <button
            disabled={!selectedNodeId}
            onClick={() => selectedNodeId && moveNode(selectedNodeId, "down")}
            title="Move down"
          >
            ↓
          </button>
          <button
            disabled={!selectedNodeId || selectedNodeId === activeScreenId}
            onClick={() => selectedNodeId && deleteNode(selectedNodeId)}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>
      {screen ? (
        <TreeNode
          node={screen}
          depth={0}
          selectedId={selectedNodeId}
          onSelect={selectNode}
        />
      ) : (
        <div style={{ padding: 10, color: "var(--muted)" }}>No active screen</div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: WidgetNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const isSelected = selectedId === node.id;
  return (
    <div>
      <div
        className={`tree-row${isSelected ? " selected" : ""}`}
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => onSelect(node.id)}
      >
        <span className="type-badge">{node.type}</span>
        <span>{node.name ?? node.id}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)" }}>{node.id}</span>
      </div>
      {(node.children ?? []).map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
