import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TopBar } from "@shared/ui/TopBar";

describe("TopBar", () => {
  it("renders as a header containing children", () => {
    render(<TopBar>brand</TopBar>);
    const header = screen.getByRole("banner");
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent("brand");
  });

  it("renders Meta and Controls subcomponents", () => {
    render(
      <TopBar>
        <TopBar.Meta>meta</TopBar.Meta>
        <TopBar.Controls>ctrl</TopBar.Controls>
      </TopBar>,
    );
    expect(screen.getByText("meta").className).toMatch(/meta/);
    expect(screen.getByText("ctrl").className).toMatch(/controls/);
  });
});
