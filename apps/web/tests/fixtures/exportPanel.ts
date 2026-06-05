import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

export async function openExportModal() {
  await userEvent.click(screen.getByRole("button", { name: /^Export$/ }));
  expect(screen.getByText(/Copy or download the project JSON/i)).toBeInTheDocument();
}

export async function openImportModal() {
  await userEvent.click(screen.getByRole("button", { name: /^Import$/ }));
  expect(screen.getByText(/Paste a project JSON file/i)).toBeInTheDocument();
}
