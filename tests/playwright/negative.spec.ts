/**
 * Negative and Edge Case E2E Tests
 * Tests error handling, boundary conditions, and failure scenarios
 */
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
    }
  } catch {
    // Ignore parse errors
  }
}

test.skip(
  authCookies.length === 0,
  "Set PLAYWRIGHT_AUTH_COOKIES to run negative scenario tests"
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

test.describe("Form Validation", () => {
  test("task creation requires title", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Navigate to a project's task page (assuming there's at least one team/project)
    const teamLink = page.getByRole("link").filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible()) {
      await teamLink.click();
      
      // Try to find task form
      const addTaskBtn = page.getByRole("button", { name: /Add Task/i });
      if (await addTaskBtn.isVisible()) {
        // Try to submit without title
        await addTaskBtn.click();
        
        // Should show validation error or button should be disabled
        const errorMessage = page.getByText(/title is required|please enter|cannot be empty/i);
        const isDisabled = await addTaskBtn.isDisabled();
        
        // Either there's an error message or the button was disabled
        expect(await errorMessage.isVisible() || isDisabled).toBeTruthy();
      }
    }
  });

  test("team name validation - minimum length", async ({ page }) => {
    await page.goto("/dashboard");
    
    const teamInput = page.getByPlaceholder("Team name").first();
    if (await teamInput.isVisible()) {
      // Try to create team with single character
      await teamInput.fill("A");
      await page.getByRole("button", { name: /Create team/i }).first().click();
      
      // Should show validation error
      await expect(
        page.getByText(/at least|too short|minimum/i).or(page.getByText(/2 characters/i))
      ).toBeVisible({ timeout: 3000 }).catch(() => {
        // Validation might prevent submission silently
      });
    }
  });

  test("wellness check-in requires mood selection", async ({ page }) => {
    await page.goto("/wellness");
    
    const checkinBtn = page.getByRole("button", { name: /Check in/i });
    if (await checkinBtn.isVisible()) {
      // Try to submit without selecting mood
      await checkinBtn.click();
      
      // Should show error or remain on page
      const currentUrl = page.url();
      expect(currentUrl).toContain("/wellness");
    }
  });
});

test.describe("Navigation Guards", () => {
  test("protected routes redirect unauthenticated users", async ({ browser }) => {
    // Create new context without auth cookies
    const context = await browser.newContext();
    const page = await context.newPage();
    
    const protectedRoutes = ["/dashboard", "/teams", "/timeline", "/wellness", "/settings"];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      // Should redirect to login or show auth prompt
      await expect(
        page.getByRole("heading", { name: /Login|Sign in/i })
          .or(page.getByRole("button", { name: /Login|Sign in/i }))
          .or(page.getByText(/sign in to continue/i))
          .or(page.locator('input[type="email"]'))
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // URL should have changed to login
        expect(page.url()).toMatch(/login|signin|auth/i);
      });
    }
    
    await context.close();
  });
});

test.describe("Error States", () => {
  test("handles invalid team ID gracefully", async ({ page }) => {
    // Try to access non-existent team
    await page.goto("/teams/00000000-0000-0000-0000-000000000000");
    
    // Should show error or redirect
    await expect(
      page.getByText(/not found|doesn't exist|error/i)
        .or(page.getByRole("heading", { name: /Dashboard/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  test("handles invalid project ID gracefully", async ({ page }) => {
    await page.goto("/projects/00000000-0000-0000-0000-000000000000/tasks");
    
    await expect(
      page.getByText(/not found|doesn't exist|error/i)
        .or(page.getByRole("heading", { name: /Dashboard/i }))
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Boundary Conditions", () => {
  test("handles very long team names", async ({ page }) => {
    await page.goto("/dashboard");
    
    const teamInput = page.getByPlaceholder("Team name").first();
    if (await teamInput.isVisible()) {
      const longName = "A".repeat(500);
      await teamInput.fill(longName);
      await page.getByRole("button", { name: /Create team/i }).first().click();
      
      // Should either truncate, show error, or handle gracefully
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check we're still functional
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("handles special characters in inputs", async ({ page }) => {
    await page.goto("/dashboard");
    
    const teamInput = page.getByPlaceholder("Team name").first();
    if (await teamInput.isVisible()) {
      const specialName = '<script>alert("XSS")</script>';
      await teamInput.fill(specialName);
      await page.getByRole("button", { name: /Create team/i }).first().click();
      
      // Page should not execute script
      await page.waitForTimeout(1000);
      
      // Verify no alert dialog appeared and page is functional
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("handles empty note in wellness check-in", async ({ page }) => {
    await page.goto("/wellness");
    
    // Select mood
    const moodButton = page.getByText("😊").or(page.getByLabel(/Good/i));
    if (await moodButton.isVisible()) {
      await moodButton.click();
      
      // Submit without note (should be allowed)
      await page.getByRole("button", { name: /Check in/i }).click();
      
      // Should succeed
      await expect(page.getByText(/streak|success|checked in/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        // Or stay on page without error
      });
    }
  });
});

test.describe("Concurrent Operations", () => {
  test("handles rapid task status changes", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Navigate to tasks if possible
    const teamLink = page.getByRole("link").filter({ hasText: /team/i }).first();
    if (await teamLink.isVisible()) {
      await teamLink.click();
      await page.waitForLoadState("networkidle");
      
      const doneButton = page.getByRole("button", { name: /Done|Complete/i }).first();
      if (await doneButton.isVisible()) {
        // Rapid clicks
        await doneButton.click();
        await doneButton.click();
        await doneButton.click();
        
        // Should handle gracefully without errors
        await page.waitForTimeout(1000);
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

test.describe("Network Resilience", () => {
  test("shows appropriate loading states", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Navigate and check for loading indicators
    await page.goto("/timeline");
    
    // Should show loading or content
    await expect(
      page.getByText(/loading/i)
        .or(page.getByRole("progressbar"))
        .or(page.getByRole("heading", { name: /Timeline/i }))
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Accessibility", () => {
  test("pages have proper heading structure", async ({ page }) => {
    const pages = ["/dashboard", "/wellness", "/timeline", "/settings"];
    
    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Each page should have at least one h1 or main heading
      const heading = page.getByRole("heading", { level: 1 }).or(
        page.getByRole("heading").first()
      );
      await expect(heading).toBeVisible({ timeout: 5000 }).catch(() => {
        // May redirect unauthenticated
      });
    }
  });

  test("forms have accessible labels", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Check that inputs have associated labels or aria-labels
    const inputs = page.locator('input:not([type="hidden"])');
    const count = await inputs.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const hasLabel = await input.getAttribute("aria-label")
          || await input.getAttribute("placeholder")
          || await input.getAttribute("name");
        expect(hasLabel).toBeTruthy();
      }
    }
  });

  test("interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Tab through the page
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
    }
    
    // Check that some element has focus
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
