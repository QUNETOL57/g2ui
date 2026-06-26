import { expect, test, type Page } from "@playwright/test";

import { addLabelWidget, canvasWidget } from "./helpers";

interface CanvasPayload {
  title: string;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  schema_version: number;
}

interface MockApiState {
  canvasRequests: CanvasPayload[];
}

const USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "user@example.com",
  created_at: "2026-06-24T00:00:00Z",
};

async function mockApi(page: Page): Promise<MockApiState> {
  const state: MockApiState = {
    canvasRequests: [],
  };
  let tokenIssued = false;
  let savedCanvas: ReturnType<typeof canvasRecord> | null = null;

  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/v1/auth/register" || path === "/api/v1/auth/login") {
      tokenIssued = true;
      await route.fulfill({
        status: path.endsWith("/register") ? 201 : 200,
        json: { access_token: "test-token", token_type: "bearer" },
      });
      return;
    }

    if (path === "/api/v1/auth/me") {
      await route.fulfill({
        status: tokenIssued ? 200 : 401,
        json: tokenIssued ? USER : { detail: "Not authenticated" },
      });
      return;
    }

    if (path === "/api/v1/canvases" && request.method() === "GET") {
      await route.fulfill({ status: 200, json: savedCanvas ? [savedCanvas] : [] });
      return;
    }

    if (path === "/api/v1/canvases" && request.method() === "POST") {
      const payload = request.postDataJSON() as CanvasPayload;
      state.canvasRequests.push(payload);
      savedCanvas = canvasRecord(payload);
      await route.fulfill({ status: 201, json: savedCanvas });
      return;
    }

    if (path.startsWith("/api/v1/canvases/") && request.method() === "PATCH") {
      const payload = request.postDataJSON() as CanvasPayload;
      state.canvasRequests.push(payload);
      savedCanvas = canvasRecord(payload, path.split("/").at(-1));
      await route.fulfill({ status: 200, json: savedCanvas });
      return;
    }

    await route.fulfill({ status: 404, json: { detail: "Unhandled test route" } });
  });

  return state;
}

function canvasRecord(payload: CanvasPayload, id = "22222222-2222-4222-8222-222222222222") {
  return {
    id,
    owner_id: USER.id,
    title: payload.title,
    content: payload.content,
    settings: payload.settings,
    schema_version: payload.schema_version,
    created_at: "2026-06-24T00:00:00Z",
    updated_at: "2026-06-24T00:00:00Z",
  };
}

async function openGuestEditorAndChangeProject(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByText("Untitled")).toBeHidden();

  await page.getByRole("button", { name: "New project" }).click();
  await page.getByRole("button", { name: "Create project", exact: true }).click();
  await expect(page.getByText("Widget tree")).toBeVisible();
  await addLabelWidget(page);
  await expect(canvasWidget(page, "lab_1")).toBeVisible();
}

test.describe("guest project auth modal flow", () => {
  test("library status footer stays at the bottom", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    const footer = page.locator("footer").filter({ hasText: "Guest" });
    await expect(footer).toBeVisible();
    const box = await footer.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.height).toBe(22);
    expect(Math.abs(box!.y + box!.height - viewport!.height)).toBeLessThanOrEqual(2);
  });

  test("library footer stays pinned while content scrolls", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    const footer = page.locator("footer").filter({ hasText: "Guest" });
    const content = page.locator("main section").first();
    await expect(footer).toBeVisible();

    await content.evaluate((element) => {
      element.style.minHeight = "2000px";
      element.scrollTop = 600;
    });

    const box = await footer.boundingBox();
    const viewport = page.viewportSize();
    expect(box).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(box!.height).toBe(22);
    expect(Math.abs(box!.y + box!.height - viewport!.height)).toBeLessThanOrEqual(2);
  });

  test("footer geometry stays stable when opening a project", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    const libraryFooter = page.locator("footer").filter({ hasText: "Guest" });
    const libraryGuest = libraryFooter.locator('[class*="statusUser"]').filter({ hasText: "Guest" });
    await expect(libraryFooter).toBeVisible();
    const libraryFooterBox = await libraryFooter.boundingBox();
    const libraryGuestBox = await libraryGuest.boundingBox();

    await page.getByRole("button", { name: "New project" }).click();
    await page.getByRole("button", { name: "Create project", exact: true }).click();
    await expect(page.getByText("Widget tree")).toBeVisible();

    const editorFooter = page.locator("footer").filter({ hasText: "Guest" });
    const editorGuest = editorFooter.locator('[class*="statusUser"]').filter({ hasText: "Guest" });
    await expect(editorFooter).toBeVisible();
    const editorFooterBox = await editorFooter.boundingBox();
    const editorGuestBox = await editorGuest.boundingBox();

    expect(libraryFooterBox).not.toBeNull();
    expect(editorFooterBox).not.toBeNull();
    expect(libraryGuestBox).not.toBeNull();
    expect(editorGuestBox).not.toBeNull();
    expect(editorFooterBox!.height).toBe(libraryFooterBox!.height);
    expect(editorFooterBox!.y).toBe(libraryFooterBox!.y);
    expect(editorGuestBox!.height).toBe(libraryGuestBox!.height);
    expect(editorGuestBox!.y).toBe(libraryGuestBox!.y);
  });

  test("guest can work on one local project without saving to API", async ({ page }) => {
    const api = await mockApi(page);

    await openGuestEditorAndChangeProject(page);

    await expect.poll(() => api.canvasRequests.length).toBe(0);
    await expect(page.getByText("Local draft")).toBeVisible();
    await expect(page.locator("footer").filter({ hasText: "Guest" })).toBeVisible();
  });

  test("guest can delete the local project and return to only create action", async ({ page }) => {
    const api = await mockApi(page);

    await openGuestEditorAndChangeProject(page);
    await page.getByRole("button", { name: "Back to project library" }).click();
    await expect(page.getByText("Untitled")).toBeVisible();

    await page.getByRole("button", { name: "Delete Untitled" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();

    await expect(page.getByText("Untitled")).toBeHidden();
    await expect(page.getByRole("button", { name: "New project" })).toBeVisible();
    await expect.poll(() => api.canvasRequests.length).toBe(0);
  });

  test("registration from the editor saves current guest project to the new account", async ({
    page,
  }) => {
    const api = await mockApi(page);

    await openGuestEditorAndChangeProject(page);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("button", { name: "Create one" }).click();
    await expect(page.getByText("Register with your email and password")).toBeVisible();

    const form = page.locator("form");
    await page.getByPlaceholder("you@example.com").fill(USER.email);
    await form.locator('input[autocomplete="new-password"]').nth(0).fill("password123");
    await form.locator('input[autocomplete="new-password"]').nth(1).fill("password123");
    await form.getByRole("button", { name: "Create account" }).click();

    await expect.poll(() => api.canvasRequests.length).toBeGreaterThanOrEqual(1);
    expect(api.canvasRequests[0].title).toBe("Untitled");
    expect(JSON.stringify(api.canvasRequests[0].content)).toContain("lab_1");
    await expect(page.getByText(USER.email)).toBeVisible();
    await expect(page.getByText("Synced")).toBeVisible();
    await expect(page.locator("footer").filter({ hasText: USER.email })).toBeVisible();
  });

  test("login from the editor saves current guest project to the account", async ({ page }) => {
    const api = await mockApi(page);

    await openGuestEditorAndChangeProject(page);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Use your email and password")).toBeVisible();

    const form = page.locator("form");
    await page.getByPlaceholder("you@example.com").fill(USER.email);
    await form.locator('input[autocomplete="current-password"]').fill("password123");
    await form.getByRole("button", { name: "Sign in" }).click();

    await expect.poll(() => api.canvasRequests.length).toBeGreaterThanOrEqual(1);
    expect(api.canvasRequests[0].title).toBe("Untitled");
    expect(JSON.stringify(api.canvasRequests[0].content)).toContain("lab_1");
    await expect(page.getByText(USER.email)).toBeVisible();
    await expect(page.getByText("Synced")).toBeVisible();
  });

  test("logout requires confirmation", async ({ page }) => {
    await mockApi(page);

    await openGuestEditorAndChangeProject(page);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByPlaceholder("you@example.com").fill(USER.email);
    await page.locator("form").locator('input[autocomplete="current-password"]').fill("password123");
    await page.locator("form").getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(USER.email)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { name: "Sign out?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText(USER.email)).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByRole("button", { name: "Sign out" }).nth(1).click();
    await expect(page.getByText(USER.email)).toBeHidden();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });
});
