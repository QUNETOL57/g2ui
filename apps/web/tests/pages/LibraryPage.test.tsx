import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LibraryPage } from "@pages/library/LibraryPage";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";
import { cloneProject } from "@entities/ui-project/model/tree-ops";
import type { ProjectCard } from "@pages/library/lib/library-helpers";

function makeCard(id: string, name = "Demo"): ProjectCard {
  const project = makeProjectFromTemplate({
    id,
    name,
    width: 160,
    height: 128,
    template: "blank",
  });
  return {
    id,
    name,
    width: 160,
    height: 128,
    template: "blank",
    updatedAt: new Date(),
    project,
  };
}

function Harness({
  initial,
  spies,
}: {
  initial: ProjectCard[];
  spies?: {
    onOpen?: (card: ProjectCard) => void;
    onCreate?: (card: ProjectCard) => void;
    onCopy?: (card: ProjectCard) => void;
    onDelete?: (id: string) => void;
    onUpdate?: (card: ProjectCard) => void;
  };
}) {
  const [projects, setProjects] = useState<ProjectCard[]>(initial);
  return (
    <LibraryPage
      projects={projects}
      onOpenProject={(c) => spies?.onOpen?.(c)}
      onCreateProject={(c) => {
        setProjects((items) => [c, ...items]);
        spies?.onCreate?.(c);
      }}
      onCopyProject={(c) => {
        setProjects((items) => [c, ...items]);
        spies?.onCopy?.(c);
      }}
      onDeleteProject={(id) => {
        setProjects((items) => items.filter((p) => p.id !== id));
        spies?.onDelete?.(id);
      }}
      onUpdateProject={(c) => {
        setProjects((items) => items.map((p) => (p.id === c.id ? c : p)));
        spies?.onUpdate?.(c);
      }}
    />
  );
}

describe("LibraryPage: empty + listing", () => {
  it("renders only the New project card when projects are empty", () => {
    render(<Harness initial={[]} />);
    expect(screen.getByText("New project")).toBeInTheDocument();
  });

  it("renders existing project cards", () => {
    render(<Harness initial={[makeCard("p1", "First"), makeCard("p2", "Second")]} />);
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });
});

describe("LibraryPage: open project", () => {
  it("clicking a card calls onOpenProject", async () => {
    const onOpen = vi.fn();
    render(<Harness initial={[makeCard("p1", "First")]} spies={{ onOpen }} />);
    await userEvent.click(screen.getByText("First"));
    expect(onOpen).toHaveBeenCalled();
    expect(onOpen.mock.calls[0][0].id).toBe("p1");
  });
});

describe("LibraryPage: create flow", () => {
  it("opens the create modal", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /New project/i }));
    expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
    expect(screen.getByText(/Choose the display/i)).toBeInTheDocument();
  });

  it("creating a project adds card + closes modal", async () => {
    const onCreate = vi.fn();
    render(<Harness initial={[]} spies={{ onCreate }} />);
    await userEvent.click(screen.getByRole("button", { name: /New project/i }));
    const nameInput = screen.getByPlaceholderText("Untitled");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "MyApp");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(onCreate).toHaveBeenCalled();
    expect(screen.getByText("MyApp")).toBeInTheDocument();
  });

  it("close button closes the create modal", async () => {
    render(<Harness initial={[]} />);
    await userEvent.click(screen.getByRole("button", { name: /New project/i }));
    expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close create project" }));
    expect(screen.queryByRole("button", { name: "Create project" })).not.toBeInTheDocument();
  });
});

describe("LibraryPage: edit flow", () => {
  it("opens edit modal and persists name change", async () => {
    const onUpdate = vi.fn();
    render(<Harness initial={[makeCard("p1", "Original")]} spies={{ onUpdate }} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit Original" }));
    expect(screen.getByText("Edit project")).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue("Original");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onUpdate).toHaveBeenCalled();
    expect(screen.getByText("Renamed")).toBeInTheDocument();
  });
});

describe("LibraryPage: copy flow", () => {
  it("duplicates a project via copy button", async () => {
    const onCopy = vi.fn();
    const source = makeCard("p1", "Original");
    render(<Harness initial={[source]} spies={{ onCopy }} />);
    await userEvent.click(screen.getByRole("button", { name: "Copy Original" }));
    expect(onCopy).toHaveBeenCalled();
    const copied = onCopy.mock.calls[0][0] as ProjectCard;
    expect(copied.id).not.toBe("p1");
    expect(copied.name).toBe("Original copy");
    expect(copied.project.id).toBe(copied.id);
    expect(copied.project).not.toBe(source.project);
    expect(copied.project).toEqual(
      expect.objectContaining({
        name: "Original copy",
        display: source.project.display,
        screens: source.project.screens,
      }),
    );
    expect(screen.getByText("Original copy")).toBeInTheDocument();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });
});

describe("LibraryPage: delete flow", () => {
  it("opens delete confirmation modal and confirms", async () => {
    const onDelete = vi.fn();
    render(<Harness initial={[makeCard("p1", "ToRemove")]} spies={{ onDelete }} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete ToRemove" }));
    expect(screen.getByText("Delete project?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("p1");
    expect(screen.queryByText("ToRemove")).not.toBeInTheDocument();
  });

  it("cancel keeps the project", async () => {
    render(<Harness initial={[makeCard("p1", "Keep")]} />);
    await userEvent.click(screen.getByRole("button", { name: "Delete Keep" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Keep")).toBeInTheDocument();
  });
});
