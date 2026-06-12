/**
 * Canonical schema version of G2UI IR.
 *
 * Bump policy:
 *   MAJOR — breaking changes to WidgetNode/Layout/Action shape.
 *   MINOR — added fields with defaults.
 *   PATCH — doc/type clarifications only.
 */
export const IR_SCHEMA_VERSION = "0.1.0" as const;

export const IR_WIDGET_TYPES = [
  "screen",
  "panel",
  "label",
  "button",
  "icon",
  "image",
  "line",
  "rect",
  "circle",
  "triangle",
  "freehand",
] as const;

export const IR_LAYOUT_MODES = ["absolute", "row", "column"] as const;

export const IR_ALIGN = [
  "start",
  "center",
  "end",
  "stretch",
  "space-between",
] as const;

export const IR_LABEL_ALIGN = ["left", "center", "right"] as const;

export const IR_ACTION_KINDS = [
  "navigate",
  "show",
  "hide",
  "setText",
  "setValue",
] as const;
