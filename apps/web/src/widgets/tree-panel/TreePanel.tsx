import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { WidgetNode } from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode, findParent } from "@entities/ui-project/model/tree-ops";
import { cn } from "@shared/lib/cn";
import { SectionTitle } from "@shared/ui/SectionTitle";

import styles from "./TreePanel.module.css";

type DropPosition = "before" | "inside" | "after";
type TreeDropTarget = { nodeId: string; position: DropPosition } | null;
type SelectMods = { toggle?: boolean; range?: boolean };

export function TreePanel() {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const toggleNodeSelection = useEditorStore((s) => s.toggleNodeSelection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const moveNodeToParentIndex = useEditorStore((s) => s.moveNodeToParentIndex);
  const moveNodesToTarget = useEditorStore((s) => s.moveNodesToTarget);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TreeDropTarget>(null);

  const screen = project.screens.find((s) => s.id === activeScreenId);

  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const flatIds = useMemo(() => {
    const acc: string[] = [];
    const walk = (node: WidgetNode) => {
      acc.push(node.id);
      (node.children ?? []).forEach(walk);
    };
    if (screen) walk(screen);
    return acc;
  }, [screen]);

  const handleSelect = (id: string, mods?: SelectMods) => {
    if (mods?.range) {
      const anchor = selectedNodeId ?? id;
      const anchorIndex = flatIds.indexOf(anchor);
      const targetIndex = flatIds.indexOf(id);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [lo, hi] =
          anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        setSelection(flatIds.slice(lo, hi + 1), id);
        return;
      }
    }
    if (mods?.toggle) {
      toggleNodeSelection(id);
      return;
    }
    selectNode(id);
  };

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

  const resolveMovingIds = (sourceId: string) =>
    selectedNodeIds.length > 1 && selectedNodeIds.includes(sourceId) ? selectedNodeIds : [sourceId];

  const handleDrop = (targetId: string, position: DropPosition) => {
    const sourceId = draggedNodeId;
    setDraggedNodeId(null);
    setDropTarget(null);
    if (!sourceId) return;

    const movingIds = resolveMovingIds(sourceId);
    if (!movingIds.every((id) => canDrop(id, targetId, position))) return;

    if (movingIds.length > 1) {
      moveNodesToTarget(movingIds, targetId, position);
      return;
    }

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
    <div className={styles.panel} data-testid="tree-panel">
      <SectionTitle>Widget tree</SectionTitle>
      <div className={styles.list} data-testid="tree-panel-list">
        {screen ? (
          <TreeNode
            node={screen}
            depth={0}
            selectedSet={selectedSet}
            primaryId={selectedNodeId}
            onSelect={handleSelect}
            onLabelEdit={beginLabelTextEdit}
            activeScreenId={activeScreenId}
            draggedNodeId={draggedNodeId}
            dropTarget={dropTarget}
            onDragStart={(nodeId) => {
              setDraggedNodeId(nodeId);
              if (!(selectedNodeIds.length > 1 && selectedNodeIds.includes(nodeId))) {
                selectNode(nodeId);
              }
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
    </div>
  );
}

function TreeNode({
  node,
  depth,
  selectedSet,
  primaryId,
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
  selectedSet: Set<string>;
  primaryId: string | null;
  onSelect: (id: string, mods?: SelectMods) => void;
  onLabelEdit: (id: string) => void;
  activeScreenId: string;
  draggedNodeId: string | null;
  dropTarget: TreeDropTarget;
  onDragStart: (nodeId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, nodeId: string, position: DropPosition) => void;
  onDrop: (nodeId: string, position: DropPosition) => void;
}) {
  const isSelected = selectedSet.has(node.id);
  const isPrimary = primaryId === node.id;
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
          isPrimary && styles.rowPrimary,
          draggedNodeId === node.id && styles.rowDragging,
          dragOverClass,
        )}
        data-testid="tree-node-row"
        data-tree-node-id={node.id}
        data-tree-node-type={node.type}
        aria-selected={isSelected}
        style={{ paddingLeft: 4 + depth * 12 }}
        draggable={isDraggable}
        onClick={(event) =>
          onSelect(node.id, {
            toggle: event.metaKey || event.ctrlKey,
            range: event.shiftKey,
          })
        }
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (node.type === "label" || node.type === "button") onLabelEdit(node.id);
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
        <span className={styles.rowName}>{node.name ?? node.id}</span>
        <span className={styles.rowId}>{node.id}</span>
      </div>
      {(node.children ?? []).map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedSet={selectedSet}
          primaryId={primaryId}
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
