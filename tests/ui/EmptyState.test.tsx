import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@shared/ui/EmptyState";

describe("EmptyState", () => {
  it("renders message", () => {
    render(<EmptyState>Nothing selected.</EmptyState>);
    expect(screen.getByText("Nothing selected.")).toBeInTheDocument();
  });

  it("merges className", () => {
    render(<EmptyState className="extra">x</EmptyState>);
    expect(screen.getByText("x")).toHaveClass("extra");
  });
});
