import { useMemo } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { EmptyState } from "@shared/ui/EmptyState";
import { SectionTitle } from "@shared/ui/SectionTitle";

import { ButtonGroup } from "./groups/ButtonGroup";
import { FrameGroup } from "./groups/FrameGroup";
import { IconGroup } from "./groups/IconGroup";
import { LabelGroup } from "./groups/LabelGroup";
import { LayoutGroup } from "./groups/LayoutGroup";
import { MarkerGroup } from "./groups/MarkerGroup";
import { SelectedGroup } from "./groups/SelectedGroup";
import { StyleGroup } from "./groups/StyleGroup";
import { EditorShortcutsList } from "./ui/EditorShortcutsList";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const activeTool = useEditorStore((s) => s.activeTool);
  const markerStyle = useEditorStore((s) => s.markerStyle);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const draftFrame = useEditorStore((s) => s.draftFrame);
  const updateNode = useEditorStore((s) => s.updateNode);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const updateProps = useEditorStore((s) => s.updateProps);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const updateMarkerStyle = useEditorStore((s) => s.updateMarkerStyle);

  const node = useMemo(
    () => (selectedNodeId ? findNode(project, selectedNodeId) : null),
    [project, selectedNodeId],
  );

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

  return (
    <>
      <SectionTitle>Properties · {node.type}</SectionTitle>

      <SelectedGroup node={node} updateNode={updateNode} />

      {node.type !== "screen" ? (
        <FrameGroup
          node={node}
          project={project}
          draftFrame={draftFrame?.nodeId === node.id ? draftFrame.frame : null}
          updateFrame={updateFrame}
          updateNode={updateNode}
        />
      ) : null}

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

      {(node.type === "screen" || node.type === "panel") && (
        <LayoutGroup node={node} updateLayout={updateLayout} />
      )}

      {node.type !== "icon" && node.type !== "label" ? (
        <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />
      ) : null}
    </>
  );
}
