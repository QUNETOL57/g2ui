import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { cn } from "@shared/lib/cn";
import { ScreensPanel } from "@widgets/screens-panel/ScreensPanel";
import { TreePanel } from "@widgets/tree-panel/TreePanel";

import styles from "./LeftPanelLayout.module.css";

const MIN_SECTION_HEIGHT = 80;
const DEFAULT_WIDGET_FRACTION = 0.5;

export function LeftPanelLayout() {
  const shellRef = useRef<HTMLDivElement>(null);
  const [widgetFraction, setWidgetFraction] = useState(DEFAULT_WIDGET_FRACTION);
  const [screensCollapsed, setScreensCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const beginResize = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (event: MouseEvent) => {
      const shell = shellRef.current;
      if (!shell) return;
      const rect = shell.getBoundingClientRect();
      const total = rect.height;
      if (total <= MIN_SECTION_HEIGHT * 2) return;

      const offsetY = event.clientY - rect.top;
      const widgetHeight = Math.min(
        total - MIN_SECTION_HEIGHT,
        Math.max(MIN_SECTION_HEIGHT, offsetY),
      );
      setWidgetFraction(widgetHeight / total);
    };

    const handleUp = () => setIsResizing(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing]);

  const widgetFlex = screensCollapsed ? "1 1 auto" : `0 0 calc(${widgetFraction * 100}% - 0.5px)`;
  const screensFlex = screensCollapsed ? "0 0 auto" : `1 1 calc(${(1 - widgetFraction) * 100}% - 0.5px)`;

  return (
    <div className={styles.shell} ref={shellRef} data-testid="left-panel-layout">
      <div className={styles.widgetSection} style={{ flex: widgetFlex }} data-testid="widget-section">
        <TreePanel />
      </div>
      {!screensCollapsed ? (
        <div
          className={cn(styles.resizeHandle, isResizing && styles.resizeHandleActive)}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize widget tree and screens panels"
          data-testid="left-panel-resize-handle"
          onMouseDown={beginResize}
        />
      ) : null}
      <div
        className={cn(styles.screensSection, screensCollapsed && styles.screensSectionCollapsed)}
        style={{ flex: screensFlex }}
        data-testid="screens-section"
      >
        <ScreensPanel
          collapsed={screensCollapsed}
          onToggleCollapse={() => setScreensCollapsed((open) => !open)}
        />
      </div>
    </div>
  );
}
