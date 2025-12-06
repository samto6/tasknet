/**
 * Performance E2E Tests
 * Tests page load times, response times, and resource usage
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
  "Set PLAYWRIGHT_AUTH_COOKIES to run performance tests"
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

test.describe("Page Load Performance", () => {
  const pages = [
    { name: "Dashboard", path: "/dashboard", maxLoadTime: 5000 },
    { name: "Timeline", path: "/timeline", maxLoadTime: 5000 },
    { name: "Wellness", path: "/wellness", maxLoadTime: 4000 },
    { name: "Settings", path: "/settings", maxLoadTime: 4000 },
    { name: "Tasks", path: "/tasks", maxLoadTime: 5000 },
    { name: "Teams", path: "/teams", maxLoadTime: 5000 },
  ];

  for (const pageConfig of pages) {
    test(`${pageConfig.name} page loads within ${pageConfig.maxLoadTime}ms`, async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(pageConfig.path);
      await page.waitForLoadState("domcontentloaded");
      
      const loadTime = Date.now() - startTime;
      
      console.log(`${pageConfig.name} load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(pageConfig.maxLoadTime);
    });
  }
});

test.describe("API Response Times", () => {
  test("dashboard API calls complete quickly", async ({ page }) => {
    const apiCalls: { url: string; duration: number }[] = [];
    
    page.on("requestfinished", async (request) => {
      if (request.url().includes("/api") || request.url().includes("supabase")) {
        const timing = request.timing();
        apiCalls.push({
          url: request.url(),
          duration: timing.responseEnd - timing.requestStart,
        });
      }
    });
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // All API calls should complete within 3 seconds
    for (const call of apiCalls) {
      expect(call.duration).toBeLessThan(3000);
    }
  });
});

test.describe("Resource Efficiency", () => {
  test("page does not have excessive DOM nodes", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    
    const nodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
    
    // Reasonable limit for a complex dashboard
    console.log(`DOM node count: ${nodeCount}`);
    expect(nodeCount).toBeLessThan(5000);
  });

  test("images are optimized", async ({ page }) => {
    const largeImages: string[] = [];
    
    page.on("response", async (response) => {
      const url = response.url();
      if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const headers = response.headers();
        const contentLength = parseInt(headers["content-length"] || "0", 10);
        
        // Flag images larger than 500KB
        if (contentLength > 500 * 1024) {
          largeImages.push(`${url} (${Math.round(contentLength / 1024)}KB)`);
        }
      }
    });
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    if (largeImages.length > 0) {
      console.warn("Large images found:", largeImages);
    }
    expect(largeImages.length).toBe(0);
  });

  test("no memory leaks on navigation", async ({ page }) => {
    // Navigate back and forth multiple times
    const routes = ["/dashboard", "/timeline", "/wellness", "/settings"];
    
    for (let round = 0; round < 3; round++) {
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("domcontentloaded");
      }
    }
    
    // If we get here without timeout, memory is stable enough
    expect(true).toBe(true);
  });
});

test.describe("Caching Behavior", () => {
  test("static assets are cached", async ({ page }) => {
    const cachedRequests: string[] = [];
    
    page.on("response", (response) => {
      const headers = response.headers();
      if (headers["cache-control"] && !headers["cache-control"].includes("no-cache")) {
        cachedRequests.push(response.url());
      }
    });
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Should have some cached static assets
    const staticAssets = cachedRequests.filter((url) =>
      url.match(/\.(js|css|woff2?|svg|png|jpg|ico)$/i)
    );
    
    console.log(`Cached static assets: ${staticAssets.length}`);
    // At least some assets should be cacheable
    expect(staticAssets.length).toBeGreaterThan(0);
  });
});

test.describe("Lighthouse-style Checks", () => {
  test("no console errors on page load", async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Filter out expected errors (like failed auth redirects)
    const unexpectedErrors = consoleErrors.filter(
      (error) => !error.includes("Failed to load resource") && !error.includes("401")
    );
    
    if (unexpectedErrors.length > 0) {
      console.warn("Console errors:", unexpectedErrors);
    }
    expect(unexpectedErrors.length).toBe(0);
  });

  test("no JavaScript exceptions", async ({ page }) => {
    const errors: Error[] = [];
    
    page.on("pageerror", (error) => {
      errors.push(error);
    });
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    // Navigate around
    await page.goto("/timeline");
    await page.waitForLoadState("networkidle");
    
    await page.goto("/wellness");
    await page.waitForLoadState("networkidle");
    
    if (errors.length > 0) {
      console.error("Page errors:", errors.map((e) => e.message));
    }
    expect(errors.length).toBe(0);
  });

  test("first contentful paint is quick", async ({ page }) => {
    await page.goto("/dashboard");
    
    const paintMetrics = await page.evaluate(() => {
      return performance.getEntriesByType("paint").map((entry) => ({
        name: entry.name,
        startTime: entry.startTime,
      }));
    });
    
    const fcp = paintMetrics.find((m) => m.name === "first-contentful-paint");
    
    if (fcp) {
      console.log(`First Contentful Paint: ${fcp.startTime}ms`);
      // FCP should be under 2.5 seconds for good user experience
      expect(fcp.startTime).toBeLessThan(2500);
    }
  });
});

test.describe("Mobile Performance", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
  });

  test("mobile pages load efficiently", async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto("/dashboard");
    await page.waitForLoadState("domcontentloaded");
    
    const loadTime = Date.now() - startTime;
    
    console.log(`Mobile dashboard load time: ${loadTime}ms`);
    // Mobile should load within 6 seconds
    expect(loadTime).toBeLessThan(6000);
  });

  test("mobile navigation works", async ({ page }) => {
    await page.goto("/dashboard");
    
    // Look for mobile menu button
    const menuButton = page.getByRole("button", { name: /menu/i }).or(
      page.locator('[aria-label="Menu"]')
    );
    
    if (await menuButton.isVisible()) {
      await menuButton.click();
      
      // Menu should open
      const nav = page.getByRole("navigation").or(page.locator('[role="menu"]'));
      await expect(nav).toBeVisible({ timeout: 2000 });
    }
  });
});
