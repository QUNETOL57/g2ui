import { describe, expect, it } from "vitest";

import {
  MAX_LOCAL_HISTORY,
  buildLocalEntry,
  createMemoryChangeHistoryStore,
  hashProjectContent,
  mergeChangeLogEntries,
  recordLocalProjectChange,
  shouldRecordLocalSnapshot,
} from "@entities/ui-project";

import { makeFixtureProject } from "../fixtures/projects";

describe("shouldRecordLocalSnapshot", () => {
  it("records when there is no previous hash", () => {
    expect(shouldRecordLocalSnapshot(null, "abc")).toBe(true);
  });

  it("skips when the hash is unchanged", () => {
    expect(shouldRecordLocalSnapshot("abc", "abc")).toBe(false);
  });
});

describe("createMemoryChangeHistoryStore", () => {
  it("skips a local append with the same content hash", async () => {
    const store = createMemoryChangeHistoryStore();
    const project = makeFixtureProject();
    const hash = await hashProjectContent(project);
    const first = await store.append(
      buildLocalEntry({
        projectId: "proj-1",
        project,
        contentHash: hash,
        createdAt: "2026-08-20T10:00:00.000Z",
      }),
    );
    const second = await store.append(
      buildLocalEntry({
        projectId: "proj-1",
        project,
        contentHash: hash,
        createdAt: "2026-08-20T10:01:00.000Z",
      }),
    );
    const listed = await store.list("proj-1");
    expect(listed).toHaveLength(1);
    expect(second.id).toBe(first.id);
  });

  it("limits local history to MAX_LOCAL_HISTORY entries", async () => {
    const store = createMemoryChangeHistoryStore();
    const base = makeFixtureProject();
    for (let index = 0; index < MAX_LOCAL_HISTORY + 5; index += 1) {
      const project = { ...base, name: `Revision ${index}` };
      await store.append(
        buildLocalEntry({
          projectId: "proj-1",
          project,
          contentHash: `hash-${index}`,
          createdAt: new Date(Date.UTC(2026, 7, 20, 10, 0, index)).toISOString(),
        }),
      );
    }
    const listed = await store.list("proj-1");
    expect(listed).toHaveLength(MAX_LOCAL_HISTORY);
    expect(listed[0]?.project?.name).toBe(`Revision ${MAX_LOCAL_HISTORY + 4}`);
    expect(listed.at(-1)?.project?.name).toBe("Revision 5");
  });

  it("does not share the stored project by reference", async () => {
    const store = createMemoryChangeHistoryStore();
    const project = makeFixtureProject({ name: "Original" });
    await store.append(
      buildLocalEntry({
        projectId: "proj-1",
        project,
        contentHash: "h1",
        createdAt: "2026-08-20T10:00:00.000Z",
      }),
    );
    project.name = "Mutated";
    const listed = await store.list("proj-1");
    expect(listed[0]?.project?.name).toBe("Original");
  });
});

describe("mergeChangeLogEntries", () => {
  it("keeps the remote badge when local and remote share a hash", () => {
    const project = makeFixtureProject();
    const merged = mergeChangeLogEntries(
      [
        {
          id: "local-1",
          projectId: "proj-1",
          createdAt: "2026-08-20T10:00:00.000Z",
          source: "local",
          contentHash: "same",
          project,
        },
      ],
      [
        {
          id: "remote-1",
          projectId: "proj-1",
          createdAt: "2026-08-20T10:00:01.000Z",
          source: "remote",
          contentHash: "same",
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("remote");
    expect(merged[0]?.id).toBe("remote-1");
    expect(merged[0]?.project?.name).toBe("Fixture");
  });
});

describe("recordLocalProjectChange", () => {
  it("appends a new snapshot and skips an unchanged project", async () => {
    const store = createMemoryChangeHistoryStore();
    const project = makeFixtureProject();
    const first = await recordLocalProjectChange("proj-1", project, store, new Date("2026-08-20T10:00:00Z"));
    const skipped = await recordLocalProjectChange(
      "proj-1",
      project,
      store,
      new Date("2026-08-20T10:01:00Z"),
    );
    const renamed = await recordLocalProjectChange(
      "proj-1",
      { ...project, name: "Renamed" },
      store,
      new Date("2026-08-20T10:02:00Z"),
    );
    expect(first).not.toBeNull();
    expect(skipped).toBeNull();
    expect(renamed).not.toBeNull();
    expect(await store.list("proj-1")).toHaveLength(2);
  });
});
