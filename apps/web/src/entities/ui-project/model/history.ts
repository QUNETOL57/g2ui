import type { UiProject } from "..";
import { cloneProject } from "./tree-ops";

export const MAX_HISTORY = 100;

export interface HistorySnapshot {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
}

export interface HistoryHostState {
  project: UiProject;
  activeScreenId: string;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  historyPast: HistorySnapshot[];
  historyFuture: HistorySnapshot[];
}

export function sameSelectionIds(
  a: readonly string[] | undefined,
  b: readonly string[],
): boolean {
  if (!a) return b.length === 0;
  if (a.length !== b.length) return false;
  return a.every((id, index) => id === b[index]);
}

/** Restores selection from a snapshot, keeping primary inside the id list. */
export function restoreSelectionSnapshot(snapshot: HistorySnapshot): {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
} {
  const selectedNodeIds = snapshot.selectedNodeIds
    ? [...snapshot.selectedNodeIds]
    : snapshot.selectedNodeId
      ? [snapshot.selectedNodeId]
      : [];
  const primaryId = snapshot.selectedNodeId;
  if (primaryId !== null && !selectedNodeIds.includes(primaryId)) {
    console.warn("[history.restoreSelection] primary is not in selectedNodeIds; using last id", {
      primaryId,
      selectedNodeIds,
    });
    return { selectedNodeIds, selectedNodeId: selectedNodeIds.at(-1) ?? null };
  }
  return { selectedNodeIds, selectedNodeId: primaryId };
}

export function snapshotState(state: HistoryHostState): HistorySnapshot {
  return {
    project: cloneProject(state.project),
    activeScreenId: state.activeScreenId,
    selectedNodeId: state.selectedNodeId,
    selectedNodeIds: [...(state.selectedNodeIds ?? (state.selectedNodeId ? [state.selectedNodeId] : []))],
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
