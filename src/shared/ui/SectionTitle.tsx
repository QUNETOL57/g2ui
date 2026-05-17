import type { ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./SectionTitle.module.css";

interface SectionTitleProps {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "h4" | "div" | "summary";
}

export function SectionTitle({ children, className, as: Tag = "div" }: SectionTitleProps) {
  return <Tag className={cn(styles.title, className)}>{children}</Tag>;
}

interface SidebarDisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SidebarDisclosure({
  summary,
  children,
  defaultOpen,
  className,
}: SidebarDisclosureProps) {
  return (
    <details className={cn(styles.disclosure, className)} open={defaultOpen}>
      <summary className={styles.title}>{summary}</summary>
      {children}
    </details>
  );
}
