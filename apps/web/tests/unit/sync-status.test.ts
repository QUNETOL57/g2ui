import { describe, expect, it } from "vitest";

import {
  AUTOSAVE_STATUS_LABELS,
  formatAutosaveStatusLabel,
  formatLibraryStatusLabel,
  LIBRARY_STATUS_LABELS,
  SYNC_STATUS_LABELS,
} from "@shared/lib/sync-status";

describe("sync-status labels", () => {
  it("uses the same synced label in library and editor", () => {
    expect(LIBRARY_STATUS_LABELS.synced).toBe(SYNC_STATUS_LABELS.synced);
    expect(AUTOSAVE_STATUS_LABELS.saved).toBe(SYNC_STATUS_LABELS.synced);
  });

  it("formats autosave error labels", () => {
    expect(formatAutosaveStatusLabel("error", null)).toBe(SYNC_STATUS_LABELS.syncError);
    expect(formatAutosaveStatusLabel("error", "network")).toBe("Sync failed: network");
    expect(formatAutosaveStatusLabel("local", null)).toBe(SYNC_STATUS_LABELS.localDraft);
  });

  it("formats library error labels", () => {
    expect(formatLibraryStatusLabel("error", null)).toBe(SYNC_STATUS_LABELS.syncError);
    expect(formatLibraryStatusLabel("error", "timeout")).toBe("Sync failed: timeout");
    expect(formatLibraryStatusLabel("synced", null)).toBe(SYNC_STATUS_LABELS.synced);
  });
});
