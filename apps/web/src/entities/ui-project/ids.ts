/**
 * Stable id utilities.
 *
 * Editor, preview, codegen and runtime all key off these ids. They must be
 * unique per project and never reused across deletes.
 */

const ID_RE = /^[a-z][a-z0-9_]{0,63}$/;

export function isValidId(id: string): boolean {
  return ID_RE.test(id);
}

/** Turn a stored/library id into an IR-valid token. Hyphens become underscores. */
export function sanitizeId(id: string): string {
  if (isValidId(id)) return id;
  const replaced = id.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
  const trimmed = replaced.replace(/^_+/, "").replace(/_+$/, "");
  const withLetter = trimmed.length === 0 ? "id" : /^[a-z]/.test(trimmed) ? trimmed : `id_${trimmed}`;
  return withLetter.slice(0, 64);
}

export function assertValidId(id: string): void {
  if (!isValidId(id)) {
    throw new Error(
      `invalid id "${id}": must match ${ID_RE.source} (lowercase, starts with letter, [a-z0-9_], <=64 chars)`,
    );
  }
}

/** Deterministic id from a prefix and a counter, e.g. nextId("btn", usedIds). */
export function nextId(prefix: string, used: Iterable<string>): string {
  assertValidId(prefix + "_1");
  const set = new Set(used);
  for (let i = 1; i < 10_000; i++) {
    const candidate = `${prefix}_${i}`;
    if (!set.has(candidate)) return candidate;
  }
  throw new Error(`failed to allocate id with prefix ${prefix}`);
}
