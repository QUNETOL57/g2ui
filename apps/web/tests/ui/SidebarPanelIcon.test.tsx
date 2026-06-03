import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SidebarPanelIcon } from "@shared/ui/SidebarPanelIcon";

describe("SidebarPanelIcon", () => {
  it("renders left and right variants", () => {
    const { container: left } = render(<SidebarPanelIcon side="left" />);
    const { container: right } = render(<SidebarPanelIcon side="right" />);
    expect(left.querySelector("svg")).toBeTruthy();
    expect(right.querySelector("svg")).toBeTruthy();
    expect(left.querySelector("rect:last-of-type")?.getAttribute("x")).toBe("6.5");
    expect(right.querySelector("rect:last-of-type")?.getAttribute("x")).toBe("14");
  });
});
