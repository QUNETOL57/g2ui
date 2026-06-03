import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { WidgetNode, WidgetType } from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode, findParent } from "@entities/ui-project/model/tree-ops";
import { cn } from "@shared/lib/cn";
import { SectionTitle } from "@shared/ui/SectionTitle";

import styles from "./TreePanel.module.css";

const ADD_TYPES: WidgetType[] = ["panel", "label", "button", "icon", "rect", "line"];
type DropPosition = "before" | "inside" | "after";
type TreeDropTarget = { nodeId: string; position: DropPosition } | null;

export function TreePanel() {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectNode = useEditorStore((s) => s.selectNode);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const addWidget = useEditorStore((s) => s.addWidget);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const moveNode = useEditorStore((s) => s.moveNode);
  const moveNodeToParentIndex = useEditorStore((s) => s.moveNodeToParentIndex);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TreeDropTarget>(null);

  const screen = project.screens.find((s) => s.id === activeScreenId);
  const selectedNode = useMemo(
    () => (selectedNodeId ? findNode(project, selectedNodeId) : null),
    [project, selectedNodeId],
  );
  const parentForAdd =
    selectedNode?.type === "screen" || selectedNode?.type === "panel"
      ? selectedNode.id
      : activeScreenId;

  const canDrop = (sourceId: string | null, targetId: string, position: DropPosition) => {
    if (!sourceId || sourceId === targetId || sourceId === activeScreenId) {
      return false;
    }
    const source = findNode(project, sourceId);
    const target = findNode(project, targetId);
    if (!source || !target || containsNode(source, targetId)) return false;

    if (position === "inside") {
      return target.type === "screen" || target.type === "panel";
    }

    const targetParent = findParent(project, targetId);
    return !!targetParent && !containsNode(source, targetParent.id);
  };

  const handleDrop = (targetId: string, position: DropPosition) => {
    const sourceId = draggedNodeId;
    setDraggedNodeId(null);
    setDropTarget(null);
    if (!sourceId || !canDrop(sourceId, targetId, position)) return;

    if (position === "inside") {
      const target = findNode(project, targetId);
      moveNodeToParentIndex(sourceId, targetId, target?.children?.length ?? 0);
      selectNode(sourceId);
      return;
    }

    const targetParent = findParent(project, targetId);
    if (!targetParent?.children) return;
    const targetIndex = targetParent.children.findIndex((child) => child.id === targetId);
    if (targetIndex < 0) return;
    moveNodeToParentIndex(sourceId, targetParent.id, position === "before" ? targetIndex : targetIndex + 1);
    selectNode(sourceId);
  };

  return (
    <div>
      <SectionTitle>Widget tree</SectionTitle>
      <div className={styles.addBar}>
        {ADD_TYPES.map((type) => (
          <button key={type} onClick={() => addWidget(parentForAdd, type)}>
            + {type}
          </button>
        ))}
        <div className={styles.addBarSpacer}>
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
          onLabelEdit={beginLabelTextEdit}
          activeScreenId={activeScreenId}
          draggedNodeId={draggedNodeId}
          dropTarget={dropTarget}
          onDragStart={(nodeId) => {
            setDraggedNodeId(nodeId);
            selectNode(nodeId);
          }}
          onDragEnd={() => {
            setDraggedNodeId(null);
            setDropTarget(null);
          }}
          onDragOver={(event, nodeId, position) => {
            if (!canDrop(draggedNodeId, nodeId, position)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropTarget({ nodeId, position });
          }}
          onDrop={handleDrop}
        />
      ) : (
        <div className={styles.emptyScreen}>No active screen</div>
      )}
    </div>
  );
}

function TreeNode({
  node,
  depth,
  selectedId,
  onSelect,
  onLabelEdit,
  activeScreenId,
  draggedNodeId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  node: WidgetNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLabelEdit: (id: string) => void;
  activeScreenId: string;
  draggedNodeId: string | null;
  dropTarget: TreeDropTarget;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, nodeId: string, position: DropPosition) => void;
  onDrop: (nodeId: string, position: DropPosition) => void;
}) {
  const isSelected = selectedId === node.id;
  const isDraggable = node.id !== activeScreenId;
  const dragOverClass =
    dropTarget?.nodeId === node.id
      ? dropTarget.position === "before"
        ? styles.rowDragOverBefore
        : dropTarget.position === "inside"
          ? styles.rowDragOverInside
          : styles.rowDragOverAfter
      : undefined;
  return (
    <div>
      <div
        className={cn(
          styles.row,
          isSelected && styles.rowSelected,
          draggedNodeId === node.id && styles.rowDragging,
          dragOverClass,
        )}
        data-testid="tree-node-row"
        data-tree-node-id={node.id}
        data-tree-node-type={node.type}
        style={{ paddingLeft: 10 + depth * 14 }}
        draggable={isDraggable}
        onClick={() => onSelect(node.id)}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (node.type === "label") onLabelEdit(node.id);
        }}
        onDragStart={(event) => {
          if (!isDraggable) return;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", node.id);
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const offsetY = event.clientY - rect.top;
          const position: DropPosition =
            node.type === "screen"
              ? "inside"
              : node.type === "panel" && offsetY >= rect.height * 0.25 && offsetY <= rect.height * 0.75
                ? "inside"
                : offsetY < rect.height / 2
                  ? "before"
                  : "after";
          onDragOver(event, node.id, position);
        }}
        onDrop={(event) => {
          if (!isDraggable || !dropTarget || dropTarget.nodeId !== node.id) return;
          event.preventDefault();
          event.stopPropagation();
          onDrop(node.id, dropTarget.position);
        }}
      >
        <span className={styles.typeBadge}>{node.type}</span>
        <span>{node.name ?? node.id}</span>
        <span className={styles.rowId}>{node.id}</span>
      </div>
      {(node.children ?? []).map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
          onLabelEdit={onLabelEdit}
          activeScreenId={activeScreenId}
          draggedNodeId={draggedNodeId}
          dropTarget={dropTarget}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDrop={onDrop}
        />
      ))}
    </div>
  );
}

function containsNode(node: WidgetNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((child) => containsNode(child, id));
}
