import type { Frame } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import styles from "./CanvasRulers.module.css";
import { RULER_SIZE } from "./lib/geometry";

interface Tick {
  value: number;
  offset: number;
  major: boolean;
}

interface CanvasRulersProps {
  horizontalTicks: Tick[];
  verticalTicks: Tick[];
  scaledW: number;
  scaledH: number;
  renderZoom: number;
  selectionRect: Frame | null;
  showSelectionLabels: boolean;
}

export function CanvasRulers({
  horizontalTicks,
  verticalTicks,
  scaledW,
  scaledH,
  renderZoom,
  selectionRect,
  showSelectionLabels,
}: CanvasRulersProps) {
  return (
    <>
      <div
        className={styles.ruler}
        style={{ left: RULER_SIZE, top: 0, width: scaledW, height: RULER_SIZE }}
      >
        {horizontalTicks.map((tick) => (
          <div
            key={`top-${tick.value}`}
            className={cn(styles.tick, styles.tickHorizontal, tick.major && styles.major)}
            style={{ left: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className={cn(styles.label, styles.labelHorizontal)}
              style={{ left: Math.round(selectionRect.x * renderZoom) }}
            >
              {selectionRect.x}
            </div>
            <div
              className={cn(styles.label, styles.labelHorizontal)}
              style={{
                left: Math.round((selectionRect.x + selectionRect.width) * renderZoom),
              }}
            >
              {selectionRect.x + selectionRect.width}
            </div>
          </>
        ) : null}
      </div>

      <div
        className={styles.ruler}
        style={{ left: RULER_SIZE, top: RULER_SIZE + scaledH, width: scaledW, height: RULER_SIZE }}
      >
        {horizontalTicks.map((tick) => (
          <div
            key={`bottom-${tick.value}`}
            className={cn(
              styles.tick,
              styles.tickHorizontal,
              styles.tickHorizontalBottom,
              tick.major && styles.major,
            )}
            style={{ left: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className={cn(styles.label, styles.labelHorizontalBottom)}
              style={{ left: Math.round(selectionRect.x * renderZoom) }}
            >
              {selectionRect.x}
            </div>
            <div
              className={cn(styles.label, styles.labelHorizontalBottom)}
              style={{
                left: Math.round((selectionRect.x + selectionRect.width) * renderZoom),
              }}
            >
              {selectionRect.x + selectionRect.width}
            </div>
          </>
        ) : null}
      </div>

      <div
        className={styles.ruler}
        style={{ left: 0, top: RULER_SIZE, width: RULER_SIZE, height: scaledH }}
      >
        {verticalTicks.map((tick) => (
          <div
            key={`left-${tick.value}`}
            className={cn(styles.tick, styles.tickVertical, tick.major && styles.major)}
            style={{ top: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className={cn(styles.label, styles.labelVerticalLeft)}
              style={{ top: Math.round(selectionRect.y * renderZoom) }}
            >
              {selectionRect.y}
            </div>
            <div
              className={cn(styles.label, styles.labelVerticalLeft)}
              style={{
                top: Math.round((selectionRect.y + selectionRect.height) * renderZoom),
              }}
            >
              {selectionRect.y + selectionRect.height}
            </div>
          </>
        ) : null}
      </div>

      <div
        className={styles.ruler}
        style={{ left: RULER_SIZE + scaledW, top: RULER_SIZE, width: RULER_SIZE, height: scaledH }}
      >
        {verticalTicks.map((tick) => (
          <div
            key={`right-${tick.value}`}
            className={cn(
              styles.tick,
              styles.tickVertical,
              styles.tickVerticalRight,
              tick.major && styles.major,
            )}
            style={{ top: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className={cn(styles.label, styles.labelVerticalRight)}
              style={{ top: Math.round(selectionRect.y * renderZoom) }}
            >
              {selectionRect.y}
            </div>
            <div
              className={cn(styles.label, styles.labelVerticalRight)}
              style={{
                top: Math.round((selectionRect.y + selectionRect.height) * renderZoom),
              }}
            >
              {selectionRect.y + selectionRect.height}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
