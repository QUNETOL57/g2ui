import type { CSSProperties } from "react";

import type { UiProject } from "@entities/ui-project";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { cn } from "@shared/lib/cn";
import { PreviewNode } from "@widgets/canvas-workspace/renderNode";

import styles from "./ProjectPreview.module.css";

type PreviewSize = "default" | "compact" | "mini" | "sidebar";

const PREVIEW_BOUNDS: Record<PreviewSize, { width: number; height: number; labelGap: number }> = {
  default: { width: 190, height: 124, labelGap: 10 },
  compact: { width: 116, height: 92, labelGap: 8 },
  mini: { width: 72, height: 54, labelGap: 4 },
  sidebar: { width: 236, height: 120, labelGap: 0 },
};

export function ProjectPreview({
  project,
  screenId,
  compact = false,
  size,
  showSizeLabels = true,
}: {
  project: UiProject;
  screenId?: string;
  compact?: boolean;
  size?: PreviewSize;
  showSizeLabels?: boolean;
}) {
  const resolvedScreenId = screenId ?? project.screens[0]?.id;
  const screen = project.screens.find((item) => item.id === resolvedScreenId) ?? project.screens[0];
  const layout = screen ? layoutTree(screen, project.display.width, project.display.height) : null;
  const previewSize = size ?? (compact ? "compact" : "default");
  const bounds = PREVIEW_BOUNDS[previewSize];
  const maxWidth = bounds.width;
  const maxHeight = bounds.height;
  const scale = Math.min(maxWidth / project.display.width, maxHeight / project.display.height);
  const previewWidth = Math.max(1, Math.round(project.display.width * scale));
  const previewHeight = Math.max(1, Math.round(project.display.height * scale));
  const sizeLabelGap = bounds.labelGap;
  const canvasWidth = previewSize === "sidebar" ? previewWidth : maxWidth;
  const canvasHeight = previewSize === "sidebar" ? previewHeight : maxHeight;

  return (
    <div
      className={cn(
        styles.preview,
        previewSize === "compact" && styles.previewCompact,
        previewSize === "mini" && styles.previewMini,
        previewSize === "sidebar" && styles.previewSidebar,
      )}
    >
      <div
        className={cn(styles.canvas, previewSize === "sidebar" && styles.canvasSidebar)}
        style={{
          width: canvasWidth,
          height: canvasHeight,
          "--preview-screen-width": `${previewWidth}px`,
          "--preview-screen-height": `${previewHeight}px`,
          "--preview-size-label-gap": `${sizeLabelGap}px`,
        } as CSSProperties}
      >
        {showSizeLabels ? (
          <>
            <div className={cn(styles.sizeLabel, styles.sizeLabelWidth)}>
              {project.display.width}
            </div>
            <div className={cn(styles.sizeLabel, styles.sizeLabelHeight)}>
              {project.display.height}
            </div>
          </>
        ) : null}
        <div
          className={styles.screen}
          style={{ width: previewWidth, height: previewHeight }}
        >
          {layout ? (
            <div
              className={styles.scaledContent}
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
