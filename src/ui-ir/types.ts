import type {
  IR_ACTION_KINDS,
  IR_ALIGN,
  IR_LABEL_ALIGN,
  IR_LAYOUT_MODES,
  IR_WIDGET_TYPES,
} from "./schema.js";

export type WidgetType = (typeof IR_WIDGET_TYPES)[number];
export type LayoutMode = (typeof IR_LAYOUT_MODES)[number];
export type Align = (typeof IR_ALIGN)[number];
export type LabelAlign = (typeof IR_LABEL_ALIGN)[number];
export type ActionKind = (typeof IR_ACTION_KINDS)[number];

/** RGB565-friendly color; the runtime converts to uint16_t. Hex is source of truth. */
export type ColorRef =
  | { kind: "hex"; value: string }
  | { kind: "token"; token: string };

export interface LayoutSpec {
  mode: LayoutMode;
  padding?: number;
  gap?: number;
  align?: Align;
  justify?: Align;
}

export interface StyleRef {
  background?: ColorRef;
  borderColor?: ColorRef;
  borderWidth?: number;
  textColor?: ColorRef;
  drawBackground?: boolean;
  drawBorder?: boolean;
}

/** Absolute-layout frame. Required when parent uses `absolute`. */
export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ActionSpec {
  kind: ActionKind;
  /** target widget id or screen id, depending on `kind`. */
  target?: string;
  /** string payload for setText, or numeric as string for setValue. */
  value?: string;
}

export interface BindingSpec {
  /** runtime signal id that will call setText/setValue on this widget. */
  signal: string;
  property: "text" | "value" | "visible" | "color";
}

/**
 * Stable widget node. `id` must be unique inside the project and never
 * reassigned; editor, preview, codegen and runtime all rely on it.
 */
export interface WidgetNode {
  id: string;
  type: WidgetType;
  name?: string;
  visible?: boolean;
  enabled?: boolean;
  frame?: Frame;
  layout?: LayoutSpec;
  style?: StyleRef;
  props?: WidgetProps;
  bindings?: BindingSpec[];
  onPress?: ActionSpec;
  children?: WidgetNode[];
}

export interface LabelProps {
  text: string;
  align?: LabelAlign;
  font?: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: "regular" | "bold" | "oblique" | "boldOblique";
  fontFace?: string;
}

export interface ButtonProps {
  text: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: "regular" | "bold" | "oblique" | "boldOblique";
  fontFace?: string;
  horizontalAlign?: LabelAlign;
  verticalAlign?: "top" | "center" | "bottom";
  paddingX?: number;
  paddingY?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  pressedBackground?: ColorRef;
}

export interface IconProps {
  iconId: string;
}

export interface ImageProps {
  imageId: string;
}

export interface LineProps {
  x1?: number;
  y1?: number;
  x2: number;
  y2: number;
  strokeWidth?: number;
}

export interface RectProps {
  radius?: number;
}

export interface PanelProps {
  scrollable?: boolean;
}

export interface ScreenProps {
  background?: ColorRef;
}

export type WidgetProps =
  | LabelProps
  | ButtonProps
  | IconProps
  | ImageProps
  | LineProps
  | RectProps
  | PanelProps
  | ScreenProps
  | Record<string, never>;

export interface ScreenNode extends WidgetNode {
  type: "screen";
  width: number;
  height: number;
}

export interface PaletteEntry {
  token: string;
  hex: string;
}

export interface UiProject {
  schemaVersion: string;
  id: string;
  name: string;
  display: {
    width: number;
    height: number;
    colorFormat: "rgb565";
  };
  palette?: PaletteEntry[];
  screens: ScreenNode[];
  /** id of the screen shown on boot. */
  initialScreenId: string;
}
