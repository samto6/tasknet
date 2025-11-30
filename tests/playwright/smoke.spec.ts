import { test, expect } from "@playwright/test";

interface AuthCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  expires?: number;
}

const cookiesEnv = process.env.PLAYWRIGHT_AUTH_COOKIES;
let authCookies: AuthCookie[] = [];

if (cookiesEnv) {
  try {
    const parsed = JSON.parse(cookiesEnv);
    if (Array.isArray(parsed)) {
      authCookies = parsed as AuthCookie[];
    } else {
      throw new Error("PLAYWRIGHT_AUTH_COOKIES must be a JSON array");
    }
  } catch (err) {
    throw new Error(`Failed to parse PLAYWRIGHT_AUTH_COOKIES: ${(err as Error).message}`);
  }
}

test.skip(
  authCookies.length === 0,
  "Set PLAYWRIGHT_AUTH_COOKIES to a JSON array with authenticated Supabase cookies to run the smoke test"
);

test.beforeEach(async ({ context, baseURL }) => {
  if (!authCookies.length) return;
  const origin = new URL(baseURL ?? "http://127.0.0.1:3000");
  await context.addCookies(
    authCookies.map((cookie) => ({
      domain: cookie.domain ?? origin.hostname,
      path: cookie.path ?? "/",
      secure: cookie.secure ?? origin.protocol === "https:",
      httpOnly: cookie.httpOnly ?? true,
      sameSite: cookie.sameSite ?? "Lax",
      ...cookie,
    }))
  );
});

test("signup → create team → create project → add task", async ({ page }) => {
  const now = Date.now();
  const teamName = `Playwright Team ${now}`;
  const projectName = `Playwright Project ${now}`;
  const taskTitle = `Test Task ${now}`;

  await test.step("visit dashboard", async () => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  await test.step("create team", async () => {
    await page.getByPlaceholder("Team name").first().fill(teamName);
    await page.getByRole("button", { name: /Create team/i }).first().click();
    await expect(page).toHaveURL(/\/teams\//);
    await expect(page.getByRole("heading", { name: teamName })).toBeVisible();
  });

  await test.step("create project", async () => {
    await page.getByRole("link", { name: "Create project from template" }).click();
    await expect(page).toHaveURL(/\/teams\/.*\/new-project/);

    await page.getByPlaceholder("Project name").fill(projectName);
    const start = new Date();
    const iso = start.toISOString().slice(0, 10);
    await page.getByLabel("Semester start date").fill(iso);
    await page.getByRole("button", { name: /Create from template/i }).click();
    await expect(page).toHaveURL(/\/projects\/.*\/tasks/);
    await expect(page.getByRole("heading", { name: "Tasks" })).toBeVisible();
  });

  await test.step("create task", async () => {
    // Fill in the new task form
    await page.getByPlaceholder("Task title").fill(taskTitle);
    await page.getByRole("button", { name: /Add Task/i }).click();
    
    // Wait for task to appear in the list
    await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
  });

  await test.step("add comment to task", async () => {
    // Expand comments section
    await page.getByText(/Comments/i).first().click();
    
    // Add a comment
    const commentText = `Test comment ${now}`;
    await page.getByPlaceholder(/Add a comment/i).first().fill(commentText);
    await page.getByRole("button", { name: "Comment" }).first().click();
    
    // Verify comment appears
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 5000 });
  });

  await test.step("mark task as done", async () => {
    await page.getByRole("button", { name: /Done/i }).first().click();
    
    // Verify status changed
    await expect(page.getByText("done")).toBeVisible({ timeout: 5000 });
  });
});

test("wellness check-in flow", async ({ page }) => {
  await test.step("visit wellness page", async () => {
    await page.goto("/wellness");
    await expect(page.getByRole("heading", { name: "Wellness" })).toBeVisible();
  });

  await test.step("submit mood check-in", async () => {
    // Select a mood (click on mood 4 - "Good")
    await page.getByText("😊").click();
    
    // Add optional note
    await page.getByPlaceholder(/How are you feeling/i).fill("Feeling productive today!");
    
    // Submit
    await page.getByRole("button", { name: /Check in/i }).click();
    
    // Verify success (page should show streak or success message)
    await expect(page.getByText(/streak/i)).toBeVisible({ timeout: 5000 });
  });
});

test("timeline views", async ({ page }) => {
  await test.step("visit timeline page", async () => {
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  });

  await test.step("switch between views", async () => {
    // Check calendar view is available
    await page.getByRole("button", { name: /Calendar/i }).click();
    await expect(page.locator('[data-testid="calendar-grid"]').or(page.getByText(/Sun|Mon|Tue/i).first())).toBeVisible();

    // Check Gantt view is available  
    await page.getByRole("button", { name: /Gantt/i }).click();
    // Gantt should show some timeline element
    await expect(page.locator('[data-testid="gantt-chart"]').or(page.getByText(/Week/i).first())).toBeVisible();

    // Check Weekly view is available
    await page.getByRole("button", { name: /Weekly/i }).click();
    await expect(page.locator('[data-testid="weekly-breakdown"]').or(page.getByText(/hours|points/i).first())).toBeVisible();
  });
});
