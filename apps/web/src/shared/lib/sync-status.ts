export const AUTOSAVE_STATUSES = ["local", "saved", "saving", "unsynced", "error"] as const;
export type AutosaveStatus = (typeof AUTOSAVE_STATUSES)[number];

export const LIBRARY_STATUSES = ["local", "loading", "synced", "saving", "error"] as const;
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

export const SYNC_STATUS_LABELS = {
  localDraft: "Local draft",
  saving: "Saving…",
  unsynced: "Unsynced",
  loadingProjects: "Loading projects…",
  synced: "Synced",
  syncError: "Sync failed",
} as const;

export const AUTOSAVE_STATUS_LABELS = {
  local: SYNC_STATUS_LABELS.localDraft,
  saved: SYNC_STATUS_LABELS.synced,
  saving: SYNC_STATUS_LABELS.saving,
  unsynced: SYNC_STATUS_LABELS.unsynced,
  error: SYNC_STATUS_LABELS.syncError,
} as const satisfies Record<AutosaveStatus, string>;

export const LIBRARY_STATUS_LABELS = {
  local: SYNC_STATUS_LABELS.localDraft,
  loading: SYNC_STATUS_LABELS.loadingProjects,
  saving: SYNC_STATUS_LABELS.saving,
  synced: SYNC_STATUS_LABELS.synced,
  error: SYNC_STATUS_LABELS.syncError,
} as const satisfies Record<LibraryStatus, string>;

export function formatAutosaveStatusLabel(status: AutosaveStatus, error: string | null): string {
  if (status === "error" && error) {
    return `${SYNC_STATUS_LABELS.syncError}: ${error}`;
  }
  return AUTOSAVE_STATUS_LABELS[status];
}

export function formatLibraryStatusLabel(status: LibraryStatus, error: string | null): string {
  if (status === "error" && error) {
    return `${SYNC_STATUS_LABELS.syncError}: ${error}`;
  }
  return LIBRARY_STATUS_LABELS[status];
}

export function libraryStatusToDataStatus(
  status: LibraryStatus,
): AutosaveStatus | "loading" {
  if (status === "synced") return "saved";
  if (status === "loading" || status === "saving") return "saving";
  return status;
}
