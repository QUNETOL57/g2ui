import type { ColorRef, PaletteEntry, ScreenProps, WidgetNode } from "@entities/ui-project";

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

/** Default fill used by the editor canvas when a screen has no background color. */
export const SCREEN_BACKGROUND_FALLBACK = "#121212";

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

/**
 * Resolve the screen fill shown on the editor canvas and in project/screen previews.
 * Prefers `style.background`, then `props.background`; respects `drawBackground === false`.
 */
export function resolveScreenBackground(
  screen: Pick<WidgetNode, "style" | "props"> | null | undefined,
  palette: PaletteEntry[] | undefined,
  fallback = SCREEN_BACKGROUND_FALLBACK,
): string {
  if (!screen || screen.style?.drawBackground === false) return "#000000";
  const propsBackground = (screen.props as ScreenProps | undefined)?.background;
  return resolveColor(screen.style?.background ?? propsBackground, palette, fallback);
}
