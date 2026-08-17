import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LibraryPage } from "@pages/library/LibraryPage";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";
import type { ProjectCard } from "@pages/library/lib/library-helpers";
import { makeLabel, withChildren } from "../fixtures/projects";

function makeCard(id: string, name = "Demo", extras: Partial<ProjectCard> = {}): ProjectCard {
  const project = makeProjectFromTemplate({
    id,
    name,
    width: 160,
    height: 128,
    template: extras.template ?? "blank",
  });
  return {
    id,
    name,
    width: 160,
    height: 128,
    template: "blank",
    updatedAt: new Date(),
    project,
    ...extras,
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

describe("LibraryPage: custom templates", () => {
  it("shows a template badge only on marked cards", () => {
    render(
      <Harness
        initial={[makeCard("p1", "Plain"), makeCard("p2", "Marked", { isTemplate: true })]}
      />,
    );
    expect(screen.getByLabelText("Template")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Template")).toHaveLength(1);
  });

  it("shows a template tooltip on hover and does not open the project", async () => {
    const onOpen = vi.fn();
    render(
      <Harness initial={[makeCard("p1", "Marked", { isTemplate: true })]} spies={{ onOpen }} />,
    );
    const badge = screen.getByRole("button", { name: "Template" });
    expect(badge).toHaveAttribute("aria-disabled", "true");
    await userEvent.hover(badge);
    expect(screen.getByRole("tooltip")).toHaveTextContent("This project is a template");
    await userEvent.click(badge);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("removes the badge when the card is unmarked but keeps the project", async () => {
    function BadgeHarness() {
      const [projects, setProjects] = useState([makeCard("p1", "Marked", { isTemplate: true })]);
      return (
        <>
          <button type="button" onClick={() => setProjects((items) => items.map((item) => ({ ...item, isTemplate: false })))}>
            Unmark
          </button>
          <LibraryPage
            projects={projects}
            onOpenProject={() => undefined}
            onCreateProject={() => undefined}
            onCopyProject={() => undefined}
            onDeleteProject={() => undefined}
            onUpdateProject={(card) => setProjects((items) => items.map((item) => (item.id === card.id ? card : item)))}
          />
        </>
      );
    }

    render(<BadgeHarness />);
    expect(screen.getByLabelText("Template")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Unmark" }));
    expect(screen.queryByLabelText("Template")).not.toBeInTheDocument();
    expect(screen.getByText("Marked")).toBeInTheDocument();
  });

  it("creates a snapshot from a custom template and keeps descendants after unmarking", async () => {
    const sourceProject = withChildren(
      makeProjectFromTemplate({
        id: "src",
        name: "SourceTpl",
        width: 160,
        height: 128,
        template: "blank",
      }),
      [makeLabel("l_src", "KeepMe")],
    );
    const onCreate = vi.fn();
    function IndependenceHarness() {
      const [projects, setProjects] = useState<ProjectCard[]>([
        makeCard("src", "SourceTpl", { isTemplate: true, project: sourceProject }),
      ]);
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setProjects((items) =>
                items.map((item) => (item.id === "src" ? { ...item, isTemplate: false } : item)),
              )
            }
          >
            Unmark source
          </button>
          <LibraryPage
            projects={projects}
            onOpenProject={() => undefined}
            onCreateProject={(card) => {
              setProjects((items) => [card, ...items]);
              onCreate(card);
            }}
            onCopyProject={() => undefined}
            onDeleteProject={() => undefined}
            onUpdateProject={(card) =>
              setProjects((items) => items.map((item) => (item.id === card.id ? card : item)))
            }
          />
        </>
      );
    }

    render(<IndependenceHarness />);
    await userEvent.click(screen.getByRole("button", { name: /New project/i }));
    await userEvent.click(screen.getByRole("button", { name: "template" }));
    await userEvent.click(screen.getByRole("option", { name: /SourceTpl/ }));
    const nameInput = screen.getByPlaceholderText("Untitled");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Child");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(onCreate).toHaveBeenCalled();
    const created = onCreate.mock.calls[0][0] as ProjectCard;
    expect(created.template).toBe("custom");
    expect(created.sourceTemplateId).toBe("src");
    expect(created.isTemplate).toBe(false);
    expect(created.project).not.toBe(sourceProject);
    expect((created.project.screens[0].children?.[0].props as { text: string }).text).toBe("KeepMe");

    const sourceLabel = sourceProject.screens[0].children?.[0];
    if (sourceLabel?.props && "text" in sourceLabel.props) {
      sourceLabel.props.text = "Mutated";
    }

    await userEvent.click(screen.getByRole("button", { name: "Unmark source" }));
    expect(screen.getByText("Child")).toBeInTheDocument();
    expect(screen.getByText("SourceTpl")).toBeInTheDocument();
    expect(screen.queryByLabelText("Template")).not.toBeInTheDocument();
    expect((created.project.screens[0].children?.[0].props as { text: string }).text).toBe("KeepMe");

    await userEvent.click(screen.getByRole("button", { name: /New project/i }));
    await userEvent.click(screen.getByRole("button", { name: "template" }));
    expect(screen.queryByRole("option", { name: /SourceTpl/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Blank/ })).toBeInTheDocument();
  });
});
