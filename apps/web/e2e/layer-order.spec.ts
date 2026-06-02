import { expect, test } from "@playwright/test";

import { canvasWidget, openBlankEditor, treeRow } from "./helpers";

test.describe("widget tree layer order on canvas", () => {
  test.beforeEach(async ({ page }) => {
    await openBlankEditor(page);
  });

  test("sibling order controls z-index and hit-testing at overlap", async ({ page }) => {
    await page.getByRole("button", { name: "+ label" }).click();
    await page.getByRole("button", { name: "+ panel" }).click();
    await treeRow(page, "screen_main").click();

    const label = canvasWidget(page, "lab_1");
    const panel = canvasWidget(page, "pan_1");
    await expect(label).toBeVisible();
    await expect(panel).toBeVisible();

    // First row in the tree (label) stacks above later siblings (panel).
    await expect(label).toHaveCSS("z-index", "2");
    await expect(panel).toHaveCSS("z-index", "1");

    const box = await label.boundingBox();
    expect(box).not.toBeNull();
    const x = box!.x + box!.width / 2;
    const y = box!.y + box!.height / 2;

    const topWidgetAtOverlap = await page.evaluate(({ px, py }) => {
      const el = document.elementFromPoint(px, py);
      return el?.closest("[data-widget-id]")?.getAttribute("data-widget-id") ?? null;
    }, { px: x, py: y });
    expect(topWidgetAtOverlap).toBe("lab_1");

    await page.mouse.click(x, y);
    await expect(treeRow(page, "lab_1")).toHaveClass(/rowSelected/);

    await treeRow(page, "lab_1").click();
    await page.getByRole("button", { name: "↓" }).click();
    await treeRow(page, "screen_main").click();

    await expect(panel).toHaveCSS("z-index", "2");
    await expect(label).toHaveCSS("z-index", "1");

    const topAfterReorder = await page.evaluate(({ px, py }) => {
      const el = document.elementFromPoint(px, py);
      return el?.closest("[data-widget-id]")?.getAttribute("data-widget-id") ?? null;
    }, { px: x, py: y });
    expect(topAfterReorder).toBe("pan_1");

    await page.mouse.click(x, y);
    await expect(treeRow(page, "pan_1")).toHaveClass(/rowSelected/);

    await treeRow(page, "lab_1").click();
    await expect(label).toHaveCSS("z-index", "1");
    await expect(panel).toHaveCSS("z-index", "2");
    await expect(page.getByTestId("selection-mask")).toBeVisible();

    const topWhenLabelSelected = await page.evaluate(({ px, py }) => {
      const el = document.elementFromPoint(px, py);
      if (el?.closest('[data-testid="selection-mask"]')) return "selection-mask";
      return el?.closest("[data-widget-id]")?.getAttribute("data-widget-id") ?? null;
    }, { px: x, py: y });
    expect(topWhenLabelSelected).toBe("selection-mask");
  });
});
