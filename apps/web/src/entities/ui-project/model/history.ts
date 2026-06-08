import type { UiProject } from "..";
import { cloneProject } from "./tree-ops";

export const MAX_HISTORY = 100;

export interface HistorySnapshot {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
}

export interface HistoryHostState {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
}

export function snapshotState(state: HistoryHostState): HistorySnapshot {
  return {
    project: cloneProject(state.project),
    activeScreenId: state.activeScreenId,
    selectedNodeId: state.selectedNodeId,
  };
}

export function recordHistory(
  state: HistoryHostState,
): Pick<HistoryHostState, "historyPast" | "historyFuture"> {
  return {
    historyPast: [...state.historyPast, snapshotState(state)].slice(-MAX_HISTORY),
    historyFuture: [],
  };
}
