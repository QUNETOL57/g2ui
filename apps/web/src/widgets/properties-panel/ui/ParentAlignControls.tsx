import type { ReactNode } from "react";
import AlignHorizontalCenterIcon from "@mui/icons-material/AlignHorizontalCenter";
import AlignHorizontalLeftIcon from "@mui/icons-material/AlignHorizontalLeft";
import AlignHorizontalRightIcon from "@mui/icons-material/AlignHorizontalRight";
import AlignVerticalBottomIcon from "@mui/icons-material/AlignVerticalBottom";
import AlignVerticalCenterIcon from "@mui/icons-material/AlignVerticalCenter";
import AlignVerticalTopIcon from "@mui/icons-material/AlignVerticalTop";

import type {
  ParentAlignHorizontal,
  ParentAlignVertical,
} from "@entities/ui-project/lib/frameAlignment";
import { IconButton } from "@shared/ui/IconButton";

import styles from "../PropertiesPanel.module.css";

interface ParentAlignControlsProps {
  onHorizontalChange: (value: ParentAlignHorizontal) => void;
  onVerticalChange: (value: ParentAlignVertical) => void;
}

const horizontalOptions = [
  {
    value: "left" as const,
    label: "Align left in parent",
    tooltip: "Horizontal left",
    icon: AlignHorizontalLeftIcon,
  },
  {
    value: "center" as const,
    label: "Align center in parent",
    tooltip: "Horizontal center",
    icon: AlignHorizontalCenterIcon,
  },
  {
    value: "right" as const,
    label: "Align right in parent",
    tooltip: "Horizontal right",
    icon: AlignHorizontalRightIcon,
  },
];

const verticalOptions = [
  {
    value: "top" as const,
    label: "Align top in parent",
    tooltip: "Vertical top",
    icon: AlignVerticalTopIcon,
  },
  {
    value: "center" as const,
    label: "Align middle in parent",
    tooltip: "Vertical middle",
    icon: AlignVerticalCenterIcon,
  },
  {
    value: "bottom" as const,
    label: "Align bottom in parent",
    tooltip: "Vertical bottom",
    icon: AlignVerticalBottomIcon,
  },
];

export function ParentAlignControls({
  onHorizontalChange,
  onVerticalChange,
}: ParentAlignControlsProps) {
  return (
    <div className={styles.parentAlignButtons} role="toolbar" aria-label="Align in parent">
      {horizontalOptions.map(({ value, label, tooltip, icon: Icon }) => (
        <ParentAlignButton
          key={value}
          label={label}
          tooltip={tooltip}
          onClick={() => onHorizontalChange(value)}
        >
          <Icon fontSize="inherit" />
        </ParentAlignButton>
      ))}
      <span className={styles.parentAlignDivider} aria-hidden />
      {verticalOptions.map(({ value, label, tooltip, icon: Icon }) => (
        <ParentAlignButton
          key={value}
          label={label}
          tooltip={tooltip}
          onClick={() => onVerticalChange(value)}
        >
          <Icon fontSize="inherit" />
        </ParentAlignButton>
      ))}
    </div>
  );
}

function ParentAlignButton({
  label,
  tooltip,
  onClick,
  children,
}: {
  label: string;
  tooltip: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      className={styles.parentAlignButton}
      aria-label={label}
      tooltip={tooltip}
      onClick={onClick}
      onMouseUp={(event) => {
        event.currentTarget.blur();
      }}
    >
      {children}
    </IconButton>
  );
}
