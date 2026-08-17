import type { UiProject } from "@entities/ui-project";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import {
  isBuiltinTemplateId,
  makeProjectFromCustomTemplate,
  makeProjectFromTemplate,
  parseCustomTemplateId,
} from "@entities/ui-project/lib/projectTemplates";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";

export type Orientation = "landscape" | "portrait";

export interface ProjectCard {
  id: string;
  name: string;
  width: number;
  height: number;
  template: TemplateId;
  isTemplate?: boolean;
  sourceTemplateId?: string;
  createdAt: Date;
  updatedAt: Date;
  allowCanvasOverflow?: boolean;
  showFullWidgets?: boolean;
  project: UiProject;
}

export interface CanvasViewSettings {
  allowCanvasOverflow: boolean;
  showFullWidgets: boolean;
}

export function normalizeCanvasViewSettings(
  input: Partial<CanvasViewSettings> | null | undefined,
): CanvasViewSettings {
  const allowCanvasOverflow = Boolean(input?.allowCanvasOverflow);
  return {
    allowCanvasOverflow,
    showFullWidgets: allowCanvasOverflow && Boolean(input?.showFullWidgets),
  };
}

export const LIBRARY_SORT_BY = {
  updatedAt: "updatedAt",
  createdAt: "createdAt",
} as const;

export type LibrarySortBy = (typeof LIBRARY_SORT_BY)[keyof typeof LIBRARY_SORT_BY];

export const LIBRARY_SORT_DIRECTION = {
  desc: "desc",
  asc: "asc",
} as const;

export type LibrarySortDirection = (typeof LIBRARY_SORT_DIRECTION)[keyof typeof LIBRARY_SORT_DIRECTION];

export const DEFAULT_LIBRARY_SORT: LibrarySortBy = LIBRARY_SORT_BY.updatedAt;
export const DEFAULT_LIBRARY_SORT_DIRECTION: LibrarySortDirection = LIBRARY_SORT_DIRECTION.desc;

export const LIBRARY_SORT_OPTIONS: Array<{ value: LibrarySortBy; label: string }> = [
  { value: LIBRARY_SORT_BY.updatedAt, label: "Last edited" },
  { value: LIBRARY_SORT_BY.createdAt, label: "Date created" },
];

export function isLibrarySortBy(value: string): value is LibrarySortBy {
  return value === LIBRARY_SORT_BY.updatedAt || value === LIBRARY_SORT_BY.createdAt;
}

export function sortProjectCards(
  projects: ProjectCard[],
  sortBy: LibrarySortBy = DEFAULT_LIBRARY_SORT,
  direction: LibrarySortDirection = DEFAULT_LIBRARY_SORT_DIRECTION,
): ProjectCard[] {
  const sign = direction === LIBRARY_SORT_DIRECTION.asc ? 1 : -1;
  return [...projects].sort((left, right) => {
    const delta = (left[sortBy].getTime() - right[sortBy].getTime()) * sign;
    if (delta !== 0) return delta;
    return (left.updatedAt.getTime() - right.updatedAt.getTime()) * sign;
  });
}

export function orientSize(width: number, height: number, orientation: Orientation) {
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  if (min === max) return { width, height };
  return orientation === "portrait" ? { width: min, height: max } : { width: max, height: min };
}

export function findPresetIdForSize(width: number, height: number): string {
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  return (
    DISPLAY_PRESETS.find(
      (preset) =>
        Math.min(preset.width, preset.height) === min &&
        Math.max(preset.width, preset.height) === max,
    )?.id ?? DEFAULT_PRESET_ID
  );
}

export function formatEditedAt(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
}

export function templateLabel(template: TemplateId, sourceName?: string): string {
  if (template === "hello") return "Hello";
  if (template === "custom") return sourceName?.trim() || "Custom";
  return "Blank";
}

export function listCustomTemplates(projects: ProjectCard[]): ProjectCard[] {
  return projects.filter((project) => project.isTemplate);
}

export function markProjectAsTemplate(card: ProjectCard, enabled: boolean): ProjectCard {
  return { ...card, isTemplate: enabled };
}

export function draftProjectFromSelection(args: {
  selection: string;
  projects: ProjectCard[];
  id: string;
  name: string;
  width: number;
  height: number;
}): UiProject {
  const customId = parseCustomTemplateId(args.selection);
  const source = customId ? args.projects.find((item) => item.id === customId) : undefined;
  if (source) {
    return makeProjectFromCustomTemplate({
      source: source.project,
      id: args.id,
      name: args.name,
      width: args.width,
      height: args.height,
    });
  }
  return makeProjectFromTemplate({
    id: args.id,
    name: args.name,
    width: args.width,
    height: args.height,
    template: args.selection === "hello" ? "hello" : "blank",
  });
}

export function createProjectCardFromSelection(args: {
  selection: string;
  projects: ProjectCard[];
  name: string;
  width: number;
  height: number;
  createdAt?: Date;
}): ProjectCard {
  const createdAt = args.createdAt ?? new Date();
  const id = `project-${createdAt.getTime()}`;
  const name = args.name.trim() || "Untitled";
  const customId = parseCustomTemplateId(args.selection);
  const source = customId ? args.projects.find((item) => item.id === customId) : undefined;
  const project = draftProjectFromSelection({
    selection: source ? args.selection : isBuiltinTemplateId(args.selection) ? args.selection : "blank",
    projects: args.projects,
    id,
    name,
    width: args.width,
    height: args.height,
  });
  return {
    id,
    name,
    width: project.display.width,
    height: project.display.height,
    template: source ? "custom" : args.selection === "hello" ? "hello" : "blank",
    sourceTemplateId: source?.id,
    isTemplate: false,
    createdAt,
    updatedAt: createdAt,
    allowCanvasOverflow: false,
    showFullWidgets: false,
    project,
  };
}

export function copyProjectCard(source: ProjectCard): ProjectCard {
  const createdAt = new Date();
  const newId = `project-${createdAt.getTime()}`;
  const copiedProject = cloneProject(source.project);
  copiedProject.id = newId;
  copiedProject.name = `${source.name} copy`;
  return {
    id: newId,
    name: copiedProject.name,
    width: source.width,
    height: source.height,
    template: source.template,
    sourceTemplateId: source.sourceTemplateId,
    isTemplate: false,
    createdAt,
    updatedAt: createdAt,
    ...normalizeCanvasViewSettings(source),
    project: copiedProject,
  };
}
