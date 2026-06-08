import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./TopBar.module.css";

interface TopBarProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function TopBar({ children, className, ...props }: TopBarProps) {
  return (
    <header className={cn(styles.topBar, className)} {...props}>
      {children}
    </header>
  );
}

TopBar.Meta = function TopBarMeta({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.meta, className)} {...props}>
      {children}
    </div>
  );
};

TopBar.Controls = function TopBarControls({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(styles.controls, className)} {...props}>
      {children}
    </div>
  );
};
