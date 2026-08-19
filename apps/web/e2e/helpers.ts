import { expect, type Page } from "@playwright/test";

/** Library → create blank project → editor. */
export async function openBlankEditor(page: Page) {
  await page.goto("/");
  const newProjectButton = page.getByRole("button", { name: "New project" });
  if (await newProjectButton.isVisible()) {
    await newProjectButton.click();
    await page.getByRole("button", { name: "Create project", exact: true }).click();
  } else {
    await page.getByText("Untitled").first().click();
  }
  await expect(page.getByText("Widget tree")).toBeVisible();
}

export function canvasWidget(page: Page, widgetId: string) {
  return page
    .getByTestId("canvas-device-frame")
    .locator(`[data-testid="canvas-widget"][data-widget-id="${widgetId}"]`);
}

export function treeRow(page: Page, nodeId: string) {
  return page.locator(`[data-tree-node-id="${nodeId}"]`);
}

export async function addLabelWidget(page: Page) {
  await page.getByRole("button", { name: "Add label" }).click();
}

/** Set X/Y of the currently selected widget via the properties panel. */
export async function setSelectedPosition(page: Page, x: number, y: number) {
  await page.getByRole("spinbutton", { name: "X" }).fill(String(x));
  await page.getByRole("spinbutton", { name: "Y" }).fill(String(y));
}

/** Device-frame-relative screen pixels. */
export async function marqueeSelect(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const frame = page.getByTestId("canvas-device-frame");
  const box = await frame.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + from.x, box!.y + from.y);
  await page.mouse.down();
  await page.mouse.move(box!.x + to.x, box!.y + to.y, { steps: 8 });
  await page.mouse.up();
}
