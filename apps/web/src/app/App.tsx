import { useEffect, useRef, useState } from "react";

import {
  canvasToProjectCard,
  createCanvas,
  deleteCanvas,
  isCanvasApiConfigured,
  isPersistedCanvasId,
  listCanvases,
  updateCanvas,
} from "@shared/api/canvases";
import { isApiConfigured } from "@shared/api/client";
import { useSessionStore } from "@entities/session/model/store";
import { useEditorStore } from "@entities/ui-project/model/store";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import { AuthPage } from "@pages/auth/AuthPage";
import type { AuthMode } from "@pages/auth/AuthPage";
import { EditorPage } from "@pages/editor/EditorPage";
import { LibraryPage } from "@pages/library/LibraryPage";
import type { ProjectCard } from "@pages/library/lib/library-helpers";
import { markProjectAsTemplate } from "@pages/library/lib/library-helpers";
import type { AutosaveStatus, LibraryStatus } from "@shared/lib/sync-status";
import { isProjectLimitReached } from "@shared/config/project-limits";
import { ApiError } from "@shared/api/client";

type AppView = "library" | "editor";
type ActiveProjectMeta = Pick<ProjectCard, "id" | "template" | "isTemplate" | "sourceTemplateId">;

const AUTOSAVE_DELAY_MS = 1000;
const LOCAL_DRAFT_PREFIX = "g2ui:project-draft:";

export function App() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);
  const sessionStatus = useSessionStore((s) => s.status);
  const sessionUser = useSessionStore((s) => s.user);
  const hydrateSession = useSessionStore((s) => s.hydrate);
  const logout = useSessionStore((s) => s.logout);

  const [view, setView] = useState<AppView>("library");
  const [authModalMode, setAuthModalMode] = useState<AuthMode | null>(null);
  const [projects, setProjects] = useState<ProjectCard[]>(() =>
    mergeLocalDrafts(isApiConfigured() ? [] : [projectToCard(project)]),
  );
  const [activeProjectMeta, setActiveProjectMeta] = useState<ActiveProjectMeta>({
    id: project.id,
    template: "hello",
    isTemplate: false,
  });
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>("local");
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("local");
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveTokenRef = useRef(0);
  const lastAutosavedSnapshotRef = useRef<string | null>(null);
  const suppressNextAutosaveRef = useRef(false);
  const skipNextRemoteLoadRef = useRef(false);
  const canSyncRemote = isCanvasApiConfigured() && sessionStatus === "authenticated";
  const isSignedIn = sessionStatus === "authenticated";
  const projectLimitReached = isProjectLimitReached(projects, canSyncRemote);
  const persistCallbacks: PersistCallbacks = {
    onSaving: () => setLibraryStatus("saving"),
    onSynced: () => {
      setLibraryStatus("synced");
      setLibraryError(null);
    },
    onError: (error) => {
      setLibraryStatus("error");
      setLibraryError(errorMessage(error));
    },
  };

  useEffect(() => {
    if (!isApiConfigured()) {
      useSessionStore.setState({ user: null, status: "guest" });
      return;
    }

    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (!isCanvasApiConfigured()) return;
    if (sessionStatus !== "authenticated") {
      setLibraryStatus("local");
      setLibraryError(null);
      setAutosaveStatus("local");
      setAutosaveError(null);
      return;
    }

    if (authModalMode !== null) return;
    if (skipNextRemoteLoadRef.current) {
      skipNextRemoteLoadRef.current = false;
      return;
    }

    let ignore = false;
    setLibraryStatus("loading");
    listCanvases()
      .then((canvases) => {
        if (ignore) return;
        setProjects(mergeLocalDrafts(canvases.map(canvasToProjectCard).filter(Boolean) as ProjectCard[]));
        setLibraryStatus("synced");
        setLibraryError(null);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setLibraryStatus("error");
        setLibraryError(errorMessage(error));
      });

    return () => {
      ignore = true;
    };
  }, [authModalMode, sessionStatus]);

  const openProject = (card: ProjectCard) => {
    const draft = readLocalDraft(card.id);
    const restoredFromDraft = !!draft && draft.savedAt.getTime() > card.updatedAt.getTime();
    const nextCard = restoredFromDraft ? draft.card : card;
    setActiveProjectMeta(cardMeta(nextCard));
    lastAutosavedSnapshotRef.current = restoredFromDraft ? null : JSON.stringify(nextCard.project);
    suppressNextAutosaveRef.current = !restoredFromDraft;
    setAutosaveStatus(restoredFromDraft ? "unsynced" : canSyncRemote ? "saved" : "local");
    setAutosaveError(null);
    setProject(cloneProject(nextCard.project));
    setView("editor");
  };

  const showLibrary = () => {
    const existing = projects.find((item) => item.id === project.id || item.project.id === project.id);
    const card = projectToCard(project, {
      template: existing?.template ?? "hello",
      isTemplate: existing?.isTemplate,
      sourceTemplateId: existing?.sourceTemplateId,
    });
    if (existing) {
      card.id = existing.id;
    }
    setActiveProjectMeta(cardMeta(card));
    setProjects((items) => items.map((item) => (item.id === card.id ? card : item)));
    setView("library");
    void persistCanvas(card, persistCallbacks, canSyncRemote).then((saved) => {
      replaceProject(card.id, saved);
      if (saved.id !== card.id) {
        moveLocalDraft(card.id, saved.id, saved);
        setActiveProjectMeta(cardMeta(saved));
        setProject(cloneProject(saved.project));
      }
    });
  };

  const createProject = async (card: ProjectCard) => {
    try {
      const saved = await persistNewCanvas(card, persistCallbacks, canSyncRemote);
      const isSavedRemotely = canSyncRemote && isPersistedCanvasId(saved.id);
      if (canSyncRemote && !isSavedRemotely) return;

      setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setActiveProjectMeta(cardMeta(saved));
      lastAutosavedSnapshotRef.current = isSavedRemotely ? JSON.stringify(saved.project) : null;
      suppressNextAutosaveRef.current = isSavedRemotely;
      setAutosaveStatus(isSavedRemotely ? "saved" : "unsynced");
      setAutosaveError(null);
      setProject(cloneProject(saved.project));
      setView("editor");
    } catch {
      // Error message is surfaced through library status callbacks.
    }
  };

  const copyProject = async (card: ProjectCard) => {
    try {
      const saved = await persistNewCanvas(card, persistCallbacks, canSyncRemote);
      if (canSyncRemote && !isPersistedCanvasId(saved.id)) return;
      setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
    } catch {
      // Error message is surfaced through library status callbacks.
    }
  };

  const deleteProject = (projectId: string) => {
    removeLocalDraft(projectId);
    setProjects((items) => items.filter((item) => item.id !== projectId));
    if (canSyncRemote && isPersistedCanvasId(projectId)) {
      setLibraryStatus("saving");
      deleteCanvas(projectId)
        .then(() => {
          setLibraryStatus("synced");
          setLibraryError(null);
        })
        .catch((error: unknown) => {
          setLibraryStatus("error");
          setLibraryError(errorMessage(error));
        });
    }
  };

  const updateProject = (card: ProjectCard) => {
    setProjects((items) => items.map((item) => (item.id === card.id ? card : item)));
    if (project.id === card.id) {
      setProject(cloneProject(card.project));
    }
    void persistCanvas(card, persistCallbacks, canSyncRemote).then((saved) => {
      replaceProject(card.id, saved);
      if (project.id === card.id && saved.id !== card.id) {
        setProject(cloneProject(saved.project));
      }
    });
  };

  const replaceProject = (previousId: string, saved: ProjectCard) => {
    setProjects((items) =>
      items.map((item) => (item.id === previousId || item.id === saved.id ? saved : item)),
    );
  };

  const currentProjectCard = (): ProjectCard => {
    const existing = projects.find((item) => item.id === activeProjectMeta.id);
    if (view === "library" && existing) {
      return { ...existing, project: cloneProject(existing.project) };
    }

    const card = projectToCard(project, existing ?? activeProjectMeta);
    card.id = activeProjectMeta.id;
    return {
      ...card,
      template: existing?.template ?? activeProjectMeta.template,
      isTemplate: existing?.isTemplate ?? activeProjectMeta.isTemplate,
      sourceTemplateId: existing?.sourceTemplateId ?? activeProjectMeta.sourceTemplateId,
    };
  };

  const hasCurrentProjectToPersist = (): boolean => {
    return view === "editor" || projects.some((item) => item.id === activeProjectMeta.id);
  };

  const loadRemoteProjects = async (preferredCard?: ProjectCard): Promise<void> => {
    if (!isCanvasApiConfigured()) return;

    setLibraryStatus("loading");
    try {
      const canvases = await listCanvases();
      const remoteCards = canvases.map(canvasToProjectCard).filter(Boolean) as ProjectCard[];
      const nextProjects = mergeLocalDrafts(remoteCards);
      setProjects(nextProjects);
      setLibraryStatus("synced");
      setLibraryError(null);

      const activeCard =
        (preferredCard ? nextProjects.find((item) => item.id === preferredCard.id) : null) ??
        preferredCard ??
        nextProjects[0];
      if (activeCard) {
        setActiveProjectMeta(cardMeta(activeCard));
        lastAutosavedSnapshotRef.current = JSON.stringify(activeCard.project);
        suppressNextAutosaveRef.current = true;
        setProject(cloneProject(activeCard.project));
      }
    } catch (error) {
      setLibraryStatus("error");
      setLibraryError(errorMessage(error));
    }
  };

  const persistCurrentProjectToAccount = async (): Promise<ProjectCard | undefined> => {
    if (!isCanvasApiConfigured()) return undefined;
    if (!hasCurrentProjectToPersist()) return undefined;

    const card = currentProjectCard();
    setLibraryStatus("saving");
    const saved = await persistCanvas(card, undefined, true);
    setProjects((items) => upsertProjectCard(items.filter((item) => item.id !== card.id), saved));
    removeLocalDraft(card.id);
    removeLocalDraft(saved.id);
    setActiveProjectMeta(cardMeta(saved));
    lastAutosavedSnapshotRef.current = JSON.stringify(saved.project);
    suppressNextAutosaveRef.current = true;
    setAutosaveStatus("saved");
    setAutosaveError(null);
    setProject(cloneProject(saved.project));
    setLibraryStatus("synced");
    setLibraryError(null);
    return saved;
  };

  const handleAuthenticated = async () => {
    try {
      const saved = await persistCurrentProjectToAccount();
      await loadRemoteProjects(saved);
    } catch (error: unknown) {
      setLibraryStatus("error");
      setLibraryError(errorMessage(error));
    }
    skipNextRemoteLoadRef.current = true;
    setAuthModalMode(null);
  };

  useEffect(() => {
    if (view !== "editor") return;

    if (suppressNextAutosaveRef.current) {
      suppressNextAutosaveRef.current = false;
      return;
    }

    const card = projectToCard(project, activeProjectMeta);
    card.id = activeProjectMeta.id;
    const snapshot = JSON.stringify(card.project);
    const savedAt = new Date();

    writeLocalDraft(card, savedAt);
    setProjects((items) => upsertProjectCard(items, { ...card, updatedAt: savedAt }));

    if (snapshot === lastAutosavedSnapshotRef.current) return;

    if (!canSyncRemote) {
      setAutosaveStatus("local");
      return;
    }

    setAutosaveStatus("unsynced");
    setAutosaveError(null);

    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    const token = ++autosaveTokenRef.current;
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null;
      setAutosaveStatus("saving");
      void persistCanvas(card, undefined, canSyncRemote)
        .then((saved) => {
          if (token !== autosaveTokenRef.current) return;
          lastAutosavedSnapshotRef.current = JSON.stringify(saved.project);
          setAutosaveStatus("saved");
          setAutosaveError(null);
          replaceProject(card.id, saved);
          removeLocalDraft(card.id);
          if (saved.id !== card.id) {
            removeLocalDraft(saved.id);
            setActiveProjectMeta(cardMeta(saved));
            suppressNextAutosaveRef.current = true;
            setProject(cloneProject(saved.project));
          }
        })
        .catch((error: unknown) => {
          if (token !== autosaveTokenRef.current) return;
          setAutosaveStatus("error");
          setAutosaveError(errorMessage(error));
        });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [activeProjectMeta, canSyncRemote, project, setProject, view]);

  const handleLogout = () => {
    logout();
    setView("library");
    setLibraryStatus("local");
    setLibraryError(null);
    setAutosaveStatus("local");
    setAutosaveError(null);
  };

  if (view === "library") {
    return (
      <>
        <LibraryPage
          projects={projects}
          status={libraryStatus}
          error={libraryError}
          userEmail={sessionUser?.email ?? null}
          projectLimitReached={projectLimitReached}
          onOpenProject={openProject}
          onCreateProject={createProject}
          onCopyProject={copyProject}
          onDeleteProject={deleteProject}
          onUpdateProject={updateProject}
          onOpenAuth={isApiConfigured() && !isSignedIn ? setAuthModalMode : undefined}
          onLogout={isSignedIn ? handleLogout : undefined}
        />
        <AuthPage
          open={authModalMode !== null}
          initialMode={authModalMode ?? "login"}
          onClose={() => setAuthModalMode(null)}
          onAuthenticated={handleAuthenticated}
        />
      </>
    );
  }

  return (
    <>
      <EditorPage
        autosaveStatus={autosaveStatus}
        autosaveError={autosaveError}
        userEmail={sessionUser?.email ?? null}
        isTemplate={Boolean(activeProjectMeta.isTemplate)}
        onToggleTemplate={() => {
          const existing = projects.find((item) => item.id === activeProjectMeta.id);
          const current = existing
            ? { ...existing, project: cloneProject(existing.project) }
            : currentProjectCard();
          const next = markProjectAsTemplate(current, !current.isTemplate);
          setActiveProjectMeta(cardMeta(next));
          updateProject(next);
        }}
        onOpenAuth={isApiConfigured() && !isSignedIn ? setAuthModalMode : undefined}
        onLogout={isSignedIn ? handleLogout : undefined}
        onBackToLibrary={showLibrary}
      />
      <AuthPage
        open={authModalMode !== null}
        initialMode={authModalMode ?? "login"}
        onClose={() => setAuthModalMode(null)}
        onAuthenticated={handleAuthenticated}
      />
    </>
  );
}

function cardMeta(card: Pick<ProjectCard, "id" | "template" | "isTemplate" | "sourceTemplateId">): ActiveProjectMeta {
  return {
    id: card.id,
    template: card.template,
    isTemplate: Boolean(card.isTemplate),
    sourceTemplateId: card.sourceTemplateId,
  };
}

function projectToCard(
  project: ProjectCard["project"],
  meta: Pick<ProjectCard, "template" | "isTemplate" | "sourceTemplateId"> = { template: "hello" },
): ProjectCard {
  return {
    id: project.id,
    name: project.name,
    width: project.display.width,
    height: project.display.height,
    template: meta.template,
    isTemplate: Boolean(meta.isTemplate),
    sourceTemplateId: meta.sourceTemplateId,
    updatedAt: new Date(),
    project: cloneProject(project),
  };
}

function upsertProjectCard(items: ProjectCard[], card: ProjectCard): ProjectCard[] {
  const nextCard = { ...card, project: cloneProject(card.project) };
  if (items.some((item) => item.id === nextCard.id)) {
    return items.map((item) => (item.id === nextCard.id ? nextCard : item));
  }
  return [nextCard, ...items];
}

interface StoredProjectCard extends Omit<ProjectCard, "updatedAt"> {
  updatedAt: string;
}

interface LocalProjectDraft {
  savedAt: string;
  card: StoredProjectCard;
}

function draftKey(projectId: string): string {
  return `${LOCAL_DRAFT_PREFIX}${projectId}`;
}

function serializeCard(card: ProjectCard): StoredProjectCard {
  return {
    ...card,
    updatedAt: card.updatedAt.toISOString(),
    project: cloneProject(card.project),
  };
}

function deserializeCard(card: StoredProjectCard): ProjectCard {
  return {
    ...card,
    updatedAt: new Date(card.updatedAt),
    project: cloneProject(card.project),
  };
}

function readLocalDraft(projectId: string): { savedAt: Date; card: ProjectCard } | null {
  try {
    const raw = window.localStorage.getItem(draftKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalProjectDraft;
    return {
      savedAt: new Date(parsed.savedAt),
      card: deserializeCard(parsed.card),
    };
  } catch {
    return null;
  }
}

function writeLocalDraft(card: ProjectCard, savedAt: Date): void {
  try {
    const draft: LocalProjectDraft = {
      savedAt: savedAt.toISOString(),
      card: serializeCard({ ...card, updatedAt: savedAt }),
    };
    window.localStorage.setItem(draftKey(card.id), JSON.stringify(draft));
  } catch {
    // Local draft is a best-effort safety net; backend sync still proceeds.
  }
}

function removeLocalDraft(projectId: string): void {
  try {
    window.localStorage.removeItem(draftKey(projectId));
  } catch {
    // Ignore storage failures.
  }
}

function moveLocalDraft(previousId: string, nextId: string, card: ProjectCard): void {
  const draft = readLocalDraft(previousId);
  if (!draft) return;
  writeLocalDraft({ ...draft.card, id: nextId, project: cloneProject(card.project) }, draft.savedAt);
  removeLocalDraft(previousId);
}

function readAllLocalDrafts(): Array<{ savedAt: Date; card: ProjectCard }> {
  const drafts: Array<{ savedAt: Date; card: ProjectCard }> = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(LOCAL_DRAFT_PREFIX)) continue;
      const draft = readLocalDraft(key.slice(LOCAL_DRAFT_PREFIX.length));
      if (draft) drafts.push(draft);
    }
  } catch {
    return drafts;
  }
  return drafts;
}

function mergeLocalDrafts(cards: ProjectCard[]): ProjectCard[] {
  const byId = new Map<string, ProjectCard>();
  for (const card of cards) {
    byId.set(card.id, { ...card, project: cloneProject(card.project) });
  }
  for (const draft of readAllLocalDrafts()) {
    const existing = byId.get(draft.card.id);
    if (!existing || draft.savedAt.getTime() > existing.updatedAt.getTime()) {
      byId.set(draft.card.id, {
        ...draft.card,
        updatedAt: draft.savedAt,
        project: cloneProject(draft.card.project),
      });
    }
  }
  return [...byId.values()].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

interface PersistCallbacks {
  onSaving: () => void;
  onSynced: () => void;
  onError: (error: unknown) => void;
}

async function persistNewCanvas(
  card: ProjectCard,
  callbacks: PersistCallbacks,
  remoteEnabled: boolean,
): Promise<ProjectCard> {
  if (!remoteEnabled) return card;

  try {
    callbacks.onSaving();
    const canvas = await createCanvas(card);
    const saved = canvasToProjectCard(canvas) ?? card;
    if (saved.id !== card.id) {
      await updateCanvas(saved);
    }
    callbacks.onSynced();
    return saved;
  } catch (error) {
    callbacks.onError(error);
    if (error instanceof ApiError && error.status === 409) {
      throw error;
    }
    return card;
  }
}

async function persistCanvas(
  card: ProjectCard,
  callbacks?: PersistCallbacks,
  remoteEnabled = isCanvasApiConfigured(),
): Promise<ProjectCard> {
  if (!remoteEnabled) return card;
  try {
    callbacks?.onSaving();
    const wasPersisted = isPersistedCanvasId(card.id);
    const canvas = wasPersisted ? await updateCanvas(card) : await createCanvas(card);
    const saved = canvasToProjectCard(canvas) ?? card;
    if (!wasPersisted && saved.id !== card.id) {
      await updateCanvas(saved);
    }
    callbacks?.onSynced();
    return saved;
  } catch (error) {
    callbacks?.onError(error);
    if (!callbacks) throw error;
    return card;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
