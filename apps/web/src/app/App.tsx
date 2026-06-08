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
import { useEditorStore } from "@entities/ui-project/model/store";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import { EditorPage } from "@pages/editor/EditorPage";
import { LibraryPage } from "@pages/library/LibraryPage";
import type { ProjectCard } from "@pages/library/lib/library-helpers";
import type { TemplateId } from "@entities/ui-project/lib/projectTemplates";

type AppView = "library" | "editor";
type LibraryStatus = "local" | "loading" | "synced" | "saving" | "error";
type AutosaveStatus = "local" | "saved" | "saving" | "unsynced" | "error";

const AUTOSAVE_DELAY_MS = 1000;
const LOCAL_DRAFT_PREFIX = "guimintlab:project-draft:";

export function App() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);

  const [view, setView] = useState<AppView>("library");
  const [projects, setProjects] = useState<ProjectCard[]>(() => mergeLocalDrafts([projectToCard(project)]));
  const [activeProjectMeta, setActiveProjectMeta] = useState<Pick<ProjectCard, "id" | "template">>({
    id: project.id,
    template: "hello",
  });
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>(
    isCanvasApiConfigured() ? "loading" : "local",
  );
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>(
    isCanvasApiConfigured() ? "saved" : "local",
  );
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveTokenRef = useRef(0);
  const lastAutosavedSnapshotRef = useRef<string | null>(null);
  const suppressNextAutosaveRef = useRef(false);
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
    if (!isCanvasApiConfigured()) return;

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
  }, []);

  const openProject = (card: ProjectCard) => {
    const draft = readLocalDraft(card.id);
    const restoredFromDraft = !!draft && draft.savedAt.getTime() > card.updatedAt.getTime();
    const nextCard = restoredFromDraft ? draft.card : card;
    setActiveProjectMeta({ id: nextCard.id, template: nextCard.template });
    lastAutosavedSnapshotRef.current = restoredFromDraft ? null : JSON.stringify(nextCard.project);
    suppressNextAutosaveRef.current = !restoredFromDraft;
    setAutosaveStatus(restoredFromDraft ? "unsynced" : isCanvasApiConfigured() ? "saved" : "local");
    setAutosaveError(null);
    setProject(cloneProject(nextCard.project));
    setView("editor");
  };

  const showLibrary = () => {
    const existing = projects.find((item) => item.id === project.id || item.project.id === project.id);
    const card = projectToCard(project, existing?.template);
    if (existing) {
      card.id = existing.id;
    }
    setActiveProjectMeta({ id: card.id, template: card.template });
    setProjects((items) => items.map((item) => (item.id === card.id ? card : item)));
    setView("library");
    void persistCanvas(card, persistCallbacks).then((saved) => {
      replaceProject(card.id, saved);
      if (saved.id !== card.id) {
        moveLocalDraft(card.id, saved.id, saved);
        setActiveProjectMeta({ id: saved.id, template: saved.template });
        setProject(cloneProject(saved.project));
      }
    });
  };

  const createProject = async (card: ProjectCard) => {
    const saved = await persistNewCanvas(card, persistCallbacks);
    const isSavedRemotely = isCanvasApiConfigured() && isPersistedCanvasId(saved.id);
    setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
    setActiveProjectMeta({ id: saved.id, template: saved.template });
    lastAutosavedSnapshotRef.current = isSavedRemotely ? JSON.stringify(saved.project) : null;
    suppressNextAutosaveRef.current = isSavedRemotely;
    setAutosaveStatus(isSavedRemotely ? "saved" : "unsynced");
    setAutosaveError(null);
    setProject(cloneProject(saved.project));
    setView("editor");
  };

  const deleteProject = (projectId: string) => {
    removeLocalDraft(projectId);
    setProjects((items) => items.filter((item) => item.id !== projectId));
    if (isCanvasApiConfigured() && isPersistedCanvasId(projectId)) {
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
    void persistCanvas(card, persistCallbacks).then((saved) => {
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

  useEffect(() => {
    if (view !== "editor") return;

    if (suppressNextAutosaveRef.current) {
      suppressNextAutosaveRef.current = false;
      return;
    }

    const card = projectToCard(project, activeProjectMeta.template);
    card.id = activeProjectMeta.id;
    const snapshot = JSON.stringify(card.project);
    const savedAt = new Date();

    writeLocalDraft(card, savedAt);
    setProjects((items) => upsertProjectCard(items, { ...card, updatedAt: savedAt }));

    if (snapshot === lastAutosavedSnapshotRef.current) return;

    if (!isCanvasApiConfigured()) {
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
      void persistCanvas(card)
        .then((saved) => {
          if (token !== autosaveTokenRef.current) return;
          lastAutosavedSnapshotRef.current = JSON.stringify(saved.project);
          setAutosaveStatus("saved");
          setAutosaveError(null);
          replaceProject(card.id, saved);
          removeLocalDraft(card.id);
          if (saved.id !== card.id) {
            removeLocalDraft(saved.id);
            setActiveProjectMeta({ id: saved.id, template: saved.template });
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
  }, [activeProjectMeta.id, activeProjectMeta.template, project, setProject, view]);

  if (view === "library") {
    return (
      <LibraryPage
        projects={projects}
        status={libraryStatus}
        error={libraryError}
        onOpenProject={openProject}
        onCreateProject={createProject}
        onDeleteProject={deleteProject}
        onUpdateProject={updateProject}
      />
    );
  }

  return (
    <EditorPage
      autosaveStatus={autosaveStatus}
      autosaveError={autosaveError}
      onBackToLibrary={showLibrary}
    />
  );
}

function projectToCard(project: ProjectCard["project"], template: TemplateId = "hello"): ProjectCard {
  return {
    id: project.id,
    name: project.name,
    width: project.display.width,
    height: project.display.height,
    template,
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
): Promise<ProjectCard> {
  if (!isCanvasApiConfigured()) return card;

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
    return card;
  }
}

async function persistCanvas(
  card: ProjectCard,
  callbacks?: PersistCallbacks,
): Promise<ProjectCard> {
  if (!isCanvasApiConfigured()) return card;
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
