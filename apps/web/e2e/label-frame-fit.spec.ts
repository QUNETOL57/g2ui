import { expect, test } from "@playwright/test";

import { canvasWidget, addLabelWidget, openBlankEditor, treeRow } from "./helpers";

test.describe("label frame fit", () => {
  test.beforeEach(async ({ page }) => {
    await openBlankEditor(page);
  });

  test("double-click on bottom resize handle shrinks an oversized label frame", async ({ page }) => {
    await addLabelWidget(page);
    await expect(treeRow(page, "lab_1")).toBeVisible();

    const label = canvasWidget(page, "lab_1");
    const before = await label.boundingBox();
    expect(before).not.toBeNull();

    const handle = page.getByTestId("resize-handle-s");
    await expect(handle).toBeVisible();
    const handleBox = await handle.boundingBox();
    expect(handleBox).not.toBeNull();
    expect(handleBox!.width).toBeGreaterThan(0);
    expect(handleBox!.height).toBeGreaterThan(0);

    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + 40);
    await page.mouse.up();

    const expanded = await label.boundingBox();
    expect(expanded!.height).toBeGreaterThan(before!.height + 8);

    await handle.dblclick();

    await expect
      .poll(async () => (await label.boundingBox())?.height ?? 0)
      .toBeLessThan(expanded!.height);
  });

  test("double-click on label content still opens inline edit", async ({ page }) => {
    await addLabelWidget(page);
    await canvasWidget(page, "lab_1").dblclick();
    await expect(page.getByLabel("edit label text")).toBeVisible();
  });
});
