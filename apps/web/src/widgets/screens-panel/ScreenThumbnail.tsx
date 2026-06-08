import type { UiProject } from "@entities/ui-project";
import { layoutTree } from "@entities/ui-project/lib/layoutEngine";
import { PreviewNode } from "@widgets/canvas-workspace/renderNode";

import styles from "./ScreenThumbnail.module.css";

/** Max preview cell — canvas scales to fit inside for any display aspect ratio. */
export const SCREEN_THUMB_MAX_WIDTH = 64;
export const SCREEN_THUMB_MAX_HEIGHT = 48;
/** Inset around the screen so orientation stays visible on all aspect ratios. */
export const SCREEN_THUMB_PADDING = 6;

export function ScreenThumbnail({
  project,
  screenId,
}: {
  project: UiProject;
  screenId: string;
}) {
  const screen = project.screens.find((item) => item.id === screenId) ?? project.screens[0];
  const layout = screen ? layoutTree(screen, project.display.width, project.display.height) : null;
  const { width: displayWidth, height: displayHeight } = project.display;
  const innerWidth = SCREEN_THUMB_MAX_WIDTH - SCREEN_THUMB_PADDING * 2;
  const innerHeight = SCREEN_THUMB_MAX_HEIGHT - SCREEN_THUMB_PADDING * 2;
  const scale = Math.min(innerWidth / displayWidth, innerHeight / displayHeight);
  const previewWidth = Math.max(1, Math.round(displayWidth * scale));
  const previewHeight = Math.max(1, Math.round(displayHeight * scale));

  return (
    <div
      className={styles.frame}
      style={{
        width: SCREEN_THUMB_MAX_WIDTH,
        height: SCREEN_THUMB_MAX_HEIGHT,
      }}
      data-testid="screen-thumbnail"
    >
      {layout ? (
        <div
          className={styles.screen}
          style={{
            width: previewWidth,
            height: previewHeight,
          }}
        >
          <div
            className={styles.scaled}
            style={{
              width: displayWidth,
              height: displayHeight,
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
        </div>
      ) : null}
    </div>
  );
}
