import type { CSSProperties } from "react";

import type { UiProject } from "@entities/ui-project";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { PreviewNode } from "@widgets/canvas-workspace/renderNode";

export function ProjectPreview({
  project,
  compact = false,
}: {
  project: UiProject;
  compact?: boolean;
}) {
  const screen = project.screens.find((item) => item.id === project.initialScreenId) ?? project.screens[0];
  const layout = screen ? layoutTree(screen, project.display.width, project.display.height) : null;
  const maxWidth = compact ? 116 : 190;
  const maxHeight = compact ? 92 : 124;
  const scale = Math.min(maxWidth / project.display.width, maxHeight / project.display.height);
  const previewWidth = Math.max(1, Math.round(project.display.width * scale));
  const previewHeight = Math.max(1, Math.round(project.display.height * scale));
  const sizeLabelGap = compact ? 8 : 10;

  return (
    <div className={compact ? "project-preview is-compact" : "project-preview"}>
      <div
        className="project-preview-canvas"
        style={{
          width: maxWidth,
          height: maxHeight,
          "--preview-screen-width": `${previewWidth}px`,
          "--preview-screen-height": `${previewHeight}px`,
          "--preview-size-label-gap": `${sizeLabelGap}px`,
        } as CSSProperties}
      >
        <div className="project-preview-size-label project-preview-size-label-width">
          {project.display.width}
        </div>
        <div className="project-preview-size-label project-preview-size-label-height">
          {project.display.height}
        </div>
        <div
          className="project-preview-screen"
          style={{ width: previewWidth, height: previewHeight }}
        >
          {layout ? (
            <div
              className="project-preview-scaled-content"
              style={{
                width: project.display.width,
                height: project.display.height,
                transform: `scale(${scale})`,
              }}
            >
              <PreviewNode
                layoutNode={layout}
                ctx={{
                  palette: project.palette,
                  selectedId: null,
                  movableId: null,
                  dragPreview: null,
                  onSelect: () => undefined,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
