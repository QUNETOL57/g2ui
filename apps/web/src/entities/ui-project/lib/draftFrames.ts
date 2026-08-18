import type { Frame } from "../types";

export type DraftFrames = Record<string, Frame> | null;

export function draftFrameFor(
  draftFrames: DraftFrames | undefined,
  nodeId: string | null | undefined,
): Frame | null {
  if (!draftFrames || !nodeId) return null;
  return draftFrames[nodeId] ?? null;
}
