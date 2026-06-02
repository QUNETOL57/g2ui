import { expect, type Page } from "@playwright/test";

/** Library → create blank project → editor. */
export async function openBlankEditor(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByText(/schema/)).toBeVisible();
  await expect(page.getByText("Widget tree")).toBeVisible();
}

export function canvasWidget(page: Page, widgetId: string) {
  return page.locator(`[data-testid="canvas-widget"][data-widget-id="${widgetId}"]`);
}

export function treeRow(page: Page, nodeId: string) {
  return page.locator(`[data-tree-node-id="${nodeId}"]`);
}
