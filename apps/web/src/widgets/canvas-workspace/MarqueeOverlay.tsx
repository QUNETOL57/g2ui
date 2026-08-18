import type { Frame } from "@entities/ui-project";

import styles from "./MarqueeOverlay.module.css";

interface MarqueeOverlayProps {
  rect: Frame;
  renderZoom: number;
}

export function MarqueeOverlay({ rect, renderZoom }: MarqueeOverlayProps) {
  return (
    <div
      className={styles.marquee}
      data-testid="canvas-marquee"
      style={{
        left: Math.round(rect.x * renderZoom),
        top: Math.round(rect.y * renderZoom),
        width: Math.max(1, Math.round(rect.width * renderZoom)),
        height: Math.max(1, Math.round(rect.height * renderZoom)),
      }}
    />
  );
}
