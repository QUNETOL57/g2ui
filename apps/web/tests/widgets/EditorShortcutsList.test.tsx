import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorShortcutsList } from "@widgets/properties-panel/ui/EditorShortcutsList";

describe("EditorShortcutsList", () => {
  it("renders shortcut labels and key hints", () => {
    render(<EditorShortcutsList />);

    expect(screen.getByRole("region", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByText("Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Edit label or button")).toBeInTheDocument();
    expect(screen.getByText("Enter / Double-click")).toBeInTheDocument();
    expect(screen.getByText("Zoom canvas")).toBeInTheDocument();
  });
});
