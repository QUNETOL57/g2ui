import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export async function openExportModal() {
  await userEvent.click(screen.getByRole("button", { name: /^Export$/ }));
  expect(screen.getByRole("heading", { name: "Export", level: 2 })).toBeInTheDocument();
}

export async function openImportModal() {
  await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
  expect(screen.getByRole("heading", { name: "Import", level: 2 })).toBeInTheDocument();
}
