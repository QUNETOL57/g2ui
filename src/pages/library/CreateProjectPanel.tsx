import StayCurrentLandscapeOutlinedIcon from "@mui/icons-material/StayCurrentLandscapeOutlined";
import StayCurrentPortraitOutlinedIcon from "@mui/icons-material/StayCurrentPortraitOutlined";

import type { UiProject } from "@entities/ui-project";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import { DISPLAY_PRESETS } from "@shared/config/displayPresets";
import { CustomSelect } from "@shared/ui/CustomSelect";
import { IconButton } from "@shared/ui/IconButton";

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
    <aside className="create-project-panel">
      {isEditing ? (
        <div className="create-project-panel-title is-edit">
          <div className="project-library-kicker">Edit project</div>
        </div>
      ) : (
        <div className="create-project-panel-title">
          <div className="project-library-kicker">New project</div>
          <p>Choose the display, orientation and starter content before opening the editor.</p>
        </div>
      )}

      <label>
        Project name
        <input
          type="text"
          value={projectName}
          onChange={(event) => onProjectNameChange(event.target.value)}
          placeholder="Untitled"
        />
      </label>

      <div className="display-config-group">
        <div className="display-config-label">Display</div>
        <div className="display-config-controls">
          <CustomSelect
            ariaLabel="display size"
            value={selectedPresetId}
            options={DISPLAY_PRESETS.map((preset) => ({
              value: preset.id,
              label: preset.label,
            }))}
            onChange={onPresetChange}
          />

          <div className="orientation-picker" role="group" aria-label="orientation">
            <IconButton
              className={["display-orientation-button", orientation === "landscape" ? "is-active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-label="Landscape"
              title="Landscape"
              onClick={() => onOrientationChange("landscape")}
            >
              <StayCurrentLandscapeOutlinedIcon fontSize="inherit" />
            </IconButton>
            <IconButton
              className={["display-orientation-button", orientation === "portrait" ? "is-active" : ""]
                .filter(Boolean)
                .join(" ")}
              aria-label="Portrait"
              title="Portrait"
              onClick={() => onOrientationChange("portrait")}
            >
              <StayCurrentPortraitOutlinedIcon fontSize="inherit" />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="create-project-field">
        <div>Template</div>
        <CustomSelect
          ariaLabel="template"
          value={template}
          options={[
            { value: "blank", label: "Blank" },
            { value: "hello", label: "Hello" },
          ]}
          onChange={(nextTemplate) => onTemplateChange(nextTemplate as TemplateId)}
        />
      </div>

      <div className="create-project-summary">
        <ProjectPreview project={draftProject} compact />
        <div>
          <strong>
            {createSize.width} × {createSize.height}
          </strong>
          <span>{templateLabel(template)} template</span>
        </div>
      </div>

      <button className="create-project-submit" onClick={onSubmit}>
        {isEditing ? "Save changes" : "Create project"}
      </button>
    </aside>
  );
}
