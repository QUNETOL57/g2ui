import type { ComponentType } from "react";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloudSyncOutlinedIcon from "@mui/icons-material/CloudSyncOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";

export type AutosaveStatus = "local" | "saved" | "saving" | "unsynced" | "error";

export function autosaveStatusPresentation(
  status: AutosaveStatus,
  error: string | null,
): { label: string; Icon: ComponentType<{ fontSize?: "small" | "inherit" }> } {
  if (status === "local") {
    return { label: "Local draft", Icon: CloudOffOutlinedIcon };
  }
  if (status === "saved") {
    return { label: "Saved", Icon: CloudDoneOutlinedIcon };
  }
  if (status === "saving") {
    return { label: "Saving…", Icon: SyncOutlinedIcon };
  }
  if (status === "unsynced") {
    return { label: "Unsynced", Icon: CloudSyncOutlinedIcon };
  }
  return {
    label: error ? `Save error: ${error}` : "Save error",
    Icon: ErrorOutlineOutlinedIcon,
  };
}
