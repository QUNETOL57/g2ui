import { useMemo, useState } from "react";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloudDoneOutlinedIcon from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlinedIcon from "@mui/icons-material/CloudOffOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ExtensionIcon from "@mui/icons-material/Extension";
import ControlPointDuplicateOutlinedIcon from "@mui/icons-material/ControlPointDuplicateOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SyncOutlinedIcon from "@mui/icons-material/SyncOutlined";

import { cloneProject } from "@entities/ui-project/model/tree-ops";
import { resizeProject } from "@entities/ui-project/lib/projectTemplates";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";
import { MAX_PROJECTS_PER_USER } from "@shared/config/project-limits";
import {
  formatLibraryStatusLabel,
  libraryStatusToDataStatus,
  type LibraryStatus,
} from "@shared/lib/sync-status";
import { BrandLogo } from "@shared/ui/BrandLogo";
import { Button } from "@shared/ui/Button";
import { CustomSelect } from "@shared/ui/CustomSelect";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";
import { TopBar } from "@shared/ui/TopBar";
import { SignInButton } from "@shared/ui/SignInButton";
import { UserAccountMenu } from "@shared/ui/UserAccountMenu";
import type { AuthMode } from "@pages/auth/AuthPage";
import statusBarStyles from "@widgets/editor-status-bar/EditorStatusBar.module.css";

import { CreateProjectPanel } from "./CreateProjectPanel";
import styles from "./LibraryPage.module.css";
import { ProjectPreview } from "@widgets/project-preview/ProjectPreview";
import {
  DEFAULT_LIBRARY_SORT,
  DEFAULT_LIBRARY_SORT_DIRECTION,
  findPresetIdForSize,
  copyProjectCard,
  createProjectCardFromSelection,
  draftProjectFromSelection,
  formatEditedAt,
  isLibrarySortBy,
  LIBRARY_SORT_DIRECTION,
  LIBRARY_SORT_OPTIONS,
  listCustomTemplates,
  orientSize,
  sortProjectCards,
  templateLabel,
  type LibrarySortBy,
  type LibrarySortDirection,
  type Orientation,
  type ProjectCard,
} from "./lib/library-helpers";

interface LibraryPageProps {
  projects: ProjectCard[];
  status?: LibraryStatus;
  error?: string | null;
  userEmail?: string | null;
  onOpenProject: (project: ProjectCard) => void;
  onCreateProject: (card: ProjectCard) => void;
  onCopyProject: (card: ProjectCard) => void;
  onDeleteProject: (projectId: string) => void;
  onUpdateProject: (card: ProjectCard) => void;
  projectLimitReached?: boolean;
  onOpenAuth?: (mode: AuthMode) => void;
  onLogout?: () => void;
}

export function LibraryPage({
  projects,
  status = "local",
  error = null,
  userEmail = null,
  onOpenProject,
  onCreateProject,
  onCopyProject,
  onDeleteProject,
  onUpdateProject,
  projectLimitReached = false,
  onOpenAuth,
  onLogout,
}: LibraryPageProps) {
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET_ID);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [template, setTemplate] = useState("blank");
  const [projectName, setProjectName] = useState("Untitled");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectEditing, setProjectEditing] = useState<ProjectCard | null>(null);
  const [editPresetId, setEditPresetId] = useState(DEFAULT_PRESET_ID);
  const [editOrientation, setEditOrientation] = useState<Orientation>("landscape");
  const [editTemplate, setEditTemplate] = useState("blank");
  const [editProjectName, setEditProjectName] = useState("Untitled");
  const [projectPendingDelete, setProjectPendingDelete] = useState<ProjectCard | null>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [sortBy, setSortBy] = useState<LibrarySortBy>(DEFAULT_LIBRARY_SORT);
  const [sortDirection, setSortDirection] = useState<LibrarySortDirection>(
    DEFAULT_LIBRARY_SORT_DIRECTION,
  );

  const selectedPreset = useMemo(
    () => DISPLAY_PRESETS.find((preset) => preset.id === selectedPresetId) ?? DISPLAY_PRESETS[0],
    [selectedPresetId],
  );
  const createSize = useMemo(
    () => orientSize(selectedPreset.width, selectedPreset.height, orientation),
    [orientation, selectedPreset.height, selectedPreset.width],
  );
  const customTemplates = useMemo(() => listCustomTemplates(projects), [projects]);
  const sortOptions = useMemo(
    () =>
      LIBRARY_SORT_OPTIONS.map((option) => ({
        ...option,
        icon:
          option.value === "updatedAt" ? (
            <HistoryOutlinedIcon fontSize="inherit" />
          ) : (
            <CalendarTodayOutlinedIcon fontSize="inherit" />
          ),
      })),
    [],
  );
  const sortedProjects = useMemo(
    () => sortProjectCards(projects, sortBy, sortDirection),
    [projects, sortBy, sortDirection],
  );
  const isSortDescending = sortDirection === LIBRARY_SORT_DIRECTION.desc;
  const draftProject = useMemo(
    () =>
      draftProjectFromSelection({
        selection: template,
        projects,
        id: "draft",
        name: projectName.trim() || "Untitled",
        width: createSize.width,
        height: createSize.height,
      }),
    [createSize.height, createSize.width, projectName, projects, template],
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

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    requestAnimationFrame(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
  };

  const handleCreate = () => {
    const card = createProjectCardFromSelection({
      selection: template,
      projects,
      name: projectName,
      width: createSize.width,
      height: createSize.height,
    });
    onCreateProject(card);
    closeCreateModal();
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
      template: projectEditing.template,
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
  const confirmLogout = () => {
    setIsLogoutConfirmOpen(false);
    onLogout?.();
  };
  const canCreateProject = !projectLimitReached;
  const showCreateCard = canCreateProject || projectLimitReached;

  return (
    <main className={styles.libraryPage}>
      <TopBar className={styles.libraryTopBar}>
        <BrandLogo />
        <TopBar.Controls>
          {onLogout && userEmail ? (
            <UserAccountMenu
              userEmail={userEmail}
              onSignOut={() => setIsLogoutConfirmOpen(true)}
            />
          ) : onOpenAuth ? (
            <SignInButton onClick={() => onOpenAuth("login")} />
          ) : null}
        </TopBar.Controls>
      </TopBar>

      <section className={styles.libraryContent}>
        <div className={styles.gridSection}>
          <div className={styles.gridToolbar}>
            <div className={styles.sortControls}>
              <CustomSelect
                className={styles.sortSelect}
                size="sm"
                ariaLabel="Sort projects"
                value={sortBy}
                options={sortOptions}
                onChange={(value) => {
                  if (isLibrarySortBy(value)) setSortBy(value);
                }}
              />
              <IconButton
                className={styles.sortDirection}
                tooltip={isSortDescending ? "Newest first" : "Oldest first"}
                aria-label={isSortDescending ? "Sort newest first" : "Sort oldest first"}
                onClick={() =>
                  setSortDirection((current) =>
                    current === LIBRARY_SORT_DIRECTION.desc
                      ? LIBRARY_SORT_DIRECTION.asc
                      : LIBRARY_SORT_DIRECTION.desc,
                  )
                }
              >
                {isSortDescending ? (
                  <ArrowDownwardRoundedIcon fontSize="inherit" />
                ) : (
                  <ArrowUpwardRoundedIcon fontSize="inherit" />
                )}
              </IconButton>
            </div>
          </div>
          <div className={styles.cardGrid}>
            {showCreateCard ? (
              <article className={`${styles.card} ${styles.createCard}`}>
                {canCreateProject ? (
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
                ) : (
                  <div className={styles.createCardLimit} aria-live="polite">
                    <span className={styles.createCardIcon} aria-hidden="true">
                      <AddRoundedIcon />
                    </span>
                    <strong>Project limit reached</strong>
                    <small>Maximum {MAX_PROJECTS_PER_USER} projects per account</small>
                  </div>
                )}
              </article>
            ) : null}
            {sortedProjects.map((item) => (
              <article className={styles.card} key={item.id}>
                {item.isTemplate ? (
                  <IconButton
                    className={styles.templateBadge}
                    variant="ghost"
                    aria-label="Template"
                    aria-disabled="true"
                    tooltip="This project is a template"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                  >
                    <ExtensionIcon fontSize="inherit" />
                  </IconButton>
                ) : null}
                {!projectLimitReached ? (
                  <IconButton
                    className={styles.copyButton}
                    tooltip={`Copy ${item.name}`}
                    aria-label={`Copy ${item.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onCopyProject(copyProjectCard(item));
                    }}
                  >
                    <ControlPointDuplicateOutlinedIcon fontSize="inherit" />
                  </IconButton>
                ) : null}
                <IconButton
                  className={styles.editButton}
                  tooltip={`Edit ${item.name}`}
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
                  tooltip={`Delete ${item.name}`}
                  aria-label={`Delete ${item.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setProjectPendingDelete(item);
                  }}
                >
                  <DeleteOutlineOutlinedIcon fontSize="inherit" />
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
                        {item.width} × {item.height} ·{" "}
                        {templateLabel(
                          item.template,
                          item.sourceTemplateId
                            ? projects.find((entry) => entry.id === item.sourceTemplateId)?.name
                            : undefined,
                        )}{" "}
                        · Edited {formatEditedAt(item.updatedAt)}
                      </span>
                    </div>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>

        <Modal
          open={isCreateModalOpen}
          onClose={closeCreateModal}
          size="md"
          closeOnBackdrop={false}
        >
          <IconButton
            className={styles.modalClose}
            aria-label="Close create project"
            title="Close"
            onClick={closeCreateModal}
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
            customTemplates={customTemplates}
            onPresetChange={setSelectedPresetId}
            onOrientationChange={setOrientation}
            onTemplateChange={setTemplate}
            onProjectNameChange={setProjectName}
            onSubmit={handleCreate}
          />
        </Modal>

        <Modal
          open={Boolean(projectEditing)}
          onClose={closeEditModal}
          size="md"
          closeOnBackdrop={false}
        >
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
          closeOnBackdrop={false}
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

        <Modal
          open={isLogoutConfirmOpen}
          onClose={() => setIsLogoutConfirmOpen(false)}
          size="sm"
          className={styles.deleteDialog}
          closeOnBackdrop={false}
        >
          <h2>Sign out?</h2>
          <p>You will leave this account. Local drafts will stay in this browser.</p>
          <div className={styles.deleteActions}>
            <Button type="button" size="sm" onClick={() => setIsLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={confirmLogout}>
              Sign out
            </Button>
          </div>
        </Modal>
      </section>
      <LibraryStatusBar status={status} error={error} userEmail={userEmail} />
    </main>
  );
}

function LibraryStatusBar({
  status,
  error,
  userEmail,
}: {
  status: NonNullable<LibraryPageProps["status"]>;
  error: string | null;
  userEmail: string | null;
}) {
  const label = formatLibraryStatusLabel(status, error);
  const Icon = LIBRARY_STATUS_ICONS[status];
  return (
    <footer className={`${statusBarStyles.statusBar} ${styles.libraryStatusBar}`}>
      <div
        className={statusBarStyles.statusItem}
        data-status={libraryStatusToDataStatus(status)}
        title={label}
        aria-live="polite"
      >
        <Icon fontSize="small" aria-hidden />
        <span>{label}</span>
      </div>
      <div className={statusBarStyles.statusActions}>
        <div className={statusBarStyles.statusUser} title={userEmail ?? "Guest"}>
          <PersonOutlineOutlinedIcon fontSize="small" aria-hidden />
          <span>{userEmail ?? "Guest"}</span>
        </div>
      </div>
    </footer>
  );
}

const LIBRARY_STATUS_ICONS = {
  local: CloudOffOutlinedIcon,
  loading: SyncOutlinedIcon,
  saving: SyncOutlinedIcon,
  synced: CloudDoneOutlinedIcon,
  error: ErrorOutlineOutlinedIcon,
} as const satisfies Record<
  LibraryStatus,
  typeof CloudOffOutlinedIcon
>;
