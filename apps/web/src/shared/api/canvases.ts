import type { UiProject } from "@entities/ui-project";
import { sanitizeId, validateProject } from "@entities/ui-project";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import type { ProjectCard } from "@pages/library/lib/library-helpers";
import { fetchJson, isApiConfigured } from "@shared/api/client";

const CANVAS_SCHEMA_VERSION = 1;

interface CanvasSettings {
  template?: TemplateId;
  isTemplate?: boolean;
  sourceTemplateId?: string;
  allowCanvasOverflow?: boolean;
  showFullWidgets?: boolean;
  [key: string]: unknown;
}

export interface CanvasRecord {
  id: string;
  owner_id: string;
  title: string;
  content: unknown;
  settings: CanvasSettings;
  schema_version: number;
  created_at: string;
  updated_at: string;
}

interface CanvasPayload {
  title: string;
  content: UiProject;
  settings: CanvasSettings;
  schema_version: number;
}

export function isCanvasApiConfigured(): boolean {
  return isApiConfigured();
}

export function isPersistedCanvasId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export async function listCanvases(): Promise<CanvasRecord[]> {
  return fetchJson<CanvasRecord[]>("/api/v1/canvases");
}

export async function createCanvas(card: ProjectCard): Promise<CanvasRecord> {
  return fetchJson<CanvasRecord>("/api/v1/canvases", {
    method: "POST",
    body: JSON.stringify(projectCardToPayload(card)),
  });
}

export async function updateCanvas(card: ProjectCard): Promise<CanvasRecord> {
  return fetchJson<CanvasRecord>(`/api/v1/canvases/${card.id}`, {
    method: "PATCH",
    body: JSON.stringify(projectCardToPayload(card)),
  });
}

export async function deleteCanvas(canvasId: string): Promise<void> {
  await fetchJson<void>(`/api/v1/canvases/${canvasId}`, { method: "DELETE" });
}

export function normalizeHistoryProject(content: unknown, canvasId: string): UiProject | null {
  if (!content || typeof content !== "object") return null;
  const project = cloneProject(content as UiProject);
  project.id = isPersistedCanvasId(canvasId)
    ? canvasIdToProjectId(canvasId)
    : sanitizeId(typeof project.id === "string" && project.id.length > 0 ? project.id : canvasId);
  return validateProject(project).ok ? project : null;
}

export function canvasToProjectCard(canvas: CanvasRecord): ProjectCard | null {
  const project = normalizeHistoryProject(canvas.content, canvas.id);
  if (!project) return null;
  project.name = canvas.title;

  return {
    id: canvas.id,
    name: canvas.title,
    width: project.display.width,
    height: project.display.height,
    template: normalizeTemplate(canvas.settings.template, canvas.settings.sourceTemplateId),
    isTemplate: Boolean(canvas.settings.isTemplate),
    sourceTemplateId:
      typeof canvas.settings.sourceTemplateId === "string"
        ? canvas.settings.sourceTemplateId
        : undefined,
    createdAt: new Date(canvas.created_at),
    updatedAt: new Date(canvas.updated_at),
    allowCanvasOverflow: canvas.settings.allowCanvasOverflow === true,
    showFullWidgets:
      canvas.settings.allowCanvasOverflow === true && canvas.settings.showFullWidgets === true,
    project,
  };
}

export function projectCardToPayload(card: ProjectCard): CanvasPayload {
  const content = cloneProject(card.project);
  content.id = isPersistedCanvasId(card.id)
    ? canvasIdToProjectId(card.id)
    : sanitizeId(typeof content.id === "string" && content.id.length > 0 ? content.id : card.id);
  content.name = card.name;

  return {
    title: card.name,
    content,
    settings: {
      template: card.template,
      isTemplate: Boolean(card.isTemplate),
      sourceTemplateId: card.sourceTemplateId,
      allowCanvasOverflow: Boolean(card.allowCanvasOverflow),
      showFullWidgets: Boolean(card.allowCanvasOverflow && card.showFullWidgets),
    },
    schema_version: CANVAS_SCHEMA_VERSION,
  };
}

export function normalizeTemplate(template: unknown, sourceTemplateId?: unknown): TemplateId {
  if (template === "hello" || template === "blank" || template === "custom") return template;
  if (typeof sourceTemplateId === "string" && sourceTemplateId.length > 0) return "custom";
  return "blank";
}

function canvasIdToProjectId(canvasId: string): string {
  return `canvas_${canvasId.replaceAll("-", "_")}`;
}
