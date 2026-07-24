import { useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { WidgetNode } from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode, findParent } from "@entities/ui-project/model/tree-ops";
import { cn } from "@shared/lib/cn";
import { SectionTitle } from "@shared/ui/SectionTitle";
import { LockToggleButton } from "@shared/ui/LockToggleButton";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";
import { ChevronIcon, WidgetTypeIcon } from "@widgets/canvas-workspace/toolbarIcons";

import styles from "./TreePanel.module.css";

type DropPosition = "before" | "inside" | "after";
type TreeDropTarget = { nodeId: string; position: DropPosition } | null;
type SelectMods = { toggle?: boolean; range?: boolean };

function isCollapsiblePanel(node: WidgetNode) {
  return node.type === "panel" && (node.children?.length ?? 0) > 0;
}

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
  const updateNode = useEditorStore((s) => s.updateNode);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TreeDropTarget>(null);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());

  const screen = project.screens.find((s) => s.id === activeScreenId);

  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);

  const flatIds = useMemo(() => {
    const acc: string[] = [];
    const walk = (node: WidgetNode) => {
      acc.push(node.id);
      if (node.type === "panel" && collapsedIds.has(node.id)) return;
      (node.children ?? []).forEach(walk);
    };
    if (screen) walk(screen);
    return acc;
  }, [collapsedIds, screen]);

  useEffect(() => {
    if (!selectedNodeId || !screen) return;
    setCollapsedIds((prev) => {
      let next: Set<string> | null = null;
      let currentId: string | null = selectedNodeId;
      while (currentId) {
        const parent = findParent(project, currentId);
        if (!parent) break;
        if (prev.has(parent.id)) {
          if (!next) next = new Set(prev);
          next.delete(parent.id);
        }
        currentId = parent.id;
      }
      return next ?? prev;
    });
  }, [project, screen, selectedNodeId]);

  const toggleCollapsed = (nodeId: string) => {
    const node = findNode(project, nodeId);
    if (!node || node.type !== "panel") return;
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

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

    if (position === "inside" && collapsedIds.has(targetId)) {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }

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
            selectedSet={selectedSet}
            primaryId={selectedNodeId}
            collapsedIds={collapsedIds}
            onToggleCollapse={toggleCollapsed}
            onSelect={handleSelect}
            onLabelEdit={beginLabelTextEdit}
            onUpdateNode={updateNode}
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
  selectedSet,
  primaryId,
  collapsedIds,
  onToggleCollapse,
  onSelect,
  onLabelEdit,
  onUpdateNode,
  activeScreenId,
  draggedNodeId,
  dropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  node: WidgetNode;
  selectedSet: Set<string>;
  primaryId: string | null;
  collapsedIds: Set<string>;
  onToggleCollapse: (nodeId: string) => void;
  onSelect: (id: string, mods?: SelectMods) => void;
  onLabelEdit: (id: string) => void;
  onUpdateNode: (id: string, patch: Partial<WidgetNode>) => void;
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
  const isScreen = node.type === "screen";
  const isWidgetRow = node.id !== activeScreenId;
  const isDraggable = isWidgetRow && node.locked !== true;
  const children = node.children ?? [];
  const isCollapsible = isCollapsiblePanel(node);
  const expanded = isCollapsible && !collapsedIds.has(node.id);
  const showChildren = children.length > 0 && (node.type !== "panel" || !collapsedIds.has(node.id));
  const label = node.name ?? node.id;
  const dragOverClass =
    dropTarget?.nodeId === node.id
      ? dropTarget.position === "before"
        ? styles.rowDragOverBefore
        : dropTarget.position === "inside"
          ? styles.rowDragOverInside
          : styles.rowDragOverAfter
      : undefined;

  return (
    <div className={styles.treeItem}>
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
        data-tree-expanded={isCollapsible ? String(expanded) : undefined}
        aria-selected={isSelected}
        draggable={isDraggable}
        onClick={(event) =>
          onSelect(node.id, {
            toggle: event.metaKey || event.ctrlKey,
            range: event.shiftKey,
          })
        }
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (isCollapsible) {
            onToggleCollapse(node.id);
            return;
          }
          if (node.locked === true) return;
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
          if (!isWidgetRow || !dropTarget || dropTarget.nodeId !== node.id) return;
          event.preventDefault();
          event.stopPropagation();
          onDrop(node.id, dropTarget.position);
        }}
      >
        {isCollapsible ? (
          <button
            type="button"
            className={cn(styles.twistie, expanded && styles.twistieExpanded)}
            aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
            aria-expanded={expanded}
            data-testid="tree-node-twistie"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse(node.id);
            }}
          >
            <ChevronIcon size={12} />
          </button>
        ) : null}
        <span
          className={styles.typeIcon}
          role="img"
          aria-label={`${node.type} node`}
          title={node.type}
        >
          <WidgetTypeIcon type={node.type} size={16} />
        </span>
        <span className={styles.rowName}>{label}</span>
        <div className={styles.rowMeta}>
          <span className={styles.rowId}>{node.id}</span>
          {isWidgetRow ? (
            <div className={styles.rowVisibilitySlot}>
              <VisibilityToggleButton
                visible={node.visible !== false}
                label={label}
                onToggle={() =>
                  onUpdateNode(node.id, { visible: node.visible === false })
                }
              />
              <LockToggleButton
                locked={node.locked === true}
                label={label}
                onToggle={() =>
                  onUpdateNode(node.id, { locked: node.locked !== true })
                }
              />
            </div>
          ) : null}
        </div>
      </div>
      {showChildren ? (
        <div
          className={cn(styles.children, isScreen && styles.childrenRoot)}
          data-testid="tree-node-children"
        >
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedSet={selectedSet}
              primaryId={primaryId}
              collapsedIds={collapsedIds}
              onToggleCollapse={onToggleCollapse}
              onSelect={onSelect}
              onLabelEdit={onLabelEdit}
              onUpdateNode={onUpdateNode}
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
      ) : null}
    </div>
  );
}

function containsNode(node: WidgetNode, id: string): boolean {
  if (node.id === id) return true;
  return (node.children ?? []).some((child) => containsNode(child, id));
}
