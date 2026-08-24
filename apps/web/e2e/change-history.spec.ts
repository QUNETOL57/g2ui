import { expect, test } from "@playwright/test";

import { openBlankEditor } from "./helpers";

test("opens change history from the editor status bar", async ({ page }) => {
  await openBlankEditor(page);
  await page.getByRole("button", { name: "Change history" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Change history")).toBeVisible();
});
