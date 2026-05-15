import type { UiProject } from "@entities/ui-project";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";

export type Orientation = "landscape" | "portrait";

export interface ProjectCard {
  id: string;
  name: string;
  width: number;
  height: number;
  template: TemplateId;
  updatedAt: Date;
  project: UiProject;
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

export function templateLabel(template: TemplateId): string {
  return template === "hello" ? "Hello" : "Blank";
}
