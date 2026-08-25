import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@shared/lib/cn";
import { IconButton } from "@shared/ui/IconButton";

import styles from "../PropertiesPanel.module.css";

interface CollapsiblePanelCardProps {
  title: string;
  testId?: string;
  defaultCollapsed?: boolean;
  headerToggle?: {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
  children: ReactNode;
  className?: string;
}

export function CollapsiblePanelCard({
  title,
  testId,
  defaultCollapsed = false,
  headerToggle,
  children,
  className,
}: CollapsiblePanelCardProps) {
  const enabled = headerToggle ? headerToggle.checked : true;
  const [collapsed, setCollapsed] = useState(defaultCollapsed || !enabled);
  const isOpen = enabled && !collapsed;
  const collapseLabel = isOpen ? `Collapse ${title} section` : `Expand ${title} section`;

  useEffect(() => {
    setCollapsed(!enabled);
  }, [enabled]);

  return (
    <div
      className={cn(styles.typographyCard, styles.collapsiblePanelCard, className)}
      data-testid={testId}
      data-collapsed={isOpen ? undefined : "true"}
    >
      <div className={cn(styles.collapsiblePanelHead, isOpen && styles.collapsiblePanelHeadOpen)}>
        <div className={styles.typographyCardTitle}>{title}</div>
        <div className={styles.collapsiblePanelActions}>
          {headerToggle ? (
            <label className={styles.visibilityToggle}>
              <input
                type="checkbox"
                aria-label={headerToggle.label}
                title={headerToggle.label}
                checked={headerToggle.checked}
                onChange={(event) => headerToggle.onChange(event.target.checked)}
              />
            </label>
          ) : null}
          <IconButton
            className={styles.sectionCollapseButton}
            onClick={() => {
              if (!enabled) return;
              setCollapsed((current) => !current);
            }}
            aria-label={collapseLabel}
            title={isOpen ? `Collapse ${title}` : `Expand ${title}`}
            data-testid={testId ? `${testId}-collapse` : undefined}
          >
            {isOpen ? (
              <ExpandMoreOutlinedIcon fontSize="inherit" />
            ) : (
              <ExpandLessOutlinedIcon fontSize="inherit" />
            )}
          </IconButton>
        </div>
      </div>
      {isOpen ? <div className={styles.collapsiblePanelBody}>{children}</div> : null}
    </div>
  );
}
