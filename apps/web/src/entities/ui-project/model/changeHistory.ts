import type { UiProject } from "../types";
import { cloneProject } from "./tree-ops";

export const MAX_LOCAL_HISTORY = 100;

export type ChangeLogSource = "local" | "remote";

export interface ChangeLogEntry {
  id: string;
  projectId: string;
  createdAt: string;
  source: ChangeLogSource;
  contentHash: string;
  project?: UiProject;
}

export interface ChangeHistoryStore {
  list: (projectId: string) => Promise<ChangeLogEntry[]>;
  get: (id: string) => Promise<ChangeLogEntry | null>;
  append: (entry: ChangeLogEntry) => Promise<ChangeLogEntry>;
  clear: (projectId: string) => Promise<void>;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export async function hashProjectContent(project: UiProject): Promise<string> {
  const encoded = new TextEncoder().encode(stableStringify(project));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function shouldRecordLocalSnapshot(
  lastHash: string | null,
  nextHash: string,
): boolean {
  return lastHash !== nextHash;
}

export function buildLocalEntry(input: {
  id?: string;
  projectId: string;
  project: UiProject;
  contentHash: string;
  createdAt: string;
}): ChangeLogEntry {
  return {
    id: input.id ?? newChangeLogId(),
    projectId: input.projectId,
    createdAt: input.createdAt,
    source: "local",
    contentHash: input.contentHash,
    project: cloneProject(input.project),
  };
}

export function mergeChangeLogEntries(
  localEntries: ChangeLogEntry[],
  remoteEntries: ChangeLogEntry[],
): ChangeLogEntry[] {
  const byHash = new Map<string, ChangeLogEntry>();
  for (const entry of localEntries) {
    byHash.set(entry.contentHash, entry);
  }
  for (const entry of remoteEntries) {
    const existing = byHash.get(entry.contentHash);
    byHash.set(
      entry.contentHash,
      existing
        ? {
            ...existing,
            ...entry,
            source: "remote",
            project: entry.project ?? existing.project,
          }
        : entry,
    );
  }
  return [...byHash.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createMemoryChangeHistoryStore(
  seed: ChangeLogEntry[] = [],
): ChangeHistoryStore {
  const entries = seed.map(cloneEntry);
  return {
    async list(projectId) {
      return entries
        .filter((entry) => entry.projectId === projectId)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map(cloneEntry);
    },
    async get(id) {
      const found = entries.find((entry) => entry.id === id);
      return found ? cloneEntry(found) : null;
    },
    async append(entry) {
      if (entry.source === "local") {
        const lastLocal = lastLocalEntry(entries, entry.projectId);
        if (lastLocal && lastLocal.contentHash === entry.contentHash) {
          return cloneEntry(lastLocal);
        }
      }
      const stored = cloneEntry(entry);
      entries.push(stored);
      pruneLocalHistory(entries, entry.projectId);
      return cloneEntry(stored);
    },
    async clear(projectId) {
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        if (entries[index]?.projectId === projectId) {
          entries.splice(index, 1);
        }
      }
    },
  };
}

export function createNoopChangeHistoryStore(): ChangeHistoryStore {
  return {
    async list() {
      return [];
    },
    async get() {
      return null;
    },
    async append(entry) {
      return entry;
    },
    async clear() {},
  };
}

export async function lastLocalHash(
  store: ChangeHistoryStore,
  projectId: string,
): Promise<string | null> {
  const entries = await store.list(projectId);
  const lastLocal = entries.find((entry) => entry.source === "local");
  return lastLocal?.contentHash ?? null;
}

export async function recordLocalProjectChange(
  projectId: string,
  project: UiProject,
  store: ChangeHistoryStore,
  now: Date = new Date(),
): Promise<ChangeLogEntry | null> {
  const contentHash = await hashProjectContent(project);
  const previousHash = await lastLocalHash(store, projectId);
  if (!shouldRecordLocalSnapshot(previousHash, contentHash)) {
    return null;
  }
  return store.append(
    buildLocalEntry({
      projectId,
      project,
      contentHash,
      createdAt: now.toISOString(),
    }),
  );
}

function lastLocalEntry(entries: ChangeLogEntry[], projectId: string): ChangeLogEntry | undefined {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry && entry.projectId === projectId && entry.source === "local") {
      return entry;
    }
  }
  return undefined;
}

function pruneLocalHistory(entries: ChangeLogEntry[], projectId: string): void {
  const localIndexes = entries.reduce<number[]>((indexes, entry, index) => {
    if (entry.projectId === projectId && entry.source === "local") {
      indexes.push(index);
    }
    return indexes;
  }, []);
  const overflow = localIndexes.length - MAX_LOCAL_HISTORY;
  if (overflow <= 0) return;
  const remove = new Set(localIndexes.slice(0, overflow));
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (remove.has(index)) {
      entries.splice(index, 1);
    }
  }
}

function cloneEntry(entry: ChangeLogEntry): ChangeLogEntry {
  return {
    ...entry,
    project: entry.project ? cloneProject(entry.project) : undefined,
  };
}

function newChangeLogId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `chg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
