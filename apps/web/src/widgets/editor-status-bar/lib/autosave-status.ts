import type { ComponentType } from "react";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";

import {
  formatAutosaveStatusLabel,
  type AutosaveStatus,
} from "@shared/lib/sync-status";

export type { AutosaveStatus } from "@shared/lib/sync-status";

const AUTOSAVE_STATUS_ICONS = {
  local: CloudOffOutlinedIcon,
  saved: CloudDoneOutlinedIcon,
  saving: SyncOutlinedIcon,
  unsynced: CloudSyncOutlinedIcon,
  error: ErrorOutlineOutlinedIcon,
} as const satisfies Record<
  AutosaveStatus,
  ComponentType<{ fontSize?: "small" | "inherit" }>
>;

export function autosaveStatusPresentation(
  status: AutosaveStatus,
  error: string | null,
): { label: string; Icon: ComponentType<{ fontSize?: "small" | "inherit" }> } {
  return {
    label: formatAutosaveStatusLabel(status, error),
    Icon: AUTOSAVE_STATUS_ICONS[status],
  };
}
