import StayCurrentLandscapeOutlinedIcon from "@mui/icons-material/StayCurrentLandscapeOutlined";
import StayCurrentPortraitOutlinedIcon from "@mui/icons-material/StayCurrentPortraitOutlined";

import type { UiProject } from "@entities/ui-project";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import { DISPLAY_PRESETS } from "@shared/config/displayPresets";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/Button";
import { CustomSelect } from "@shared/ui/CustomSelect";
import { IconButton } from "@shared/ui/IconButton";

import styles from "./CreateProjectPanel.module.css";
import type { Orientation } from "./lib/library-helpers";
import { templateLabel } from "./lib/library-helpers";
import { ProjectPreview } from "./ProjectPreview";

interface CreateProjectPanelProps {
  mode: "create" | "edit";
  selectedPresetId: string;
  orientation: Orientation;
  template: TemplateId;
  projectName: string;
  createSize: { width: number; height: number };
  draftProject: UiProject;
  onPresetChange: (presetId: string) => void;
  onOrientationChange: (orientation: Orientation) => void;
  onTemplateChange: (template: TemplateId) => void;
  onProjectNameChange: (name: string) => void;
  onSubmit: () => void;
}

export function CreateProjectPanel({
  mode,
  selectedPresetId,
  orientation,
  template,
  projectName,
  createSize,
  draftProject,
  onPresetChange,
  onOrientationChange,
  onTemplateChange,
  onProjectNameChange,
  onSubmit,
}: CreateProjectPanelProps) {
  const isEditing = mode === "edit";

  return (
    <aside className={styles.panel}>
      {isEditing ? (
        <div className={cn(styles.title, styles.titleEdit)}>
          <div className={styles.kicker}>Edit project</div>
        </div>
      ) : (
        <div className={styles.title}>
          <div className={styles.kicker}>New project</div>
          <p>Choose the display, orientation and starter content before opening the editor.</p>
        </div>
      )}

      <label className={styles.label}>
        Project name
        <input
          type="text"
          className={styles.input}
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Untitled"
        />
      </label>

      <div className={styles.displayGroup}>
        <div className={styles.displayLabel}>Display</div>
        <div className={styles.displayControls}>
          <CustomSelect
            ariaLabel="display size"
            value={selectedPresetId}
            options={DISPLAY_PRESETS.map((preset) => ({
              value: preset.id,
              label: preset.label,
            }))}
            onChange={onPresetChange}
            triggerClassName={styles.triggerLg}
          />

          <div className={styles.orientationPicker} role="group" aria-label="orientation">
            <IconButton
              className={cn(
                styles.orientationButton,
                orientation === "landscape" && styles.orientationActive,
              )}
              aria-label="Landscape"
              title="Landscape"
              onClick={() => onOrientationChange("landscape")}
            >
              <StayCurrentLandscapeOutlinedIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              className={cn(
                styles.orientationButton,
                orientation === "portrait" && styles.orientationActive,
              )}
              aria-label="Portrait"
              title="Portrait"
              onClick={() => onOrientationChange("portrait")}
            >
              <StayCurrentPortraitOutlinedIcon fontSize="inherit" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <div>Template</div>
        <CustomSelect
          ariaLabel="template"
          value={template}
          options={[
            { value: "blank", label: "Blank" },
            { value: "hello", label: "Hello" },
          ]}
          onChange={(nextTemplate) => onTemplateChange(nextTemplate as TemplateId)}
          triggerClassName={styles.triggerLg}
        />
      </div>

      <div className={styles.summary}>
        <ProjectPreview project={draftProject} compact />
        <div>
          <strong>
            {createSize.width} × {createSize.height}
          </strong>
          <span>{templateLabel(template)} template</span>
        </div>
      </div>

      <Button size="lg" onClick={onSubmit}>
        {isEditing ? "Save changes" : "Create project"}
      </Button>
    </aside>
  );
}
