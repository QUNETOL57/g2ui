import type { UiProject } from "@entities/ui-project";
import { useDebouncedValue } from "@shared/lib/useDebouncedValue";

import { ScreenThumbnail } from "./ScreenThumbnail";

const PREVIEW_DEBOUNCE_MS = 400;

export function ScreenPreview({
  project,
  screenId,
}: {
  project: UiProject;
  screenId: string;
}) {
  const debouncedProject = useDebouncedValue(project, PREVIEW_DEBOUNCE_MS);

  return <ScreenThumbnail project={debouncedProject} screenId={screenId} />;
}

export { PREVIEW_DEBOUNCE_MS };
