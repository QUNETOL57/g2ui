import type { ButtonIconPosition, ButtonIconSlot, ButtonProps } from "../types.js";

export const DEFAULT_BUTTON_ICON_ID = "earth";

export function createDefaultButtonIconSlot(
  position: ButtonIconPosition = "left",
): ButtonIconSlot {
  const slot: ButtonIconSlot = {
    iconId: DEFAULT_BUTTON_ICON_ID,
    position,
  };
  // Match legacy default iconGap=2 on the side toward the text.
  if (position === "left") slot.paddingRight = 2;
  else if (position === "right") slot.paddingLeft = 2;
  else if (position === "top") slot.paddingBottom = 2;
  else slot.paddingTop = 2;
  return slot;
}

/**
 * Resolve button icons for render/UI.
 * Prefers `icons`; falls back to legacy `iconId` / `iconPosition` / `iconGap`.
 */
export function resolveButtonIcons(props: Pick<
  ButtonProps,
  "icons" | "iconId" | "iconPosition" | "iconGap"
>): ButtonIconSlot[] {
  if (props.icons !== undefined) return props.icons;

  if (props.iconId === undefined) return [];

  const position = props.iconPosition ?? "left";
  const gap = Math.max(0, props.iconGap ?? 2);
  const slot: ButtonIconSlot = { iconId: props.iconId, position };
  if (position === "left") slot.paddingRight = gap;
  else if (position === "right") slot.paddingLeft = gap;
  else if (position === "top") slot.paddingBottom = gap;
  else slot.paddingTop = gap;
  return [slot];
}

/** Patch that writes `icons` and clears legacy single-icon fields. */
export function buttonIconsWritePatch(icons: ButtonIconSlot[]): Partial<ButtonProps> {
  return {
    icons,
    iconId: undefined,
    iconPosition: undefined,
    iconGap: undefined,
  };
}
