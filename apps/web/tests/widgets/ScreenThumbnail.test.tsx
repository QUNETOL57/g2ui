import { render } from "@testing-library/react";
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
});
