import { useEffect, useState } from "react";

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

export function App() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);

  const [view, setView] = useState<AppView>("library");
  const [projects, setProjects] = useState<ProjectCard[]>(() => [projectToCard(project)]);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>(
    isCanvasApiConfigured() ? "loading" : "local",
  );
  const [libraryError, setLibraryError] = useState<string | null>(null);
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
        setProjects(canvases.map(canvasToProjectCard).filter(Boolean) as ProjectCard[]);
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
    setProject(cloneProject(card.project));
    setView("editor");
  };

  const showLibrary = () => {
    const existing = projects.find((item) => item.id === project.id || item.project.id === project.id);
    const card = projectToCard(project, existing?.template);
    if (existing) {
      card.id = existing.id;
    }
    setProjects((items) => items.map((item) => (item.id === card.id ? card : item)));
    setView("library");
    void persistCanvas(card, persistCallbacks).then((saved) => {
      replaceProject(card.id, saved);
      if (saved.id !== card.id) {
        setProject(cloneProject(saved.project));
      }
    });
  };

  const createProject = async (card: ProjectCard) => {
    const saved = await persistNewCanvas(card, persistCallbacks);
    setProjects((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
    setProject(cloneProject(saved.project));
    setView("editor");
  };

  const deleteProject = (projectId: string) => {
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

  return <EditorPage onBackToLibrary={showLibrary} />;
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
    return card;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
