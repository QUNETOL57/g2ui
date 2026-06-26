import { describe, expect, it } from "vitest";

import {
  AUTOSAVE_STATUS_LABELS,
  formatAutosaveStatusLabel,
  formatLibraryStatusLabel,
  LIBRARY_STATUS_LABELS,
  SYNC_STATUS_LABELS,
} from "@shared/lib/sync-status";

describe("sync-status labels", () => {
  it("uses the same local draft label in library and editor", () => {
    expect(LIBRARY_STATUS_LABELS.local).toBe(SYNC_STATUS_LABELS.localDraft);
    expect(AUTOSAVE_STATUS_LABELS.local).toBe(SYNC_STATUS_LABELS.localDraft);
  });

  it("formats autosave error labels", () => {
    expect(formatAutosaveStatusLabel("error", null)).toBe(SYNC_STATUS_LABELS.saveError);
    expect(formatAutosaveStatusLabel("error", "network")).toBe("Save error: network");
    expect(formatAutosaveStatusLabel("local", null)).toBe(SYNC_STATUS_LABELS.localDraft);
  });

  it("formats library error labels", () => {
    expect(formatLibraryStatusLabel("error", null)).toBe(SYNC_STATUS_LABELS.apiError);
    expect(formatLibraryStatusLabel("error", "timeout")).toBe("API error: timeout");
    expect(formatLibraryStatusLabel("synced", null)).toBe(SYNC_STATUS_LABELS.syncedWithApi);
  });
});
