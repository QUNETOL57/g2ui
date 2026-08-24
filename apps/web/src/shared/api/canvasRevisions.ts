import type { ChangeLogEntry } from "@entities/ui-project";
import { fetchJson } from "@shared/api/client";

export interface CanvasRevisionListItem {
  id: string;
  created_at: string;
  content_hash: string;
}

export interface CanvasRevisionRecord extends CanvasRevisionListItem {
  content: unknown;
}

export function revisionListItemToEntry(
  item: CanvasRevisionListItem,
  projectId: string,
): ChangeLogEntry {
  return {
    id: item.id,
    projectId,
    createdAt: item.created_at,
    source: "remote",
    contentHash: item.content_hash,
  };
}

export async function listCanvasRevisions(canvasId: string): Promise<CanvasRevisionListItem[]> {
  return fetchJson<CanvasRevisionListItem[]>(`/api/v1/canvases/${canvasId}/revisions`);
}

export async function getCanvasRevision(
  canvasId: string,
  revisionId: string,
): Promise<CanvasRevisionRecord> {
  return fetchJson<CanvasRevisionRecord>(`/api/v1/canvases/${canvasId}/revisions/${revisionId}`);
}
