import type {
  ButtonProps,
  IconProps,
  ImageProps,
  LabelProps,
  LayoutSpec,
  LineProps,
  PanelProps,
  RectProps,
  ScreenProps,
  UiProject,
  WidgetNode,
  WidgetType,
} from "./types.js";
import { IR_SCHEMA_VERSION } from "./schema.js";

export function defaultLayout(mode: LayoutSpec["mode"] = "absolute"): LayoutSpec {
  return { mode, padding: 0, gap: 0, align: "start", justify: "start" };
}

export function defaultProps(type: WidgetType): Record<string, unknown> {
  switch (type) {
    case "screen":
      return { background: { kind: "hex", value: "#000000" } } satisfies ScreenProps;
    case "panel":
      return { scrollable: false } satisfies PanelProps;
    case "label":
      return { text: "Label", scale: 1, align: "left" } satisfies LabelProps;
    case "button":
      return {
        text: "Button",
        scale: 1,
        paddingX: 8,
        paddingY: 4,
      } satisfies ButtonProps;
    case "icon":
      return { iconId: "earth" } satisfies IconProps;
    case "image":
      return { imageId: "placeholder" } satisfies ImageProps;
    case "line":
      return { x2: 10, y2: 0, strokeWidth: 1 } satisfies LineProps;
    case "rect":
      return { radius: 0 } satisfies RectProps;
  }
}

export function emptyProject(args: {
  id: string;
  name: string;
  width: number;
  height: number;
}): UiProject {
  const screenId = "screen_main";
  return {
    schemaVersion: IR_SCHEMA_VERSION,
    id: args.id,
    name: args.name,
    display: { width: args.width, height: args.height, colorFormat: "rgb565" },
    palette: [
      { token: "bg", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
      { token: "accent", hex: "#1E90FF" },
    ],
    initialScreenId: screenId,
    screens: [
      {
        id: screenId,
        type: "screen",
        name: "Main",
        width: args.width,
        height: args.height,
        visible: true,
        layout: defaultLayout("absolute"),
        style: { background: { kind: "token", token: "bg" } },
        props: { background: { kind: "token", token: "bg" } } satisfies ScreenProps,
        children: [],
      },
    ],
  };
}

export function makeWidget(id: string, type: WidgetType): WidgetNode {
  return {
    id,
    type,
    visible: true,
    enabled: true,
    layout: defaultLayout(type === "panel" ? "column" : "absolute"),
    style: { textColor: { kind: "hex", value: "#FFFFFF" } },
    props: defaultProps(type),
    children: type === "panel" || type === "screen" ? [] : undefined,
  };
}
