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
import { BrandLogo } from "@shared/ui/BrandLogo";
import { Button } from "@shared/ui/Button";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";
import { TopBar } from "@shared/ui/TopBar";

import { CreateProjectPanel } from "./CreateProjectPanel";
import styles from "./LibraryPage.module.css";
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
  status?: "local" | "loading" | "synced" | "saving" | "error";
  error?: string | null;
  onOpenProject: (project: ProjectCard) => void;
  onCreateProject: (card: ProjectCard) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (card: ProjectCard) => void;
}

export function LibraryPage({
  projects,
  status = "local",
  error = null,
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
    <main className={styles.libraryPage}>
      <TopBar>
        <BrandLogo />
        <span className={styles.syncStatus}>{statusLabel(status, error)}</span>
      </TopBar>

      <section className={styles.libraryContent}>
        <div className={styles.gridSection}>
          <div className={styles.cardGrid}>
            {projects.map((item) => (
              <article className={styles.card} key={item.id}>
                <IconButton
                  className={styles.editButton}
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
                  className={styles.deleteButton}
                  title={`Delete ${item.name}`}
                  aria-label={`Delete ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setProjectPendingDelete(item);
                  }}
                >
                  <CloseRoundedIcon />
                </IconButton>
                <button
                  className={styles.cardOpen}
                  type="button"
                  onClick={() => onOpenProject(item)}
                >
                  <ProjectPreview project={item.project} />
                  <div className={styles.cardFooter}>
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
            <article className={`${styles.card} ${styles.createCard}`}>
              <button
                className={styles.createCardButton}
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <span className={styles.createCardIcon} aria-hidden="true">
                  <AddRoundedIcon />
                </span>
                <strong>New project</strong>
                <small>Create display project</small>
              </button>
            </article>
          </div>
        </div>

        <Modal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} size="md">
          <IconButton
            className={styles.modalClose}
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
        </Modal>

        <Modal open={Boolean(projectEditing)} onClose={closeEditModal} size="md">
          {projectEditing ? (
            <>
              <IconButton
                className={styles.modalClose}
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
            </>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(projectPendingDelete)}
          onClose={closeDeleteModal}
          size="sm"
          className={styles.deleteDialog}
        >
          {projectPendingDelete ? (
            <>
              <h2 id="delete-project-title">Delete project?</h2>
              <p id="delete-project-description">
                This will delete <strong>{projectPendingDelete.name}</strong> from the project
                library.
              </p>
              <div className={styles.deleteActions}>
                <Button type="button" size="sm" onClick={closeDeleteModal}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={confirmDeleteProject}
                >
                  Delete
                </Button>
              </div>
            </>
          ) : null}
        </Modal>
      </section>
    </main>
  );
}

function statusLabel(status: NonNullable<LibraryPageProps["status"]>, error: string | null): string {
  if (status === "loading") return "Loading canvases...";
  if (status === "saving") return "Saving...";
  if (status === "synced") return "Synced with API";
  if (status === "error") return error ? `API error: ${error}` : "API error";
  return "Local mode";
}
