import { expect, test } from "@playwright/test";

import { canvasWidget, openBlankEditor, treeRow } from "./helpers";

test.describe("label inline editing", () => {
  test.beforeEach(async ({ page }) => {
    await openBlankEditor(page);
  });

  test("double-click on canvas opens edit, grows frame while typing, commits on blur", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Add label" }).click();
    await expect(treeRow(page, "lab_1")).toBeVisible();

    await page.getByTestId("selection-mask").dblclick();

    const input = page.getByLabel("edit label text");
    await expect(input).toBeVisible();

    const label = canvasWidget(page, "lab_1");
    const widthBefore = await label.evaluate((el) => el.getBoundingClientRect().width);
    await input.fill("A much longer label string");
    await expect
      .poll(async () => label.evaluate((el) => el.getBoundingClientRect().width))
      .toBeGreaterThan(widthBefore);

    await input.blur();
    await expect(input).toBeHidden();
    await expect(treeRow(page, "lab_1")).toContainText("lab_1");
    await expect(page.getByText("Properties · label")).toBeVisible();

    await page.getByTestId("selection-mask").click();
    await expect(page.getByText("Properties · label")).toBeVisible();
  });

  test("tree double-click and Enter open inline edit", async ({ page }) => {
    await page.getByRole("button", { name: "Add label" }).click();
    await treeRow(page, "lab_1").dblclick();
    await expect(page.getByLabel("edit label text")).toBeVisible();
    await page.getByLabel("edit label text").blur();

    await treeRow(page, "lab_1").click();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("edit label text")).toBeVisible();
  });
});
