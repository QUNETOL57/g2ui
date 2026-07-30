/** Simplified CSS identifier (class token). */
const CLASS_TOKEN_RE = /^-?[_a-zA-Z][_a-zA-Z0-9-]*$/;

export function isValidClassToken(token: string): boolean {
  return CLASS_TOKEN_RE.test(token);
}

/**
 * Normalize an HTML-like class string: trim, collapse whitespace, drop empties.
 * Returns `undefined` when nothing remains.
 */
export function normalizeClass(value: string): string | undefined {
  const tokens = value
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
  if (tokens.length === 0) return undefined;
  return tokens.join(" ");
}

/** Empty / missing class is valid. Every remaining token must be a CSS-like identifier. */
export function isValidClass(value: string | undefined): boolean {
  if (value === undefined || value === "") return true;
  const normalized = normalizeClass(value);
  if (normalized === undefined) return true;
  return normalized.split(" ").every(isValidClassToken);
}
