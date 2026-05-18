import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "@app/App";

import { resetEditorStore } from "../fixtures/store";

beforeEach(() => {
  resetEditorStore();
});

describe("App: library ↔ editor view switching", () => {
  it("starts on the library page", () => {
    render(<App />);
    expect(screen.getByText("New project")).toBeInTheDocument();
  });

  it("opens the editor after creating a project", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: /New project/i }));
    const nameInput = screen.getByPlaceholderText("Untitled");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "AppFlow");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
  });

  it("opens the editor by clicking an existing card", async () => {
    render(<App />);
    const card = screen.getByText("Untitled");
    await userEvent.click(card);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
  });

  it("returns to the library after pressing back", async () => {
    render(<App />);
    const card = screen.getByText("Untitled");
    await userEvent.click(card);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Back to project library/i }));
    expect(screen.getByText("New project")).toBeInTheDocument();
  });
});
