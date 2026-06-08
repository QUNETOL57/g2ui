import { RangeSlider } from "@shared/ui/RangeSlider";

import styles from "./CanvasZoomToolbar.module.css";
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, formatZoomLabel } from "./lib/geometry";

interface CanvasZoomToolbarProps {
  zoom: number;
  zoomProgress: number;
  onZoomChange: (zoom: number) => void;
}

export function CanvasZoomToolbar({ zoom, zoomProgress, onZoomChange }: CanvasZoomToolbarProps) {
  return (
    <div className={styles.zoomToolbar} data-testid="canvas-zoom-toolbar" aria-label="Zoom">
      <RangeSlider
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={ZOOM_STEP}
        value={zoom}
        progress={zoomProgress}
        onChange={(e) => onZoomChange(Number(e.target.value))}
      />
      <span className={styles.zoomValue}>{formatZoomLabel(zoom)}</span>
    </div>
  );
}
