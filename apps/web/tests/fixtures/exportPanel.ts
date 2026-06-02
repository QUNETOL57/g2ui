import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Opens the export/import modal from the top-bar Export button. */
export async function openExportModal() {
  await userEvent.click(screen.getByRole("button", { name: /^Export$/ }));
  expect(screen.getByRole("heading", { name: "Export / Import" })).toBeInTheDocument();
}
