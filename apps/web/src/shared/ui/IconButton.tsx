import {
  useCallback,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import { cn } from "@shared/lib/cn";
import type { TooltipAnchor } from "@shared/lib/placeTooltip";
import { TooltipPortal } from "@shared/ui/TooltipPortal";

import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tooltip?: string;
  variant?: "default" | "ghost";
}

export function IconButton({
  children,
  className,
  title,
  tooltip,
  type = "button",
  variant = "default",
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: IconButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);

  const revealTooltip = useCallback(() => {
    const button = buttonRef.current;
    if (!button || !tooltip) return;
    const rect = button.getBoundingClientRect();
    setAnchor({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, [tooltip]);

  const hideTooltip = useCallback(() => {
    setAnchor(null);
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
        className={cn(styles.iconButton, variant === "ghost" && styles.iconButtonGhost, className)}
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
      {tooltip ? <TooltipPortal anchor={anchor}>{tooltip}</TooltipPortal> : null}
    </>
  );
}
