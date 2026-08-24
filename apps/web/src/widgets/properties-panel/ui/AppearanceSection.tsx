import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { useState, type ReactNode } from "react";

import { cn } from "@shared/lib/cn";
import { IconButton } from "@shared/ui/IconButton";
import { SectionTitle } from "@shared/ui/SectionTitle";

import styles from "../PropertiesPanel.module.css";

export function CollapsibleInspectorSection({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const titleKey = title.toLowerCase();

  const collapseAction = (
    <IconButton
      className={styles.sectionCollapseButton}
      onClick={() => setCollapsed((current) => !current)}
      aria-label={collapsed ? `Expand ${titleKey} section` : `Collapse ${titleKey} section`}
      title={collapsed ? `Expand ${titleKey}` : `Collapse ${titleKey}`}
      data-testid={testId}
    >
      {collapsed ? (
        <ExpandLessOutlinedIcon fontSize="inherit" />
      ) : (
        <ExpandMoreOutlinedIcon fontSize="inherit" />
      )}
    </IconButton>
  );

  return (
    <div className={cn(styles.group, styles.appearanceGroup, styles.appearanceGroupCollapsible)}>
      <SectionTitle actions={collapseAction}>{title}</SectionTitle>
      {!collapsed ? <div className={styles.appearanceGroupBody}>{children}</div> : null}
    </div>
  );
}

export function AppearanceSection({ children }: { children: ReactNode }) {
  return (
    <CollapsibleInspectorSection title="Appearance" testId="appearance-collapse">
      {children}
    </CollapsibleInspectorSection>
  );
}
