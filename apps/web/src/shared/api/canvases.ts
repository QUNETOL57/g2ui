import type { UiProject } from "@entities/ui-project";
import { validateProject } from "@entities/ui-project";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import type { ProjectCard } from "@pages/library/lib/library-helpers";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const CANVAS_SCHEMA_VERSION = 1;

interface CanvasSettings {
  template?: TemplateId;
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
  return import.meta.env.MODE !== "test" && API_BASE_URL.length > 0;
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

export function canvasToProjectCard(canvas: CanvasRecord): ProjectCard | null {
  const project = cloneProject(canvas.content as UiProject);
  project.id = canvasIdToProjectId(canvas.id);
  project.name = canvas.title;

  const validation = validateProject(project);
  if (!validation.ok) return null;

  return {
    id: canvas.id,
    name: canvas.title,
    width: project.display.width,
    height: project.display.height,
    template: normalizeTemplate(canvas.settings.template),
    updatedAt: new Date(canvas.updated_at),
    project,
  };
}

function projectCardToPayload(card: ProjectCard): CanvasPayload {
  const content = cloneProject(card.project);
  if (isPersistedCanvasId(card.id)) {
    content.id = canvasIdToProjectId(card.id);
  }
  content.name = card.name;

  return {
    title: card.name,
    content,
    settings: {
      template: card.template,
    },
    schema_version: CANVAS_SCHEMA_VERSION,
  };
}

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isCanvasApiConfigured()) {
    throw new Error("VITE_API_URL is not configured");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function normalizeTemplate(template: unknown): TemplateId {
  return template === "hello" ? "hello" : "blank";
}

function canvasIdToProjectId(canvasId: string): string {
  return `canvas_${canvasId.replaceAll("-", "_")}`;
}
