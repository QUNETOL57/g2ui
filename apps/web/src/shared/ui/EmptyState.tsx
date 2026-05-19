import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./EmptyState.module.css";

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function EmptyState({ children, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn(styles.emptyState, className)} {...props}>
      {children}
    </div>
  );
}
