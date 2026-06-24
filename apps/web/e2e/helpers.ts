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
  return page.locator(`[data-testid="canvas-widget"][data-widget-id="${widgetId}"]`);
}

export function treeRow(page: Page, nodeId: string) {
  return page.locator(`[data-tree-node-id="${nodeId}"]`);
}

export async function addLabelWidget(page: Page) {
  await page.getByRole("button", { name: "Text tools" }).click();
  await page.getByRole("menuitem", { name: "Label" }).click();
}
