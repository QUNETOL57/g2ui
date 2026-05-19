import type { UiProject } from "@entities/ui-project";
import { emptyProject } from "@entities/ui-project";
import helloJson from "../examples/hello.project.json";

import { DISPLAY_PRESETS, DEFAULT_PRESET_ID } from "@shared/config/displayPresets";

export function helloSample(): UiProject {
  return JSON.parse(JSON.stringify(helloJson)) as UiProject;
}

export function blankProject(): UiProject {
  const preset =
    DISPLAY_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) ?? DISPLAY_PRESETS[0];
  return emptyProject({
    id: "untitled",
    name: "Untitled",
    width: preset.width,
    height: preset.height,
  });
}
