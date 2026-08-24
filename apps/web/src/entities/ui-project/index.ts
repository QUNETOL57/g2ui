export * from "./types.js";
export * from "./schema.js";
export * from "./defaults.js";
export * from "./validate.js";
export * from "./ids.js";
export * from "./lib/buttonIcons.js";
export { draftFrameFor } from "./lib/draftFrames.js";
export type { DraftFrames } from "./lib/draftFrames.js";
export { flattenSelectableIds, pruneMovableSelection, cloneProject } from "./model/tree-ops.js";
export {
  MAX_LOCAL_HISTORY,
  buildLocalEntry,
  createMemoryChangeHistoryStore,
  hashProjectContent,
  mergeChangeLogEntries,
  recordLocalProjectChange,
  shouldRecordLocalSnapshot,
  stableStringify,
} from "./model/changeHistory.js";
export type {
  ChangeHistoryStore,
  ChangeLogEntry,
  ChangeLogSource,
} from "./model/changeHistory.js";
export {
  createIndexedDbChangeHistoryStore,
  getChangeHistoryStore,
  setChangeHistoryStoreForTests,
} from "./model/changeHistoryIdb.js";
