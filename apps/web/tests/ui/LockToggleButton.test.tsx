import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LockToggleButton } from "@shared/ui/LockToggleButton";

describe("LockToggleButton", () => {
  it("shows lock action when the node is unlocked", () => {
    render(
      <LockToggleButton locked={false} label="Widget" onToggle={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Lock Widget" })).toBeInTheDocument();
  });

  it("shows unlock action when the node is locked", () => {
    render(
      <LockToggleButton locked label="Widget" onToggle={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Unlock Widget" })).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(
      <LockToggleButton locked={false} label="Widget" onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Lock Widget" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
