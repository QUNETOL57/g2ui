import type { UiProject, WidgetNode } from "@entities/ui-project";
import { IR_SCHEMA_VERSION } from "@entities/ui-project/schema";

export function makeFixtureProject(overrides: Partial<UiProject> = {}): UiProject {
  return {
    schemaVersion: IR_SCHEMA_VERSION,
    id: "fixture",
    name: "Fixture",
    display: { width: 160, height: 128, colorFormat: "rgb565" },
    palette: [
      { token: "bg", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
      { token: "accent", hex: "#1E90FF" },
    ],
    initialScreenId: "screen_main",
    screens: [
      {
        id: "screen_main",
        type: "screen",
        name: "Main",
        width: 160,
        height: 128,
        visible: true,
        layout: { mode: "absolute", padding: 0, gap: 0, align: "start", justify: "start" },
        style: { background: { kind: "token", token: "bg" } },
        props: { background: { kind: "token", token: "bg" } },
        children: [],
      },
    ],
    ...overrides,
  };
}

export function makePanel(id: string, children: WidgetNode[] = []): WidgetNode {
  return {
    id,
    type: "panel",
    visible: true,
    enabled: true,
    layout: { mode: "column", padding: 0, gap: 0, align: "start", justify: "start" },
    style: {},
    props: { scrollable: false },
    frame: { x: 0, y: 0, width: 160, height: 60 },
    children,
  };
}

export function makeLabel(id: string, text = "Hello"): WidgetNode {
  return {
    id,
    type: "label",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { textColor: { kind: "hex", value: "#FFFFFF" }, drawBackground: false },
    props: { text, align: "left", fontFamily: "BDF", fontSize: 7, fontStyle: "regular" },
    frame: { x: 8, y: 8, width: 80, height: 7 },
  };
}

export function makeButton(id: string, text = "Press"): WidgetNode {
  return {
    id,
    type: "button",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { textColor: { kind: "hex", value: "#FFFFFF" } },
    props: {
      text,
      fontFamily: "BDF",
      fontSize: 7,
      fontStyle: "regular",
      horizontalAlign: "center",
      verticalAlign: "center",
      paddingTop: 4,
      paddingRight: 8,
      paddingBottom: 4,
      paddingLeft: 8,
    },
    frame: { x: 8, y: 24, width: 80, height: 24 },
  };
}

export function makeIcon(id: string, iconId = "earth"): WidgetNode {
  return {
    id,
    type: "icon",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { textColor: { kind: "hex", value: "#FFFFFF" } },
    props: { iconId },
    frame: { x: 8, y: 8, width: 8, height: 8 },
  };
}

export function makeLine(id: string): WidgetNode {
  return {
    id,
    type: "line",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { borderColor: { kind: "hex", value: "#FFFFFF" }, borderWidth: 1 },
    props: { x1: 0, y1: 0, x2: 50, y2: 0, strokeWidth: 1 },
    frame: { x: 4, y: 16, width: 51, height: 1 },
  };
}

export function makeRect(id: string): WidgetNode {
  return {
    id,
    type: "rect",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { textColor: { kind: "hex", value: "#FFFFFF" } },
    props: { radius: 0 },
    frame: { x: 4, y: 4, width: 40, height: 24 },
  };
}

export function makeCircle(id: string): WidgetNode {
  return {
    id,
    type: "circle",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { textColor: { kind: "hex", value: "#FFFFFF" } },
    props: { radius: 0 },
    frame: { x: 4, y: 4, width: 32, height: 32 },
  };
}

export function makeTriangle(id: string): WidgetNode {
  return {
    id,
    type: "triangle",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { textColor: { kind: "hex", value: "#FFFFFF" } },
    props: { direction: "up" },
    frame: { x: 4, y: 4, width: 36, height: 32 },
  };
}

export function makeFreehand(id: string): WidgetNode {
  return {
    id,
    type: "freehand",
    visible: true,
    enabled: true,
    layout: { mode: "absolute" },
    style: { borderColor: { kind: "hex", value: "#FFFFFF" }, borderWidth: 1 },
    props: { points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], strokeWidth: 1 },
    frame: { x: 4, y: 4, width: 2, height: 2 },
  };
}

export function withChildren(project: UiProject, children: WidgetNode[]): UiProject {
  const next = JSON.parse(JSON.stringify(project)) as UiProject;
  next.screens[0].children = children;
  return next;
}

export function makeSecondScreen(id = "screen_other", name = "Other"): UiProject["screens"][number] {
  return {
    id,
    type: "screen",
    name,
    width: 160,
    height: 128,
    visible: true,
    layout: { mode: "absolute", padding: 0, gap: 0, align: "start", justify: "start" },
    style: { background: { kind: "token", token: "bg" } },
    props: { background: { kind: "token", token: "bg" } },
    children: [],
  };
}

export function withScreens(project: UiProject, screens: UiProject["screens"]): UiProject {
  return { ...project, screens };
}
