import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandLogo } from "@shared/ui/BrandLogo";

describe("BrandLogo", () => {
  it("renders the studio logo image with alt text", () => {
    render(<BrandLogo />);
    const img = screen.getByAltText("GuiMintLab Studio") as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toMatch(/svg/);
  });

  it("includes the wordmark fragment 'g2ui'", () => {
    const { container } = render(<BrandLogo />);
    expect(container.textContent).toContain("g");
    expect(container.textContent).toContain("2");
    expect(container.textContent).toContain("ui");
  });

  it("framed wraps the inner block", () => {
    const { container } = render(<BrandLogo framed />);
    expect(container.querySelector('[class*="brandMain"]')).toBeTruthy();
  });

  it("merges custom className", () => {
    const { container } = render(<BrandLogo className="extra-cls" />);
    expect(container.firstChild).toHaveClass("extra-cls");
  });
});
