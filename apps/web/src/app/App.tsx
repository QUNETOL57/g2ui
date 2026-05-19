import { useState } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import { EditorPage } from "@pages/editor/EditorPage";
import { LibraryPage } from "@pages/library/LibraryPage";
import type { ProjectCard } from "@pages/library/lib/library-helpers";

type AppView = "library" | "editor";

export function App() {
  const project = useEditorStore((s) => s.project);
  const setProject = useEditorStore((s) => s.setProject);

  const [view, setView] = useState<AppView>("library");
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

  const createProject = (card: ProjectCard) => {
    setProjects((items) => [card, ...items.filter((item) => item.id !== card.id)]);
    setProject(cloneProject(card.project));
    setView("editor");
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

  if (view === "library") {
    return (
      <LibraryPage
        projects={projects}
        onOpenProject={openProject}
        onCreateProject={createProject}
        onDeleteProject={deleteProject}
        onUpdateProject={updateProject}
      />
    );
  }

  return <EditorPage onBackToLibrary={showLibrary} />;
}
