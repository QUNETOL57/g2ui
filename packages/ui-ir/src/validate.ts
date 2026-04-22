import { IR_SCHEMA_VERSION, IR_WIDGET_TYPES } from "./schema.js";
import { isValidId } from "./ids.js";
import type { UiProject, WidgetNode } from "./types.js";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

export function validateProject(project: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!project || typeof project !== "object") {
    return { ok: false, issues: [{ path: "$", message: "project must be an object" }] };
  }
  const p = project as Partial<UiProject>;

  if (p.schemaVersion !== IR_SCHEMA_VERSION) {
    issues.push({
      path: "$.schemaVersion",
      message: `expected ${IR_SCHEMA_VERSION}, got ${String(p.schemaVersion)}`,
    });
  }
  if (!p.id || !isValidId(p.id)) {
    issues.push({ path: "$.id", message: "missing or invalid project id" });
  }
  if (!p.display || typeof p.display.width !== "number" || typeof p.display.height !== "number") {
    issues.push({ path: "$.display", message: "display.width/height required (number)" });
  }
  if (!Array.isArray(p.screens) || p.screens.length === 0) {
    issues.push({ path: "$.screens", message: "at least one screen required" });
  }

  const seenIds = new Set<string>();
  (p.screens ?? []).forEach((s, i) => {
    if (s.type !== "screen") {
      issues.push({ path: `$.screens[${i}].type`, message: "must be 'screen'" });
    }
    validateWidget(s, `$.screens[${i}]`, seenIds, issues);
  });

  if (p.initialScreenId && !seenIds.has(p.initialScreenId)) {
    issues.push({
      path: "$.initialScreenId",
      message: `references unknown screen ${p.initialScreenId}`,
    });
  }

  return { ok: issues.length === 0, issues };
}

function validateWidget(
  node: WidgetNode,
  path: string,
  seen: Set<string>,
  issues: ValidationIssue[],
): void {
  if (!node.id || !isValidId(node.id)) {
    issues.push({ path: `${path}.id`, message: `invalid id ${JSON.stringify(node.id)}` });
  } else if (seen.has(node.id)) {
    issues.push({ path: `${path}.id`, message: `duplicate id ${node.id}` });
  } else {
    seen.add(node.id);
  }

  if (!(IR_WIDGET_TYPES as readonly string[]).includes(node.type)) {
    issues.push({ path: `${path}.type`, message: `unknown widget type ${String(node.type)}` });
  }

  (node.children ?? []).forEach((child, i) =>
    validateWidget(child, `${path}.children[${i}]`, seen, issues),
  );
}
