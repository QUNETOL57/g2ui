import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionTitle, SidebarDisclosure } from "@shared/ui/SectionTitle";

describe("SectionTitle", () => {
  it("renders content in a div by default", () => {
    render(<SectionTitle>Header</SectionTitle>);
    const node = screen.getByText("Header");
    expect(node.tagName).toBe("DIV");
  });

  it("supports an alternative tag via `as`", () => {
    render(<SectionTitle as="h3">Header</SectionTitle>);
    expect(screen.getByText("Header").tagName).toBe("H3");
  });
});

describe("SidebarDisclosure", () => {
  it("renders a <details> element with summary and child content", () => {
    render(
      <SidebarDisclosure summary="Section">
        <div>body</div>
      </SidebarDisclosure>,
    );
    expect(screen.getByText("Section").tagName).toBe("SUMMARY");
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("respects defaultOpen", () => {
    render(
      <SidebarDisclosure summary="x" defaultOpen>
        <div>body</div>
      </SidebarDisclosure>,
    );
    const details = screen.getByText("body").closest("details")!;
    expect(details).toHaveAttribute("open");
  });

  it("toggles open state on summary click", async () => {
    render(
      <SidebarDisclosure summary="Toggle">
        <div>body</div>
      </SidebarDisclosure>,
    );
    const details = screen.getByText("body").closest("details")!;
    expect(details.open).toBe(false);
    await userEvent.click(screen.getByText("Toggle"));
    expect(details.open).toBe(true);
  });
});
