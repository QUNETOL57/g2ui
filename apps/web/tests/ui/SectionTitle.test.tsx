import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SectionTitle, SidebarDisclosure } from "@shared/ui/SectionTitle";

describe("SectionTitle", () => {
  it("renders content in a div by default", () => {
    render(<SectionTitle>Header</SectionTitle>);
    expect(screen.getByText("Header").closest("div")).toHaveTextContent("Header");
  });

  it("supports an alternative tag via `as`", () => {
    render(<SectionTitle as="h3">Header</SectionTitle>);
    expect(screen.getByRole("heading", { level: 3, name: "Header" })).toBeInTheDocument();
  });

  it("renders optional actions in the title row", () => {
    render(
      <SectionTitle actions={<button type="button">Action</button>}>
        Header
      </SectionTitle>,
    );
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
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
