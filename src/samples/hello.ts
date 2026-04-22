import type { UiProject } from "@guimintlab/ui-ir";
import { emptyProject } from "@guimintlab/ui-ir";
import helloJson from "../../packages/ui-ir/examples/hello.project.json";

import { DISPLAY_PRESETS, DEFAULT_PRESET_ID } from "../layout/displayPresets";

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
