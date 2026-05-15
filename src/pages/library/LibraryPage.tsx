import { useMemo, useState } from "react";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import { cloneProject } from "@entities/ui-project/model/tree-ops";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";
import {
  makeProjectFromTemplate,
  resizeProject,
} from "@entities/ui-project/lib/projectTemplates";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";
import { IconButton } from "@shared/ui/IconButton";
import logoUrl from "@shared/assets/logo.svg";

import { CreateProjectPanel } from "./CreateProjectPanel";
import { ProjectPreview } from "./ProjectPreview";
import {
  findPresetIdForSize,
  formatEditedAt,
  orientSize,
  templateLabel,
  type Orientation,
  type ProjectCard,
} from "./lib/library-helpers";

interface LibraryPageProps {
  projects: ProjectCard[];
  onOpenProject: (project: ProjectCard) => void;
  onCreateProject: (card: ProjectCard) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (card: ProjectCard) => void;
}

export function LibraryPage({
  projects,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
  onUpdateProject,
}: LibraryPageProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET_ID);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [template, setTemplate] = useState<TemplateId>("blank");
  const [projectName, setProjectName] = useState("Untitled");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectEditing, setProjectEditing] = useState<ProjectCard | null>(null);
  const [editPresetId, setEditPresetId] = useState(DEFAULT_PRESET_ID);
  const [editOrientation, setEditOrientation] = useState<Orientation>("landscape");
  const [editTemplate, setEditTemplate] = useState<TemplateId>("blank");
  const [editProjectName, setEditProjectName] = useState("Untitled");
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectCard | null>(null);

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
      }),
    [createSize.height, createSize.width, projectName, template],
  );

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

  const handleCreate = () => {
    const createdAt = new Date();
    const nextName = projectName.trim() || "Untitled";
    const newProject = makeProjectFromTemplate({
      id: `project-${createdAt.getTime()}`,
      name: nextName,
      width: createSize.width,
      height: createSize.height,
      template,
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
    onCreateProject(card);
    setIsCreateModalOpen(false);
  };

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
              <button
                className="project-create-card-button"
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
              >
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
          <div
            className="project-create-modal-backdrop"
            role="presentation"
            onMouseDown={() => setIsCreateModalOpen(false)}
          >
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
                onPresetChange={setSelectedPresetId}
                onOrientationChange={setOrientation}
                onTemplateChange={setTemplate}
                onProjectNameChange={setProjectName}
                onSubmit={handleCreate}
              />
            </div>
          </div>
        ) : null}

        {projectEditing ? (
          <div
            className="project-create-modal-backdrop"
            role="presentation"
            onMouseDown={closeEditModal}
          >
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
          <div
            className="project-create-modal-backdrop"
            role="presentation"
            onMouseDown={closeDeleteModal}
          >
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
                <button
                  className="project-delete-confirm-button"
                  type="button"
                  onClick={confirmDeleteProject}
                >
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
