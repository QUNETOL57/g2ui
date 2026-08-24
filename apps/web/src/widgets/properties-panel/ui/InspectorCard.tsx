import type { ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";

export function InspectorCard({
  title,
  subtitle,
  checked,
  onToggle,
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  children: ReactNode;
  testId?: string;
}) {
  const titleContent = (
    <span className={styles.inspectorCardTitleStack}>
      <span className={styles.typographyCardTitle}>{title}</span>
      {subtitle ? <small>{subtitle}</small> : null}
    </span>
  );

  return (
    <div className={styles.inspectorCard} data-testid={testId}>
      {onToggle ? (
        <label className={cn(styles.inspectorCardHead, styles.inspectorCardToggle)}>
          {titleContent}
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={(event) => onToggle(event.target.checked)}
          />
        </label>
      ) : (
        <div className={styles.inspectorCardHead}>{titleContent}</div>
      )}
      {children}
    </div>
  );
}
