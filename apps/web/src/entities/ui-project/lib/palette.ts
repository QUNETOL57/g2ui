import type { PaletteEntry } from "@entities/ui-project";

export function normalizeHex(hex: string): string | null {
  const trimmed = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return null;
}

export function isValidToken(token: string): boolean {
  const value = token.trim();
  return value.length > 0 && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(value);
}

export function normalizePalette(
  entries: PaletteEntry[],
): { ok: true; entries: PaletteEntry[] } | { ok: false; error: string } {
  const normalized: PaletteEntry[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const token = entry.token.trim();
    const hex = normalizeHex(entry.hex);
    if (!isValidToken(token)) {
      return { ok: false, error: `Invalid token name: ${entry.token || "(empty)"}` };
    }
    if (!hex) {
      return { ok: false, error: `Invalid hex color for token "${token}"` };
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: `Duplicate token: ${token}` };
    }
    seen.add(key);
    normalized.push({ token, hex });
  }

  return { ok: true, entries: normalized };
}

export function suggestPaletteToken(entries: PaletteEntry[]): string {
  let index = 1;
  while (entries.some((entry) => entry.token.toLowerCase() === `color_${index}`.toLowerCase())) {
    index += 1;
  }
  return `color_${index}`;
}

export function createPaletteEntry(entries: PaletteEntry[], hex = "#FFFFFF"): PaletteEntry {
  return { token: suggestPaletteToken(entries), hex: normalizeHex(hex) ?? "#FFFFFF" };
}
