import { expect, test } from "@playwright/test";

import {
  addLabelWidget,
  canvasWidget,
  marqueeSelect,
  openBlankEditor,
  setSelectedPosition,
  treeRow,
} from "./helpers";

test.describe("canvas multi-select", () => {
  test.beforeEach(async ({ page }) => {
    await openBlankEditor(page);
  });

  test("ctrl-click, marquee, group drag, and group delete", async ({ page }) => {
    await addLabelWidget(page);
    await setSelectedPosition(page, 8, 8);
    await addLabelWidget(page);
    await setSelectedPosition(page, 8, 48);
    await addLabelWidget(page);
    await setSelectedPosition(page, 80, 8);
    await expect(treeRow(page, "lab_1")).toBeVisible();
    await expect(treeRow(page, "lab_2")).toBeVisible();
    await expect(treeRow(page, "lab_3")).toBeVisible();

    await canvasWidget(page, "lab_1").click();
    await canvasWidget(page, "lab_2").click({ modifiers: ["ControlOrMeta"] });

    await expect(page.getByTestId("selection-frame")).toHaveCount(8);
    await expect(page.getByTestId("selection-group-frame")).toHaveCount(4);
    await expect(page.getByTestId("resize-handle-nw")).toHaveCount(0);

    await marqueeSelect(page, { x: 2, y: 2 }, { x: 220, y: 180 });
    await expect(page.getByTestId("selection-frame")).toHaveCount(12);
    await expect(page.getByTestId("selection-group-frame")).toHaveCount(4);

    const before = await canvasWidget(page, "lab_1").boundingBox();
    expect(before).not.toBeNull();
    const mask = page.getByTestId("selection-mask");
    const maskBox = await mask.boundingBox();
    expect(maskBox).not.toBeNull();
    await page.mouse.move(maskBox!.x + 8, maskBox!.y + 8);
    await page.mouse.down();
    await page.mouse.move(maskBox!.x + 28, maskBox!.y + 8, { steps: 8 });
    await page.mouse.up();

    await expect
      .poll(async () => canvasWidget(page, "lab_1").boundingBox())
      .not.toEqual(before);

    await page.keyboard.press("Delete");
    await expect(canvasWidget(page, "lab_1")).toHaveCount(0);
    await expect(canvasWidget(page, "lab_2")).toHaveCount(0);
    await expect(canvasWidget(page, "lab_3")).toHaveCount(0);
  });
});
