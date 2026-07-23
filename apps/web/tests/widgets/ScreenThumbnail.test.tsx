import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScreenThumbnail } from "@widgets/screens-panel/ScreenThumbnail";

import { makeCircle, makeFixtureProject, makeTriangle, withChildren } from "../fixtures/projects";

describe("ScreenThumbnail", () => {
  it("renders scaled preview with pixelated scaling", () => {
    const project = withChildren(makeFixtureProject(), [makeCircle("cir_1"), makeTriangle("tri_1")]);
    const { container } = render(
      <ScreenThumbnail project={project} screenId="screen_main" />,
    );
    const scaled = container.querySelector('[class*="scaled"]') as HTMLElement;
    expect(scaled).toBeTruthy();
    expect(getComputedStyle(scaled).imageRendering).toBe("pixelated");
    expect(container.querySelector('[data-testid="pixel-circle"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="pixel-triangle"]')).toBeTruthy();
  });

  it("applies resolved screen fill from style.background", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {
      drawBackground: true,
      background: { kind: "hex", value: "#abcdef" },
    };

    render(<ScreenThumbnail project={project} screenId="screen_main" />);
    expect(screen.getByTestId("screen-thumbnail-surface")).toHaveStyle({
      background: "#abcdef",
    });
  });

  it("resolves screen fill token through palette", () => {
    const project = makeFixtureProject({
      palette: [{ token: "bg", hex: "#204060" }],
    });
    project.screens[0].style = {
      background: { kind: "token", token: "bg" },
    };

    render(<ScreenThumbnail project={project} screenId="screen_main" />);
    expect(screen.getByTestId("screen-thumbnail-surface")).toHaveStyle({
      background: "#204060",
    });
  });

  it("uses black fill when drawBackground is false", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {
      drawBackground: false,
      background: { kind: "hex", value: "#abcdef" },
    };

    render(<ScreenThumbnail project={project} screenId="screen_main" />);
    expect(screen.getByTestId("screen-thumbnail-surface")).toHaveStyle({
      background: "#000000",
    });
  });

  it("falls back to props.background when style.background is missing", () => {
    const project = makeFixtureProject();
    project.screens[0].style = {};
    project.screens[0].props = { background: { kind: "hex", value: "#334455" } };

    render(<ScreenThumbnail project={project} screenId="screen_main" />);
    expect(screen.getByTestId("screen-thumbnail-surface")).toHaveStyle({
      background: "#334455",
    });
  });
});
