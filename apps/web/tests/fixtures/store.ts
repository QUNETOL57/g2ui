import { useEditorStore } from "@entities/ui-project/model/store";
import { blankProject } from "@entities/ui-project/samples/hello";
import type { UiProject } from "@entities/ui-project";

/** Reset the global Zustand store to a known blank project state. */
export function resetEditorStore(project?: UiProject) {
  const next = project ?? blankProject();
  useEditorStore.getState().clearClipboard();
  useEditorStore.setState({
    project: next,
    activeScreenId: next.screens[0]?.id ?? next.initialScreenId,
    activeTool: "select",
    markerStyle: { color: { kind: "hex", value: "#FFFFFF" }, width: 1 },
    selectedNodeId: null,
    selectedNodeIds: [],
    editingLabelId: null,
    draftFrames: null,
    historyBatchBase: null,
    lastError: null,
    historyPast: [],
    historyFuture: [],
    hasClipboard: false,
  });
}

export function getEditorStoreState() {
  return useEditorStore.getState();
}
