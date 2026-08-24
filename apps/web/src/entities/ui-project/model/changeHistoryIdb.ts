import {
  createNoopChangeHistoryStore,
  MAX_LOCAL_HISTORY,
  type ChangeHistoryStore,
  type ChangeLogEntry,
} from "./changeHistory";

let defaultStore: ChangeHistoryStore | null = null;

export function getChangeHistoryStore(): ChangeHistoryStore {
  if (!defaultStore) {
    defaultStore = createIndexedDbChangeHistoryStore();
  }
  return defaultStore;
}

export function setChangeHistoryStoreForTests(store: ChangeHistoryStore | null): void {
  defaultStore = store;
}

const DB_NAME = "g2ui:change-history";
const STORE_NAME = "entries";
const DB_VERSION = 1;

export function createIndexedDbChangeHistoryStore(): ChangeHistoryStore {
  let impl: ChangeHistoryStore | null = null;
  let failed = false;

  const resolve = async (): Promise<ChangeHistoryStore> => {
    if (failed) return createNoopChangeHistoryStore();
    if (impl) return impl;
    try {
      impl = await openIndexedDbStore();
      return impl;
    } catch (error) {
      failed = true;
      warnIndexedDbFailure(error);
      return createNoopChangeHistoryStore();
    }
  };

  return {
    async list(projectId) {
      return (await resolve()).list(projectId);
    },
    async get(id) {
      return (await resolve()).get(id);
    },
    async append(entry) {
      try {
        return await (await resolve()).append(entry);
      } catch (error) {
        failed = true;
        impl = null;
        warnIndexedDbFailure(error, entry.projectId);
        return entry;
      }
    },
    async clear(projectId) {
      try {
        await (await resolve()).clear(projectId);
      } catch (error) {
        failed = true;
        impl = null;
        warnIndexedDbFailure(error, projectId);
      }
    },
  };
}

async function openIndexedDbStore(): Promise<ChangeHistoryStore> {
  const db = await openDatabase();
  return {
    async list(projectId) {
      const entries = await withStore(db, "readonly", (store) =>
        indexedDbRequest<ChangeLogEntry[]>(store.index("projectId").getAll(projectId)),
      );
      return entries.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    },
    async get(id) {
      const entry = await withStore(db, "readonly", (store) =>
        indexedDbRequest<ChangeLogEntry | undefined>(store.get(id)),
      );
      return entry ?? null;
    },
    async append(entry) {
      return withStore(db, "readwrite", async (store) => {
        if (entry.source === "local") {
          const existing = await indexedDbRequest<ChangeLogEntry[]>(
            store.index("projectId").getAll(entry.projectId),
          );
          const lastLocal = [...existing]
            .filter((item) => item.source === "local")
            .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
            .at(-1);
          if (lastLocal && lastLocal.contentHash === entry.contentHash) {
            return lastLocal;
          }
        }
        await indexedDbRequest(store.put(entry));
        await pruneLocalHistory(store, entry.projectId);
        return entry;
      });
    },
    async clear(projectId) {
      await withStore(db, "readwrite", async (store) => {
        const existing = await indexedDbRequest<ChangeLogEntry[]>(
          store.index("projectId").getAll(projectId),
        );
        await Promise.all(existing.map((entry) => indexedDbRequest(store.delete(entry.id))));
      });
    },
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) return;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("projectId", "projectId", { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("unavailable"));
  });
}

function withStore<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    Promise.resolve(run(store)).then(resolve, reject);
    tx.onerror = () => reject(tx.error ?? new Error("read failed"));
  });
}

function indexedDbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("read failed"));
  });
}

async function pruneLocalHistory(store: IDBObjectStore, projectId: string): Promise<void> {
  const existing = await indexedDbRequest<ChangeLogEntry[]>(
    store.index("projectId").getAll(projectId),
  );
  const local = existing
    .filter((entry) => entry.source === "local")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const overflow = local.length - MAX_LOCAL_HISTORY;
  if (overflow <= 0) return;
  await Promise.all(
    local.slice(0, overflow).map((entry) => indexedDbRequest(store.delete(entry.id))),
  );
}

function warnIndexedDbFailure(error: unknown, projectId?: string): void {
  const extra = projectId ? { projectId } : {};
  if (isQuotaError(error)) {
    console.warn("[change-history]", "quota", extra);
    return;
  }
  if (error instanceof Error && error.message === "unavailable") {
    console.warn("[change-history]", "idb unavailable", extra);
    return;
  }
  console.warn("[change-history]", "read failed", extra);
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "QuotaExceededError";
}
