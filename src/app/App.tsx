import { useEffect, useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import StayCurrentLandscapeOutlinedIcon from "@mui/icons-material/StayCurrentLandscapeOutlined";
import StayCurrentPortraitOutlinedIcon from "@mui/icons-material/StayCurrentPortraitOutlined";

import { useEditorStore } from "../store/editorStore";
import { TreePanel } from "../features/tree/TreePanel";
import { CanvasWorkspace } from "../features/canvas/CanvasWorkspace";
import { PropertiesPanel } from "../features/properties/PropertiesPanel";
import { ExportPanel } from "../features/export/ExportPanel";
import { DISPLAY_PRESETS, DEFAULT_PRESET_ID } from "../layout/displayPresets";
import { layoutTree } from "../layout/layoutEngine";
import { CustomSelect } from "../components/CustomSelect";
import { IconButton } from "../components/IconButton";
import { helloSample } from "../samples/hello";
import { emptyProject } from "../ui-ir";
import { PreviewNode } from "../features/canvas/renderNode";
import type { UiProject, WidgetNode } from "../ui-ir";
import logoUrl from "../assets/logo.svg";

type AppView = "library" | "editor";
type Orientation = "landscape" | "portrait";
type TemplateId = "hello" | "blank";

interface ProjectCard {
  id: string;
  name: string;
  width: number;
  height: number;
  template: TemplateId;
  updatedAt: Date;
  project: UiProject;
}

export function App() {
  const lastError = useEditorStore((s) => s.lastError);
  const project = useEditorStore((s) => s.project);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const setProject = useEditorStore((s) => s.setProject);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const [view, setView] = useState<AppView>("library");
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET_ID);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [template, setTemplate] = useState<TemplateId>("blank");
  const [projectName, setProjectName] = useState("Untitled");
  const [projects, setProjects] = useState<ProjectCard[]>(() => [
    {
      id: project.id,
      name: project.name,
      width: project.display.width,
      height: project.display.height,
      template: "hello",
      updatedAt: new Date(),
      project: cloneProject(project),
    },
  ]);

  const selectedPreset = useMemo(
    () => DISPLAY_PRESETS.find((preset) => preset.id === selectedPresetId) ?? DISPLAY_PRESETS[0],
    [selectedPresetId],
  );
  const createSize = useMemo(
    () => orientSize(selectedPreset.width, selectedPreset.height, orientation),
    [orientation, selectedPreset.height, selectedPreset.width],
  );
  const draftProject = useMemo(
    () =>
      makeProjectFromTemplate({
        id: "draft",
        name: projectName.trim() || "Untitled",
        width: createSize.width,
        height: createSize.height,
        template,
        updatedAt: new Date(0),
        project,
      }),
    [createSize.height, createSize.width, project, projectName, template],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (view !== "editor") return;
      const target = event.target;
      const isEditingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const isModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const isUndoKey = isModifier && key === "z" && !event.shiftKey;
      const isRedoKey = isModifier && ((key === "z" && event.shiftKey) || key === "y");

      if ((isUndoKey || isRedoKey) && !isEditingText) {
        event.preventDefault();
        if (isUndoKey) undo();
        else redo();
        return;
      }

      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";

      if (!isDeleteKey || !selectedNodeId) return;

      if (isEditingText) {
        return;
      }

      event.preventDefault();
      deleteNode(selectedNodeId);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [deleteNode, redo, selectedNodeId, undo, view]);

  const openProject = (card: ProjectCard) => {
    setProject(cloneProject(card.project));
    setView("editor");
  };

  const showLibrary = () => {
    setProjects((items) =>
      items.map((item) =>
        item.id === project.id
          ? {
              ...item,
              name: project.name,
              width: project.display.width,
              height: project.display.height,
              updatedAt: new Date(),
              project: cloneProject(project),
            }
          : item,
      ),
    );
    setView("library");
  };

  const deleteProject = (projectId: string) => {
    setProjects((items) => items.filter((item) => item.id !== projectId));
  };

  const updateProject = (card: ProjectCard) => {
    setProjects((items) => items.map((item) => (item.id === card.id ? card : item)));
    if (project.id === card.id) {
      setProject(cloneProject(card.project));
    }
  };

  const createProject = () => {
    const createdAt = new Date();
    const nextName = projectName.trim() || "Untitled";
    const newProject = makeProjectFromTemplate({
      id: `project-${createdAt.getTime()}`,
      name: nextName,
      width: createSize.width,
      height: createSize.height,
      template,
      updatedAt: createdAt,
      project,
    });
    const card: ProjectCard = {
      id: newProject.id,
      name: newProject.name,
      width: newProject.display.width,
      height: newProject.display.height,
      template,
      updatedAt: createdAt,
      project: cloneProject(newProject),
    };
    setProjects((items) => [card, ...items.filter((item) => item.id !== card.id)]);
    setProject(newProject);
    setView("editor");
  };

  if (view === "library") {
    return (
      <ProjectLibrary
        projects={projects}
        selectedPresetId={selectedPresetId}
        orientation={orientation}
        template={template}
        projectName={projectName}
        createSize={createSize}
        draftProject={draftProject}
        onPresetChange={setSelectedPresetId}
        onOrientationChange={setOrientation}
        onTemplateChange={setTemplate}
        onProjectNameChange={setProjectName}
        onCreateProject={createProject}
        onOpenProject={openProject}
        onDeleteProject={deleteProject}
        onUpdateProject={updateProject}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-brand">
          <img className="top-bar-logo" src={logoUrl} alt="GuiMintLab Studio" title="GuiMintLab Studio" />
          <div className="top-bar-brand-main">
            <IconButton
              className="library-link-button"
              onClick={showLibrary}
              title="Back to project library"
              aria-label="Back to project library"
            >
              ←
            </IconButton>
            <span className="top-bar-meta">
              project <strong>{project.name}</strong> · schema {project.schemaVersion}
            </span>
          </div>
        </div>
      </div>
      <div className="left-panel">
        <TreePanel />
      </div>
      <div className="center-panel">
        <CanvasWorkspace />
        {lastError ? <div className="error-banner">{lastError}</div> : null}
      </div>
      <div className="right-panel">
        <PropertiesPanel />
        <ExportPanel />
      </div>
    </div>
  );
}

interface ProjectLibraryProps {
  projects: ProjectCard[];
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
  onCreateProject: () => void;
  onOpenProject: (project: ProjectCard) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (project: ProjectCard) => void;
}

function ProjectLibrary({
  projects,
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
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onUpdateProject,
}: ProjectLibraryProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectEditing, setProjectEditing] = useState<ProjectCard | null>(null);
  const [editPresetId, setEditPresetId] = useState(DEFAULT_PRESET_ID);
  const [editOrientation, setEditOrientation] = useState<Orientation>("landscape");
  const [editTemplate, setEditTemplate] = useState<TemplateId>("blank");
  const [editProjectName, setEditProjectName] = useState("Untitled");
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectCard | null>(null);

  const editPreset = useMemo(
    () => DISPLAY_PRESETS.find((preset) => preset.id === editPresetId) ?? DISPLAY_PRESETS[0],
    [editPresetId],
  );
  const editSize = useMemo(
    () => orientSize(editPreset.width, editPreset.height, editOrientation),
    [editOrientation, editPreset.height, editPreset.width],
  );
  const editDraftProject = useMemo(() => {
    const source = projectEditing?.project ?? draftProject;
    const nextProject = resizeProject(cloneProject(source), editSize.width, editSize.height);
    nextProject.name = editProjectName.trim() || "Untitled";
    return nextProject;
  }, [draftProject, editProjectName, editSize.height, editSize.width, projectEditing]);

  const openEditModal = (card: ProjectCard) => {
    const nextOrientation: Orientation = card.height > card.width ? "portrait" : "landscape";
    setProjectEditing(card);
    setEditPresetId(findPresetIdForSize(card.width, card.height));
    setEditOrientation(nextOrientation);
    setEditTemplate(card.template);
    setEditProjectName(card.name);
  };
  const closeEditModal = () => setProjectEditing(null);
  const saveEditedProject = () => {
    if (!projectEditing) return;
    const updatedProject = resizeProject(cloneProject(projectEditing.project), editSize.width, editSize.height);
    updatedProject.name = editProjectName.trim() || "Untitled";
    onUpdateProject({
      ...projectEditing,
      name: updatedProject.name,
      width: editSize.width,
      height: editSize.height,
      template: editTemplate,
      updatedAt: new Date(),
      project: updatedProject,
    });
    setProjectEditing(null);
  };

  const closeDeleteModal = () => setProjectPendingDelete(null);
  const confirmDeleteProject = () => {
    if (!projectPendingDelete) return;
    onDeleteProject(projectPendingDelete.id);
    setProjectPendingDelete(null);
  };

  return (
    <main className="project-library-page">
      <header className="top-bar project-library-header">
        <div className="top-bar-brand">
          <img className="top-bar-logo" src={logoUrl} alt="GuiMintLab Studio" title="GuiMintLab Studio" />
          <span className="top-bar-brand-name">
            <strong>
              g<span className="top-bar-brand-accent">2</span>
              <span className="top-bar-brand-white">ui</span>
            </strong>
          </span>
        </div>
      </header>

      <section className="project-library-content">
        <div className="project-grid-section">
          <div className="section-title">Projects</div>

          <div className="project-card-grid">
            {projects.map((item) => (
              <article className="project-card" key={item.id}>
                <IconButton
                  className="project-edit-button"
                  title={`Edit ${item.name}`}
                  aria-label={`Edit ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditModal(item);
                  }}
                >
                  <EditRoundedIcon />
                </IconButton>
                <IconButton
                  className="project-delete-button"
                  title={`Delete ${item.name}`}
                  aria-label={`Delete ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setProjectPendingDelete(item);
                  }}
                >
                  <CloseRoundedIcon />
                </IconButton>
                <button className="project-card-open" type="button" onClick={() => onOpenProject(item)}>
                  <ProjectPreview project={item.project} />
                  <div className="project-card-footer">
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.width} × {item.height} · {templateLabel(item.template)} · Edited{" "}
                        {formatEditedAt(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              </article>
            ))}
            <article className="project-card project-create-card">
              <button className="project-create-card-button" type="button" onClick={() => setIsCreateModalOpen(true)}>
                <span className="project-create-card-icon" aria-hidden="true">
                  <AddRoundedIcon />
                </span>
                <strong>New project</strong>
                <small>Create display project</small>
              </button>
            </article>
          </div>
        </div>

        {isCreateModalOpen ? (
          <div className="project-create-modal-backdrop" role="presentation" onMouseDown={() => setIsCreateModalOpen(false)}>
            <div
              className="project-create-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Create project"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <IconButton
                className="project-create-modal-close"
                aria-label="Close create project"
                title="Close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ×
              </IconButton>
              <CreateProjectPanel
                mode="create"
                selectedPresetId={selectedPresetId}
                orientation={orientation}
                template={template}
                projectName={projectName}
                createSize={createSize}
                draftProject={draftProject}
                onPresetChange={onPresetChange}
                onOrientationChange={onOrientationChange}
                onTemplateChange={onTemplateChange}
                onProjectNameChange={onProjectNameChange}
                onSubmit={onCreateProject}
              />
            </div>
          </div>
        ) : null}

        {projectEditing ? (
          <div className="project-create-modal-backdrop" role="presentation" onMouseDown={closeEditModal}>
            <div
              className="project-create-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Edit project"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <IconButton
                className="project-create-modal-close"
                aria-label="Close edit project"
                title="Close"
                onClick={closeEditModal}
              >
                <CloseRoundedIcon />
              </IconButton>
              <CreateProjectPanel
                mode="edit"
                selectedPresetId={editPresetId}
                orientation={editOrientation}
                template={editTemplate}
                projectName={editProjectName}
                createSize={editSize}
                draftProject={editDraftProject}
                onPresetChange={setEditPresetId}
                onOrientationChange={setEditOrientation}
                onTemplateChange={setEditTemplate}
                onProjectNameChange={setEditProjectName}
                onSubmit={saveEditedProject}
              />
            </div>
          </div>
        ) : null}

        {projectPendingDelete ? (
          <div className="project-create-modal-backdrop" role="presentation" onMouseDown={closeDeleteModal}>
            <div
              className="project-delete-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-project-title"
              aria-describedby="delete-project-description"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <h2 id="delete-project-title">Delete project?</h2>
              <p id="delete-project-description">
                This will delete <strong>{projectPendingDelete.name}</strong> from the project library.
              </p>
              <div className="project-delete-modal-actions">
                <button type="button" onClick={closeDeleteModal}>
                  Cancel
                </button>
                <button className="project-delete-confirm-button" type="button" onClick={confirmDeleteProject}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function CreateProjectPanel({
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
}: Pick<
  ProjectLibraryProps,
  | "selectedPresetId"
  | "orientation"
  | "template"
  | "projectName"
  | "createSize"
  | "draftProject"
  | "onPresetChange"
  | "onOrientationChange"
  | "onTemplateChange"
  | "onProjectNameChange"
> & {
  mode: "create" | "edit";
  onSubmit: () => void;
}) {
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

function ProjectPreview({ project, compact = false }: { project: UiProject; compact?: boolean }) {
  const screen = project.screens.find((item) => item.id === project.initialScreenId) ?? project.screens[0];
  const layout = screen ? layoutTree(screen, project.display.width, project.display.height) : null;
  const maxWidth = compact ? 116 : 190;
  const maxHeight = compact ? 92 : 124;
  const scale = Math.min(maxWidth / project.display.width, maxHeight / project.display.height);
  const previewWidth = Math.max(1, Math.round(project.display.width * scale));
  const previewHeight = Math.max(1, Math.round(project.display.height * scale));
  const sizeLabelGap = compact ? 8 : 10;

  return (
    <div className={compact ? "project-preview is-compact" : "project-preview"}>
      <div
        className="project-preview-canvas"
        style={{
          width: maxWidth,
          height: maxHeight,
          "--preview-screen-width": `${previewWidth}px`,
          "--preview-screen-height": `${previewHeight}px`,
          "--preview-size-label-gap": `${sizeLabelGap}px`,
        } as React.CSSProperties}
      >
        <div className="project-preview-size-label project-preview-size-label-width">{project.display.width}</div>
        <div className="project-preview-size-label project-preview-size-label-height">{project.display.height}</div>
        <div
          className="project-preview-screen"
          style={{
            width: previewWidth,
            height: previewHeight,
          }}
        >
          {layout ? (
            <div
              className="project-preview-scaled-content"
              style={{
                width: project.display.width,
                height: project.display.height,
                transform: `scale(${scale})`,
              }}
            >
              <PreviewNode
                layoutNode={layout}
                ctx={{
                  palette: project.palette,
                  selectedId: null,
                  movableId: null,
                  dragPreview: null,
                  onSelect: () => undefined,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function makeProjectFromTemplate(card: ProjectCard): UiProject {
  const nextProject =
    card.template === "hello"
      ? helloSample()
      : emptyProject({
          id: card.id,
          name: card.name,
          width: card.width,
          height: card.height,
        });
  nextProject.id = card.id;
  nextProject.name = card.name;
  return card.template === "hello" ? resizeProject(nextProject, card.width, card.height) : nextProject;
}

function resizeProject(project: UiProject, width: number, height: number): UiProject {
  const previousWidth = project.display.width || width;
  const previousHeight = project.display.height || height;
  const scaleX = width / previousWidth;
  const scaleY = height / previousHeight;
  project.display.width = width;
  project.display.height = height;

  for (const screen of project.screens) {
    screen.width = width;
    screen.height = height;
    scaleNodeFrames(screen, scaleX, scaleY);
  }

  return project;
}

function scaleNodeFrames(node: WidgetNode, scaleX: number, scaleY: number): void {
  if (node.frame) {
    node.frame = {
      x: Math.round(node.frame.x * scaleX),
      y: Math.round(node.frame.y * scaleY),
      width: Math.max(1, Math.round(node.frame.width * scaleX)),
      height: Math.max(1, Math.round(node.frame.height * scaleY)),
    };
  }
  for (const child of node.children ?? []) {
    scaleNodeFrames(child, scaleX, scaleY);
  }
}

function orientSize(width: number, height: number, orientation: Orientation) {
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  if (min === max) return { width, height };
  return orientation === "portrait" ? { width: min, height: max } : { width: max, height: min };
}

function findPresetIdForSize(width: number, height: number): string {
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  return (
    DISPLAY_PRESETS.find((preset) => Math.min(preset.width, preset.height) === min && Math.max(preset.width, preset.height) === max)
      ?.id ?? DEFAULT_PRESET_ID
  );
}

function formatEditedAt(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60_000));
  return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
}

function templateLabel(template: TemplateId): string {
  return template === "hello" ? "Hello" : "Blank";
}

function cloneProject(project: UiProject): UiProject {
  return JSON.parse(JSON.stringify(project)) as UiProject;
}
