import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPreview } from "@pages/library/ProjectPreview";
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
});
