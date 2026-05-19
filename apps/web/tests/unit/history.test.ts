import { describe, expect, it } from "vitest";

import {
  MAX_HISTORY,
  recordHistory,
  snapshotState,
  type HistoryHostState,
  type HistorySnapshot,
} from "@entities/ui-project/model/history";

import { makeFixtureProject } from "../fixtures/projects";

function makeState(overrides: Partial<HistoryHostState> = {}): HistoryHostState {
  return {
    project: makeFixtureProject(),
    activeScreenId: "screen_main",
    selectedNodeId: null,
    historyPast: [],
    historyFuture: [],
    ...overrides,
  };
}

describe("snapshotState", () => {
  it("creates a deep snapshot of project + selection", () => {
    const state = makeState({ selectedNodeId: "x" });
    const snap = snapshotState(state);
    expect(snap.activeScreenId).toBe("screen_main");
    expect(snap.selectedNodeId).toBe("x");
    expect(snap.project).not.toBe(state.project);
    expect(snap.project).toEqual(state.project);
  });
});

describe("recordHistory", () => {
  it("appends current state to past and clears future", () => {
    const state = makeState({
      historyFuture: [
        { project: makeFixtureProject(), activeScreenId: "screen_main", selectedNodeId: null },
      ],
    });
    const next = recordHistory(state);
    expect(next.historyPast).toHaveLength(1);
    expect(next.historyFuture).toEqual([]);
  });

  it("limits past history to MAX_HISTORY entries", () => {
    const past: HistorySnapshot[] = Array.from({ length: MAX_HISTORY }, () => ({
      project: makeFixtureProject(),
      activeScreenId: "screen_main",
      selectedNodeId: null,
    }));
    const state = makeState({ historyPast: past });
    const next = recordHistory(state);
    expect(next.historyPast).toHaveLength(MAX_HISTORY);
  });

  it("MAX_HISTORY is a sane positive number", () => {
    expect(MAX_HISTORY).toBeGreaterThan(0);
  });
});
