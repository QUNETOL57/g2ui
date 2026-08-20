import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  buildLocalEntry,
  createMemoryChangeHistoryStore,
  setChangeHistoryStoreForTests,
} from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { ChangeHistorySheet } from "@widgets/change-history/ChangeHistorySheet";
import { groupEntriesByDate } from "@widgets/change-history/lib/groupEntriesByDate";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";

import { makeFixtureProject } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

describe("groupEntriesByDate", () => {
  it("groups entries as Today, Yesterday, and a date", () => {
    const project = makeFixtureProject();
    const today = new Date(2026, 7, 20, 15, 30, 0);
    const groups = groupEntriesByDate(
      [
        {
          id: "1",
          projectId: "p",
          createdAt: new Date(2026, 7, 20, 10, 0, 0).toISOString(),
          source: "local",
          contentHash: "a",
          project,
        },
        {
          id: "2",
          projectId: "p",
          createdAt: new Date(2026, 7, 19, 10, 0, 0).toISOString(),
          source: "local",
          contentHash: "b",
          project,
        },
        {
          id: "3",
          projectId: "p",
          createdAt: new Date(2026, 7, 1, 10, 0, 0).toISOString(),
          source: "remote",
          contentHash: "c",
          project,
        },
      ],
      today,
    );
    expect(groups.map((group) => group.label)).toEqual(["Today", "Yesterday", "01.08.2026"]);
  });
});

describe("ChangeHistorySheet", () => {
  beforeEach(() => {
    resetEditorStore(makeFixtureProject({ name: "Current" }));
    setChangeHistoryStoreForTests(createMemoryChangeHistoryStore());
  });

  afterEach(() => {
    setChangeHistoryStoreForTests(null);
  });

  it("opens from the status bar", async () => {
    render(<EditorStatusBar canvasId="proj-1" />);
    await userEvent.click(screen.getByRole("button", { name: "Change history" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Change history")).toBeInTheDocument();
    expect(screen.getByRole("dialog").className).toMatch(/sizeLg/);
    expect(screen.getByRole("dialog").className).not.toMatch(/placementBottom/);
  });

  it("shows a preview for the selected version", async () => {
    const store = createMemoryChangeHistoryStore();
    const snapshot = makeFixtureProject({ name: "Older" });
    await store.append(
      buildLocalEntry({
        projectId: "proj-1",
        project: snapshot,
        contentHash: "h1",
        createdAt: new Date(2026, 7, 20, 10, 0, 0).toISOString(),
      }),
    );
    render(
      <ChangeHistorySheet
        open
        onClose={() => undefined}
        projectId="proj-1"
        canvasId="proj-1"
        store={store}
      />,
    );
    expect(await screen.findByRole("button", { name: /10:00/ })).toBeInTheDocument();
    expect(screen.getByTestId("project-preview-surface")).toBeInTheDocument();
  });

  it("does not restore until the action is confirmed", async () => {
    const store = createMemoryChangeHistoryStore();
    const snapshot = makeFixtureProject({ name: "Older" });
    await store.append(
      buildLocalEntry({
        projectId: "proj-1",
        project: snapshot,
        contentHash: "h1",
        createdAt: new Date(2026, 7, 20, 10, 0, 0).toISOString(),
      }),
    );
    render(
      <ChangeHistorySheet
        open
        onClose={() => undefined}
        projectId="proj-1"
        canvasId="proj-1"
        store={store}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Restore this version" }));
    expect(useEditorStore.getState().project.name).toBe("Current");
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(useEditorStore.getState().project.name).toBe("Older");
  });

  it("restores a snapshot whose stored project id contains a hyphen", async () => {
    const store = createMemoryChangeHistoryStore();
    const snapshot = makeFixtureProject({
      name: "Older",
      id: "project-1755680000000",
    });
    await store.append(
      buildLocalEntry({
        projectId: "proj-1",
        project: snapshot,
        contentHash: "h1",
        createdAt: new Date(2026, 7, 20, 10, 0, 0).toISOString(),
      }),
    );
    render(
      <ChangeHistorySheet
        open
        onClose={() => undefined}
        projectId="proj-1"
        canvasId="proj-1"
        store={store}
      />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Restore this version" }));
    await userEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(screen.queryByText("This version is not a valid project.")).not.toBeInTheDocument();
    expect(useEditorStore.getState().project.name).toBe("Older");
    expect(useEditorStore.getState().project.id).toBe("project_1755680000000");
  });

  it("seeds the current editor project when history is empty", async () => {
    const store = createMemoryChangeHistoryStore();
    render(
      <ChangeHistorySheet
        open
        onClose={() => undefined}
        projectId="proj-1"
        canvasId="proj-1"
        store={store}
      />,
    );
    expect(await screen.findByTestId("project-preview-surface")).toBeInTheDocument();
    expect(screen.queryByText(/No local history yet/)).not.toBeInTheDocument();
    expect(await store.list("proj-1")).toHaveLength(1);
  });
});
