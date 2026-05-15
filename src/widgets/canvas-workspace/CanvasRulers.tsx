import type { Frame } from "@entities/ui-project";

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
        className="canvas-ruler canvas-ruler-top"
        style={{ left: RULER_SIZE, top: 0, width: scaledW, height: RULER_SIZE }}
      >
        {horizontalTicks.map((tick) => (
          <div
            key={`top-${tick.value}`}
            className={`canvas-ruler-tick horizontal ${tick.major ? "major" : ""}`}
            style={{ left: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className="canvas-ruler-label horizontal"
              style={{ left: Math.round(selectionRect.x * renderZoom) }}
            >
              {selectionRect.x}
            </div>
            <div
              className="canvas-ruler-label horizontal"
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
        className="canvas-ruler canvas-ruler-bottom"
        style={{ left: RULER_SIZE, top: RULER_SIZE + scaledH, width: scaledW, height: RULER_SIZE }}
      >
        {horizontalTicks.map((tick) => (
          <div
            key={`bottom-${tick.value}`}
            className={`canvas-ruler-tick horizontal bottom ${tick.major ? "major" : ""}`}
            style={{ left: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className="canvas-ruler-label horizontal bottom"
              style={{ left: Math.round(selectionRect.x * renderZoom) }}
            >
              {selectionRect.x}
            </div>
            <div
              className="canvas-ruler-label horizontal bottom"
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
        className="canvas-ruler canvas-ruler-left"
        style={{ left: 0, top: RULER_SIZE, width: RULER_SIZE, height: scaledH }}
      >
        {verticalTicks.map((tick) => (
          <div
            key={`left-${tick.value}`}
            className={`canvas-ruler-tick vertical ${tick.major ? "major" : ""}`}
            style={{ top: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className="canvas-ruler-label vertical left"
              style={{ top: Math.round(selectionRect.y * renderZoom) }}
            >
              {selectionRect.y}
            </div>
            <div
              className="canvas-ruler-label vertical left"
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
        className="canvas-ruler canvas-ruler-right"
        style={{ left: RULER_SIZE + scaledW, top: RULER_SIZE, width: RULER_SIZE, height: scaledH }}
      >
        {verticalTicks.map((tick) => (
          <div
            key={`right-${tick.value}`}
            className={`canvas-ruler-tick vertical right ${tick.major ? "major" : ""}`}
            style={{ top: tick.offset }}
          />
        ))}
        {showSelectionLabels && selectionRect ? (
          <>
            <div
              className="canvas-ruler-label vertical right"
              style={{ top: Math.round(selectionRect.y * renderZoom) }}
            >
              {selectionRect.y}
            </div>
            <div
              className="canvas-ruler-label vertical right"
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
