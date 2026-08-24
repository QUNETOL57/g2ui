import { describe, expect, it } from "vitest";

import { revisionListItemToEntry } from "@shared/api/canvasRevisions";

describe("revisionListItemToEntry", () => {
  it("maps API metadata to a remote change log entry", () => {
    const entry = revisionListItemToEntry(
      {
        id: "rev-1",
        created_at: "2026-08-20T10:00:00.000Z",
        content_hash: "abc",
      },
      "canvas-1",
    );
    expect(entry).toEqual({
      id: "rev-1",
      projectId: "canvas-1",
      createdAt: "2026-08-20T10:00:00.000Z",
      source: "remote",
      contentHash: "abc",
    });
    expect(entry.project).toBeUndefined();
  });
});
