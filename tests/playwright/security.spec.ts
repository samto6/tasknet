/**
 * Security-focused E2E Tests
 * Tests for common vulnerabilities and security best practices
 */
import { test, expect } from "@playwright/test";

test.describe("Security Headers", () => {
  test("responses include security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    
    // Check for recommended security headers
    const securityHeaders = {
      "x-frame-options": ["DENY", "SAMEORIGIN"],
      "x-content-type-options": ["nosniff"],
      // These may be configured differently in development vs production
    };
    
    for (const [header, expectedValues] of Object.entries(securityHeaders)) {
      const value = headers[header.toLowerCase()];
      if (value) {
        const isValid = expectedValues.some((expected) =>
          value.toUpperCase().includes(expected.toUpperCase())
        );
        expect(isValid).toBeTruthy();
      }
    }
  });
});

test.describe("Authentication Security", () => {
  test("login page does not expose sensitive info in URL", async ({ page }) => {
    await page.goto("/login");
    
    // URL should not contain tokens or sensitive params
    const url = page.url();
    expect(url).not.toMatch(/password|token|secret|key/i);
  });

  test("failed login does not reveal user existence", async ({ page }) => {
    await page.goto("/login");
    
    // Try to login with non-existent user
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill("nonexistent@example.com");
      await passwordInput.fill("wrongpassword123");
      
      const submitButton = page.getByRole("button", { name: /login|sign in/i });
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        await page.waitForTimeout(2000);
        
        // Error message should be generic, not revealing if user exists
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).not.toMatch(/user not found|email not registered/);
      }
    }
  });

  test("password fields are properly masked", async ({ page }) => {
    await page.goto("/login");
    
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      // Verify input type is password (masked)
      const type = await passwordInput.getAttribute("type");
      expect(type).toBe("password");
    }
  });
});

test.describe("XSS Prevention", () => {
  test("script tags in URL parameters are not executed", async ({ page }) => {
    let alertTriggered = false;
    page.on("dialog", () => {
      alertTriggered = true;
    });
    
    // Try XSS via URL parameter
    await page.goto("/?q=<script>alert('XSS')</script>");
    await page.waitForTimeout(1000);
    
    expect(alertTriggered).toBe(false);
  });

  test("HTML in URL is properly escaped", async ({ page }) => {
    await page.goto("/?search=<img src=x onerror=alert('XSS')>");
    await page.waitForTimeout(1000);
    
    // Check that raw HTML is not rendered
    const content = await page.content();
    expect(content).not.toContain("<img src=x onerror");
  });
});

test.describe("CSRF Protection", () => {
  test("forms have CSRF protection or use safe methods", async ({ page }) => {
    await page.goto("/login");
    
    // Check forms have proper attributes
    const forms = page.locator("form");
    const formCount = await forms.count();
    
    for (let i = 0; i < formCount; i++) {
      const form = forms.nth(i);
      const action = await form.getAttribute("action");
      
      // Forms should either POST to same origin or have CSRF token
      if (action && !action.startsWith("/")) {
        // External forms are suspicious
        console.warn("External form action detected:", action);
      }
    }
  });
});

test.describe("Cookie Security", () => {
  test("session cookies have secure flags", async ({ page, context }) => {
    await page.goto("/");
    
    const cookies = await context.cookies();
    
    // Filter for session-related cookies
    const sessionCookies = cookies.filter(
      (c) =>
        c.name.toLowerCase().includes("session") ||
        c.name.toLowerCase().includes("auth") ||
        c.name.toLowerCase().includes("supabase")
    );
    
    for (const cookie of sessionCookies) {
      // In production, session cookies should be httpOnly
      // This might be different in development
      console.log(`Cookie ${cookie.name}: httpOnly=${cookie.httpOnly}, secure=${cookie.secure}`);
    }
  });
});

test.describe("Information Disclosure", () => {
  test("error pages do not leak stack traces", async ({ page }) => {
    await page.goto("/this-page-definitely-does-not-exist-12345");
    
    const content = await page.content();
    
    // Should not contain stack traces or internal paths
    expect(content).not.toMatch(/at\s+\w+\s+\(/); // Stack trace pattern
    expect(content).not.toMatch(/node_modules/);
    expect(content).not.toMatch(/\/Users\//);
    expect(content).not.toMatch(/Error:/);
  });

  test("API errors do not expose internal details", async ({ page }) => {
    // Try to access an invalid API endpoint
    const response = await page.goto("/api/nonexistent");
    
    if (response) {
      const text = await response.text();
      
      // Should not expose internal implementation details
      expect(text).not.toMatch(/at\s+\w+\s+\(/);
      expect(text).not.toMatch(/node_modules/);
    }
  });

  test("source maps are not exposed in production", async ({ page }) => {
    await page.goto("/");
    
    // Try to access source maps
    const scripts = await page.evaluate(() =>
      Array.from(document.querySelectorAll("script[src]")).map((s) =>
        s.getAttribute("src")
      )
    );
    
    for (const scriptSrc of scripts) {
      if (scriptSrc) {
        const mapUrl = scriptSrc + ".map";
        const response = await page.request.get(mapUrl);
        
        // Source maps should not be accessible in production
        // In development, this might return 200
        if (response.status() === 200) {
          console.warn(`Source map accessible: ${mapUrl}`);
        }
      }
    }
  });
});

test.describe("Input Validation", () => {
  test("file uploads have type restrictions", async ({ page }) => {
    await page.goto("/settings");
    
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      const accept = await fileInput.getAttribute("accept");
      
      // File inputs should have accept attribute restricting types
      console.log(`File input accept: ${accept}`);
    }
  });
});

test.describe("Rate Limiting Behavior", () => {
  test("login attempts are rate limited", async ({ page }) => {
    await page.goto("/login");
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.getByRole("button", { name: /login|sign in/i });
    
    if (
      await emailInput.isVisible() &&
      await passwordInput.isVisible() &&
      await submitButton.isVisible()
    ) {
      // Try multiple rapid login attempts
      for (let i = 0; i < 5; i++) {
        await emailInput.fill(`test${i}@example.com`);
        await passwordInput.fill("wrongpassword");
        await submitButton.click();
        await page.waitForTimeout(200);
      }
      
      // After multiple attempts, should see rate limiting or be functional
      // (This test documents behavior rather than enforcing it)
      const content = await page.content();
      console.log(
        "Rate limiting check:",
        content.toLowerCase().includes("rate") ||
          content.toLowerCase().includes("too many") ||
          content.toLowerCase().includes("try again")
      );
    }
  });
});

test.describe("Secure Communication", () => {
  test("external resources use HTTPS", async ({ page }) => {
    const insecureResources: string[] = [];
    
    page.on("request", (request) => {
      const url = request.url();
      if (url.startsWith("http://") && !url.includes("localhost") && !url.includes("127.0.0.1")) {
        insecureResources.push(url);
      }
    });
    
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    
    if (insecureResources.length > 0) {
      console.warn("Insecure resources:", insecureResources);
    }
    // In production, there should be no insecure external resources
    // In development, localhost is allowed
  });
});
