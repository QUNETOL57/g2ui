import type { ColorRef, PaletteEntry } from "@guimintlab/ui-ir";

const DEFAULTS: Record<string, string> = {
  bg: "#000000",
  fg: "#FFFFFF",
  accent: "#1E90FF",
  muted: "#808080",
  danger: "#FF3333",
  white: "#FFFFFF",
  black: "#000000",
  surface: "#111111",
  surface_raised: "#1A1A1A",
};

export function resolveColor(
  color: ColorRef | undefined,
  palette: PaletteEntry[] | undefined,
  fallback = "#FFFFFF",
): string {
  if (!color) return fallback;
  if (color.kind === "hex") return color.value;
  const pal = (palette ?? []).find((p) => p.token === color.token);
  if (pal) return pal.hex;
  return DEFAULTS[color.token] ?? fallback;
}
