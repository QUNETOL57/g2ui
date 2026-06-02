import { useEditorStore } from "@entities/ui-project/model/store";
import { blankProject } from "@entities/ui-project/samples/hello";
import type { UiProject } from "@entities/ui-project";

/** Reset the global Zustand store to a known blank project state. */
export function resetEditorStore(project?: UiProject) {
  const next = project ?? blankProject();
  useEditorStore.setState({
    project: next,
    activeScreenId: next.initialScreenId,
    selectedNodeId: null,
    editingLabelId: null,
    draftFrame: null,
    historyBatchBase: null,
    lastError: null,
    historyPast: [],
    historyFuture: [],
  });
}

export function getEditorStoreState() {
  return useEditorStore.getState();
}
