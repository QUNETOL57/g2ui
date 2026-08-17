import { describe, expect, it } from "vitest";

import {
  makeProjectFromCustomTemplate,
  makeProjectFromTemplate,
  customTemplateSelection,
  isBuiltinTemplateId,
  parseCustomTemplateId,
  resizeProject,
} from "@entities/ui-project/lib/projectTemplates";
import { cloneProject } from "@entities/ui-project/model/tree-ops";

import { makeFixtureProject, makeLabel, withChildren } from "../fixtures/projects";

describe("makeProjectFromTemplate", () => {
  it("creates a blank project at given size", () => {
    const project = makeProjectFromTemplate({
      id: "p_1",
      name: "Blank",
      width: 200,
      height: 100,
      template: "blank",
    });
    expect(project.id).toBe("p_1");
    expect(project.name).toBe("Blank");
    expect(project.display.width).toBe(200);
    expect(project.display.height).toBe(100);
    expect(project.screens[0].children).toEqual([]);
  });

  it("creates a hello project and resizes it", () => {
    const project = makeProjectFromTemplate({
      id: "p_hello",
      name: "Hi",
      width: 200,
      height: 100,
      template: "hello",
    });
    expect(project.id).toBe("p_hello");
    expect(project.display.width).toBe(200);
    expect(project.display.height).toBe(100);
    expect(project.screens[0].width).toBe(200);
    expect(project.screens[0].height).toBe(100);
  });
});

describe("custom template selection", () => {
  it("encodes and parses a custom template id", () => {
    expect(customTemplateSelection("tpl_1")).toBe("custom:tpl_1");
    expect(parseCustomTemplateId("custom:tpl_1")).toBe("tpl_1");
    expect(parseCustomTemplateId("hello")).toBeNull();
    expect(parseCustomTemplateId("custom:")).toBeNull();
  });

  it("recognizes built-in template ids", () => {
    expect(isBuiltinTemplateId("blank")).toBe(true);
    expect(isBuiltinTemplateId("hello")).toBe(true);
    expect(isBuiltinTemplateId("custom")).toBe(false);
    expect(isBuiltinTemplateId("custom:tpl_1")).toBe(false);
  });
});

describe("makeProjectFromCustomTemplate", () => {
  it("assigns a new id, name and size without sharing the source tree", () => {
    const source = withChildren(makeFixtureProject({ id: "src", name: "Source" }), [
      makeLabel("l_src", "KeepMe"),
    ]);
    const copy = makeProjectFromCustomTemplate({
      source,
      id: "child_1",
      name: "Child",
      width: 320,
      height: 256,
    });

    expect(copy.id).toBe("child_1");
    expect(copy.name).toBe("Child");
    expect(copy.display.width).toBe(320);
    expect(copy.display.height).toBe(256);
    expect(copy.screens[0].children?.[0]).toMatchObject({ id: "l_src" });
    expect(copy).not.toBe(source);
    expect(copy.screens).not.toBe(source.screens);

    const sourceLabel = source.screens[0].children?.[0];
    if (sourceLabel?.type === "label") {
      sourceLabel.props = { ...sourceLabel.props, text: "Mutated" };
    }
    const copyLabel = copy.screens[0].children?.[0];
    expect(copyLabel?.type === "label" ? copyLabel.props.text : null).toBe("KeepMe");
  });
});

describe("resizeProject", () => {
  it("scales children frames proportionally", () => {
    const child = { ...makeLabel("l_1"), frame: { x: 10, y: 20, width: 40, height: 10 } };
    const project = cloneProject(withChildren(makeFixtureProject(), [child]));
    resizeProject(project, 320, 256);
    const scaled = project.screens[0].children?.[0];
    expect(scaled?.frame?.x).toBe(20);
    expect(scaled?.frame?.y).toBe(40);
    expect(scaled?.frame?.width).toBe(80);
    expect(scaled?.frame?.height).toBe(20);
  });

  it("never produces zero width/height", () => {
    const tiny = { ...makeLabel("l"), frame: { x: 0, y: 0, width: 1, height: 1 } };
    const project = cloneProject(withChildren(makeFixtureProject(), [tiny]));
    resizeProject(project, 8, 8);
    expect(project.screens[0].children?.[0].frame?.width).toBeGreaterThanOrEqual(1);
    expect(project.screens[0].children?.[0].frame?.height).toBeGreaterThanOrEqual(1);
  });

  it("updates display and screen sizes", () => {
    const project = cloneProject(makeFixtureProject());
    resizeProject(project, 320, 240);
    expect(project.display.width).toBe(320);
    expect(project.display.height).toBe(240);
    expect(project.screens[0].width).toBe(320);
    expect(project.screens[0].height).toBe(240);
  });
});
