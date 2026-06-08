import {
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@shared/lib/cn";

import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tooltip?: string;
}

export function IconButton({
  children,
  className,
  title,
  tooltip,
  type = "button",
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: IconButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const revealTooltip = useCallback(() => {
    const button = buttonRef.current;
    if (!button || !tooltip) return;
    const rect = button.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
    setTooltipVisible(true);
  }, [tooltip]);

  const hideTooltip = useCallback(() => {
    setTooltipVisible(false);
  }, []);

  const handleMouseEnter = (event: MouseEvent<HTMLButtonElement>) => {
    revealTooltip();
    onMouseEnter?.(event);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLButtonElement>) => {
    hideTooltip();
    onMouseLeave?.(event);
  };

  const handleFocus = (event: FocusEvent<HTMLButtonElement>) => {
    revealTooltip();
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLButtonElement>) => {
    hideTooltip();
    onBlur?.(event);
  };

  return (
    <>
      <button
        ref={buttonRef}
        className={cn(styles.iconButton, className)}
        title={tooltip ? undefined : title}
        type={type}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {children}
      </button>
      {tooltip && tooltipVisible
        ? createPortal(
            <span
              role="tooltip"
              className={styles.tooltipPortal}
              style={{ left: tooltipPos.x, top: tooltipPos.y }}
            >
              {tooltip}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}
