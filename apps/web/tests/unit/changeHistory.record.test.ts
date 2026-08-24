import { describe, expect, it } from "vitest";

import {
  createMemoryChangeHistoryStore,
  recordLocalProjectChange,
  shouldRecordLocalSnapshot,
  buildLocalEntry,
} from "@entities/ui-project";

import { makeFixtureProject } from "../fixtures/projects";

describe("local snapshot recording helpers", () => {
  it("builds a cloned local entry", () => {
    const project = makeFixtureProject({ name: "Draft" });
    const entry = buildLocalEntry({
      projectId: "canvas-1",
      project,
      contentHash: "abc",
      createdAt: "2026-08-20T10:00:00.000Z",
    });
    project.name = "Changed";
    expect(entry.source).toBe("local");
    expect(entry.project?.name).toBe("Draft");
    expect(shouldRecordLocalSnapshot(null, entry.contentHash)).toBe(true);
  });

  it("records through the store used by autosave", async () => {
    const store = createMemoryChangeHistoryStore();
    const project = makeFixtureProject();
    await recordLocalProjectChange("canvas-1", project, store, new Date("2026-08-20T12:00:00Z"));
    const listed = await store.list("canvas-1");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.projectId).toBe("canvas-1");
  });
});
