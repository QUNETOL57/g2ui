import { describe, expect, it } from "vitest";

import { validateProject } from "@entities/ui-project/validate";
import { emptyProject } from "@entities/ui-project/defaults";
import { IR_SCHEMA_VERSION } from "@entities/ui-project/schema";

import { makeFixtureProject, makeLabel, withChildren } from "../fixtures/projects";

describe("validateProject", () => {
  it("returns ok for a fresh empty project", () => {
    const project = emptyProject({ id: "p1", name: "P1", width: 160, height: 128 });
    expect(validateProject(project)).toEqual({ ok: true, issues: [] });
  });

  it("returns ok for a project with labels", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    expect(validateProject(project)).toEqual({ ok: true, issues: [] });
  });

  it("rejects non-object input", () => {
    expect(validateProject(null).ok).toBe(false);
    expect(validateProject(null).issues[0].path).toBe("$");
    expect(validateProject(42 as unknown).ok).toBe(false);
    expect(validateProject("hello" as unknown).ok).toBe(false);
  });

  it("rejects wrong schema version", () => {
    const project = makeFixtureProject();
    (project as { schemaVersion: string }).schemaVersion = "9.9.9";
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "$.schemaVersion")).toBe(true);
  });

  it("requires a valid id", () => {
    const project = makeFixtureProject();
    project.id = "Bad ID";
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "$.id")).toBe(true);
  });

  it("requires non-empty screens array", () => {
    const project = makeFixtureProject();
    project.screens = [];
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "$.screens")).toBe(true);
  });

  it("requires display.width/height", () => {
    const project = makeFixtureProject();
    (project as { display: unknown }).display = { width: "x" as unknown as number, height: 128 };
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "$.display")).toBe(true);
  });

  it("detects duplicate widget ids", () => {
    const project = withChildren(makeFixtureProject(), [
      makeLabel("lbl_dup"),
      makeLabel("lbl_dup"),
    ]);
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /duplicate id/.test(i.message))).toBe(true);
  });

  it("detects invalid widget id", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("BAD ID")]);
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /invalid id/.test(i.message))).toBe(true);
  });

  it("detects unknown widget types", () => {
    const project = withChildren(makeFixtureProject(), [
      { ...makeLabel("x_1"), type: "blob" as unknown as "label" },
    ]);
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /unknown widget type/.test(i.message))).toBe(true);
  });

  it("flags initialScreenId pointing to unknown screen", () => {
    const project = makeFixtureProject();
    project.initialScreenId = "no_such_screen";
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.path === "$.initialScreenId")).toBe(true);
  });

  it("rejects screen with non-screen type", () => {
    const project = makeFixtureProject();
    (project.screens[0] as unknown as { type: string }).type = "panel";
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /must be 'screen'/.test(i.message))).toBe(true);
  });

  it("validates nested children recursively", () => {
    const child = makeLabel("ok");
    const parent = {
      ...makeLabel("parent_1"),
      type: "panel" as const,
      children: [{ ...child, id: "BAD" }],
    };
    const project = withChildren(makeFixtureProject(), [parent]);
    const result = validateProject(project);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => /invalid id/.test(i.message))).toBe(true);
  });

  it("schema version constant is stable", () => {
    expect(IR_SCHEMA_VERSION).toBe("0.1.0");
  });
});
