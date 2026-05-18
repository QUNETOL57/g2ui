import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectPreview } from "@pages/library/ProjectPreview";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";

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

  it("supports compact mode", () => {
    const project = makeProjectFromTemplate({
      id: "p", name: "p", width: 320, height: 240, template: "blank",
    });
    const { container } = render(<ProjectPreview project={project} compact />);
    expect((container.firstChild as HTMLElement).className).toMatch(/previewCompact/);
  });
});
