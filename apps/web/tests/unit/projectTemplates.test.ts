import { describe, expect, it } from "vitest";

import {
  makeProjectFromTemplate,
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
