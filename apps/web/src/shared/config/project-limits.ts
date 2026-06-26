import { isPersistedCanvasId } from "@shared/api/canvases";
import type { ProjectCard } from "@pages/library/lib/library-helpers";

export const MAX_PROJECTS_PER_USER = 30;

export function countPersistedProjects(projects: ProjectCard[]): number {
  return projects.filter((project) => isPersistedCanvasId(project.id)).length;
}

export function isProjectLimitReached(
  projects: ProjectCard[],
  remoteEnabled: boolean,
): boolean {
  return remoteEnabled && countPersistedProjects(projects) >= MAX_PROJECTS_PER_USER;
}
