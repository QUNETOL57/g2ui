import { useMemo } from "react";

import { draftFrameFor } from "@entities/ui-project";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { EmptyState } from "@shared/ui/EmptyState";
import { SectionTitle } from "@shared/ui/SectionTitle";
import { findParentLayoutNode } from "@widgets/canvas-workspace/lib/layoutNodeOps";

import { ButtonGroup } from "./groups/ButtonGroup";
import { FrameGroup } from "./groups/FrameGroup";
import { IconGroup } from "./groups/IconGroup";
import { LabelGroup } from "./groups/LabelGroup";
import { LayoutGroup } from "./groups/LayoutGroup";
import { MarkerGroup } from "./groups/MarkerGroup";
import { QrCodeGroup } from "./groups/QrCodeGroup";
import { SelectedGroup } from "./groups/SelectedGroup";
import { StyleGroup } from "./groups/StyleGroup";
import { EditorShortcutsList } from "./ui/EditorShortcutsList";

import styles from "./PropertiesPanel.module.css";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const activeTool = useEditorStore((s) => s.activeTool);
  const markerStyle = useEditorStore((s) => s.markerStyle);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const draftFrames = useEditorStore((s) => s.draftFrames);
  const updateNode = useEditorStore((s) => s.updateNode);
  const renameNode = useEditorStore((s) => s.renameNode);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const updateProps = useEditorStore((s) => s.updateProps);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const updateMarkerStyle = useEditorStore((s) => s.updateMarkerStyle);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const copySelectedNodes = useEditorStore((s) => s.copySelectedNodes);
  const duplicateSelectedNodes = useEditorStore((s) => s.duplicateSelectedNodes);
  const rotateSelectedNodes = useEditorStore((s) => s.rotateSelectedNodes);

  const node = useMemo(
    () => (selectedNodeId ? findNode(project, selectedNodeId) : null),
    [project, selectedNodeId],
  );

  /** draftFrames are stored in absolute canvas space; Transform fields need parent-local. */
  const localDraftFrame = useMemo(() => {
    if (!node) return null;
    const absolute = draftFrameFor(draftFrames, node.id);
    if (!absolute) return null;
    const screen = project.screens.find((entry) => entry.id === activeScreenId) ?? project.screens[0];
    if (!screen) return absolute;
    const layout = layoutTree(screen, project.display.width, project.display.height);
    const parentLayout = findParentLayoutNode(layout, node.id);
    if (!parentLayout) return absolute;
    return {
      ...absolute,
      x: absolute.x - parentLayout.rect.x,
      y: absolute.y - parentLayout.rect.y,
    };
  }, [activeScreenId, draftFrames, node, project.display.height, project.display.width, project.screens]);

  if (selectedNodeIds.length > 1) {
    return (
      <>
        <SectionTitle>Properties · selection</SectionTitle>
        <div className={styles.multiSummary}>
          <p className={styles.multiCount}>Выбрано {selectedNodeIds.length} элементов</p>
          <div className={styles.multiActions}>
            <button type="button" className={styles.multiAction} onClick={() => deleteNodes(selectedNodeIds)}>
              Delete
            </button>
            <button type="button" className={styles.multiAction} onClick={() => copySelectedNodes()}>
              Copy
            </button>
            <button type="button" className={styles.multiAction} onClick={() => duplicateSelectedNodes()}>
              Duplicate
            </button>
            <button type="button" className={styles.multiAction} onClick={() => rotateSelectedNodes(1)}>
              Rotate
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!selectedNodeId) {
    if (activeTool === "marker") {
      return (
        <>
          <SectionTitle>Properties · marker</SectionTitle>
          <MarkerGroup
            markerStyle={markerStyle}
            palette={project.palette}
            onChange={updateMarkerStyle}
          />
        </>
      );
    }

    return (
      <>
        <SectionTitle>Properties</SectionTitle>
        <EmptyState>Select a widget in the tree or canvas.</EmptyState>
        <EditorShortcutsList />
      </>
    );
  }

  if (!node) return null;

  const isLocked = node.locked === true;

  return (
    <>
      <SectionTitle>Properties · {node.type}</SectionTitle>

      <SelectedGroup node={node} updateNode={updateNode} renameNode={renameNode} />

      {node.type !== "screen" ? (
        <FrameGroup
          node={node}
          project={project}
          draftFrame={localDraftFrame}
          updateFrame={updateFrame}
          updateNode={updateNode}
          disabled={isLocked}
        />
      ) : null}

      <div
        aria-disabled={isLocked || undefined}
        style={isLocked ? { pointerEvents: "none", opacity: 0.55 } : undefined}
      >
        {node.type === "icon" ? (
          <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />
        ) : null}

        {node.type === "label" && (
          <LabelGroup
            node={node}
            palette={project.palette}
            onChange={(patch) => updateProps(node.id, patch)}
            onStyleChange={(patch) => updateStyle(node.id, patch)}
          />
        )}
        {node.type === "button" && (
          <ButtonGroup
            node={node}
            palette={project.palette}
            onChange={(patch) => updateProps(node.id, patch)}
            onStyleChange={(patch) => updateStyle(node.id, patch)}
          />
        )}
        {node.type === "icon" && (
          <IconGroup node={node} onChange={(patch) => updateProps(node.id, patch)} />
        )}
        {node.type === "qrcode" && (
          <QrCodeGroup
            node={node}
            onChange={(patch) => updateProps(node.id, patch)}
            onFrameChange={(frame) => updateFrame(node.id, frame)}
          />
        )}

        {(node.type === "screen" || node.type === "panel") && (
          <LayoutGroup node={node} updateLayout={updateLayout} />
        )}

        {node.type !== "icon" && node.type !== "label" ? (
          <StyleGroup
            node={node}
            palette={project.palette}
            updateStyle={updateStyle}
            onFrameChange={(id, frame) => updateFrame(id, frame)}
          />
        ) : null}
      </div>
    </>
  );
}
