import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { useState, type ReactNode } from "react";

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
  disabledContent?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function CollapsiblePanelCard({
  title,
  testId,
  defaultCollapsed = false,
  headerToggle,
  disabledContent,
  children,
  className,
}: CollapsiblePanelCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const enabled = headerToggle ? headerToggle.checked : true;
  const collapseLabel = collapsed ? `Expand ${title} section` : `Collapse ${title} section`;

  return (
    <div
      className={cn(styles.typographyCard, styles.collapsiblePanelCard, className)}
      data-testid={testId}
      data-collapsed={collapsed ? "true" : undefined}
    >
      <div className={cn(styles.collapsiblePanelHead, !collapsed && styles.collapsiblePanelHeadOpen)}>
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
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapseLabel}
            title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
            data-testid={testId ? `${testId}-collapse` : undefined}
          >
            {collapsed ? (
              <ExpandLessOutlinedIcon fontSize="inherit" />
            ) : (
              <ExpandMoreOutlinedIcon fontSize="inherit" />
            )}
          </IconButton>
        </div>
      </div>
      {!collapsed ? (
        <div className={styles.collapsiblePanelBody}>
          {enabled ? children : disabledContent}
        </div>
      ) : null}
    </div>
  );
}
