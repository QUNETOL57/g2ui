import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPreview } from "@widgets/project-preview/ProjectPreview";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";

import { makeFixtureProject, makeLabel, makeSecondScreen, withScreens } from "../fixtures/projects";

describe("ProjectPreview", () => {
  it("renders preview canvas with display dimensions labels", () => {
    const project = makeProjectFromTemplate({
      id: "p", name: "p", width: 160, height: 128, template: "blank",
    });
    const { container, getByText } = render(<ProjectPreview project={project} />);
    expect(getByText("160")).toBeInTheDocument();
    expect(getByText("128")).toBeInTheDocument();
    expect(container.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  it("hides size labels when showSizeLabels is false", () => {
    const project = makeProjectFromTemplate({
      id: "p", name: "p", width: 160, height: 128, template: "blank",
    });
    const { queryByText } = render(
      <ProjectPreview project={project} showSizeLabels={false} />,
    );
    expect(queryByText("160")).not.toBeInTheDocument();
    expect(queryByText("128")).not.toBeInTheDocument();
  });

  it("renders the first screen in the list when screenId is omitted", () => {
    const topScreen = {
      ...makeFixtureProject().screens[0],
      children: [makeLabel("lbl_top", "Top screen")],
    };
    const secondScreen = {
      ...makeSecondScreen("screen_other", "Other"),
      children: [makeLabel("lbl_other", "Other screen")],
    };
    const project = withScreens(makeFixtureProject(), [topScreen, secondScreen]);
    project.initialScreenId = "screen_other";

    render(<ProjectPreview project={project} />);
    expect(screen.getByLabelText("Top screen")).toBeInTheDocument();
    expect(screen.queryByLabelText("Other screen")).not.toBeInTheDocument();
  });

  it("supports compact mode", () => {
    const project = makeProjectFromTemplate({
      id: "p", name: "p", width: 320, height: 240, template: "blank",
    });
    const { container } = render(<ProjectPreview project={project} compact />);
    expect((container.firstChild as HTMLElement).className).toMatch(/previewCompact/);
  });

  it("applies resolved screen fill from style.background", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {
      drawBackground: true,
      background: { kind: "hex", value: "#c0ffee" },
    };

    render(<ProjectPreview project={project} />);
    expect(screen.getByTestId("project-preview-surface")).toHaveStyle({
      background: "#c0ffee",
    });
  });

  it("resolves screen fill token through palette", () => {
    const project = makeFixtureProject({
      palette: [{ token: "bg", hex: "#305070" }],
    });
    project.screens[0].style = {
      background: { kind: "token", token: "bg" },
    };

    render(<ProjectPreview project={project} />);
    expect(screen.getByTestId("project-preview-surface")).toHaveStyle({
      background: "#305070",
    });
  });

  it("uses black fill when drawBackground is false", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {
      drawBackground: false,
      background: { kind: "hex", value: "#c0ffee" },
    };

    render(<ProjectPreview project={project} />);
    expect(screen.getByTestId("project-preview-surface")).toHaveStyle({
      background: "#000000",
    });
  });

  it("falls back to props.background when style.background is missing", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {};
    project.screens[0].props = { background: { kind: "hex", value: "#445566" } };

    render(<ProjectPreview project={project} />);
    expect(screen.getByTestId("project-preview-surface")).toHaveStyle({
      background: "#445566",
    });
  });
});
