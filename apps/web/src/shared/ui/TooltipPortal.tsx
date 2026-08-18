import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { placeTooltip, type TooltipAnchor } from "@shared/lib/placeTooltip";

import styles from "./TooltipPortal.module.css";

interface TooltipPortalProps {
  anchor: TooltipAnchor | null;
  children: ReactNode;
}

export function TooltipPortal({ anchor, children }: TooltipPortalProps) {
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (!anchor || !tooltipRef.current) {
      setReady(false);
      return;
    }
    const box = tooltipRef.current.getBoundingClientRect();
    setPos(
      placeTooltip(
        anchor,
        { width: box.width, height: box.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
    setReady(true);

    const relayout = () => {
      if (!tooltipRef.current) return;
      const nextBox = tooltipRef.current.getBoundingClientRect();
      setPos(
        placeTooltip(
          anchor,
          { width: nextBox.width, height: nextBox.height },
          { width: window.innerWidth, height: window.innerHeight },
        ),
      );
    };
    window.addEventListener("resize", relayout);
    window.addEventListener("scroll", relayout, true);
    return () => {
      window.removeEventListener("resize", relayout);
      window.removeEventListener("scroll", relayout, true);
    };
  }, [anchor, children]);

  if (!anchor) return null;

  return createPortal(
    <span
      ref={tooltipRef}
      role="tooltip"
      className={styles.tooltip}
      style={{ left: pos.left, top: pos.top, visibility: ready ? "visible" : "hidden" }}
    >
      {children}
    </span>,
    document.body,
  );
}
