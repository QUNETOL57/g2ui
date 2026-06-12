import { describe, expect, it } from "vitest";

import {
  defaultLayout,
  defaultProps,
  emptyProject,
  makeWidget,
} from "@entities/ui-project/defaults";
import { IR_SCHEMA_VERSION } from "@entities/ui-project/schema";

describe("defaultLayout", () => {
  it("returns absolute layout with zeros by default", () => {
    expect(defaultLayout()).toEqual({
      mode: "absolute",
      padding: 0,
      gap: 0,
      align: "start",
      justify: "start",
    });
  });

  it("honors custom mode", () => {
    expect(defaultLayout("row").mode).toBe("row");
    expect(defaultLayout("column").mode).toBe("column");
  });
});

describe("defaultProps", () => {
  it("provides screen background hex", () => {
    const screen = defaultProps("screen");
    expect(screen).toEqual({ background: { kind: "hex", value: "#000000" } });
  });

  it("provides panel scrollable=false", () => {
    expect(defaultProps("panel")).toEqual({ scrollable: false });
  });

  it("provides label text", () => {
    const label = defaultProps("label") as { text: string };
    expect(label.text).toBe("Label");
  });

  it("provides button paddings and alignment", () => {
    const btn = defaultProps("button") as {
      text: string;
      paddingTop: number;
      paddingRight: number;
      horizontalAlign: string;
    };
    expect(btn.text).toBe("Button");
    expect(btn.paddingTop).toBe(4);
    expect(btn.paddingRight).toBe(8);
    expect(btn.horizontalAlign).toBe("center");
  });

  it("provides icon iconId default", () => {
    const icon = defaultProps("icon") as { iconId: string };
    expect(icon.iconId).toBe("earth");
  });

  it("provides image, line, rect and drawing defaults", () => {
    expect(defaultProps("image")).toEqual({ imageId: "placeholder" });
    expect(defaultProps("line")).toEqual({ x1: 0, y1: 0, x2: 59, y2: 0, strokeWidth: 1 });
    expect(defaultProps("rect")).toEqual({ radius: 0 });
    expect(defaultProps("circle")).toEqual({ radius: 0 });
    expect(defaultProps("triangle")).toEqual({ direction: "up" });
    expect(defaultProps("freehand")).toEqual({ points: [], strokeWidth: 1 });
  });
});

describe("emptyProject", () => {
  it("returns a valid base project with correct schema version", () => {
    const project = emptyProject({ id: "my", name: "My", width: 100, height: 50 });
    expect(project.schemaVersion).toBe(IR_SCHEMA_VERSION);
    expect(project.id).toBe("my");
    expect(project.name).toBe("My");
    expect(project.display).toEqual({ width: 100, height: 50, colorFormat: "rgb565" });
    expect(project.screens).toHaveLength(1);
    expect(project.screens[0].id).toBe("screen_main");
    expect(project.initialScreenId).toBe("screen_main");
    expect(project.palette).toEqual(
      expect.arrayContaining([{ token: "bg", hex: "#000000" }, { token: "fg", hex: "#FFFFFF" }]),
    );
  });
});

describe("makeWidget", () => {
  it("creates a label with default props and absolute layout", () => {
    const node = makeWidget("lbl_1", "label");
    expect(node.id).toBe("lbl_1");
    expect(node.type).toBe("label");
    expect(node.visible).toBe(true);
    expect(node.enabled).toBe(true);
    expect(node.layout?.mode).toBe("absolute");
    expect((node.props as { text: string }).text).toBe("Label");
    expect(node.style?.drawBackground).toBe(false);
    expect(node.children).toBeUndefined();
  });

  it("creates a panel with column layout and empty children", () => {
    const node = makeWidget("pn_1", "panel");
    expect(node.layout?.mode).toBe("column");
    expect(node.children).toEqual([]);
  });

  it("creates a line with border style", () => {
    const node = makeWidget("ln_1", "line");
    expect(node.style?.borderColor).toEqual({ kind: "hex", value: "#FFFFFF" });
    expect(node.style?.borderWidth).toBe(1);
  });

  it("creates screen with empty children", () => {
    const node = makeWidget("sc_1", "screen");
    expect(node.children).toEqual([]);
  });
});
