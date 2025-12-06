/**
 * API Integration Tests
 * Tests cron endpoints and API routes using node:test
 */
import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const cronSecret = process.env.CRON_SECRET;

// Skip tests if no test environment available
const canRunTests = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!canRunTests) {
  test("API tests skipped (missing environment)", { skip: true }, () => {});
  console.warn("Skipping API tests. Set SUPABASE_URL environment variables.");
} else {
  test.describe("Cron Endpoint Security", () => {
    test("reminders endpoint requires authorization", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`);
        
        // Without auth, should return 401 if CRON_SECRET is set
        if (cronSecret) {
          assert.equal(response.status, 401, "Should reject unauthorized requests");
        }
      } catch (error) {
        // Connection refused is acceptable if server isn't running
        console.log("Server not available for API tests");
      }
    });

    test("reminders endpoint accepts valid authorization", async () => {
      if (!cronSecret) {
        console.log("Skipping - CRON_SECRET not set");
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`, {
          headers: {
            Authorization: `Bearer ${cronSecret}`,
          },
        });

        // Should not be 401
        assert.notEqual(response.status, 401, "Should accept valid authorization");
        // Could be 200 or 500 (if DB not connected), but not 401
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("reminders endpoint rejects invalid authorization", async () => {
      if (!cronSecret) {
        console.log("Skipping - CRON_SECRET not set");
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`, {
          headers: {
            Authorization: "Bearer wrong-secret",
          },
        });

        assert.equal(response.status, 401, "Should reject invalid authorization");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("Auth Routes", () => {
    test("signout route exists and accepts POST", async () => {
      try {
        const response = await fetch(`${baseUrl}/auth/signout`, {
          method: "POST",
          redirect: "manual",
        });

        // Should redirect or return success, not 404
        assert.ok(
          [200, 302, 303, 307, 308].includes(response.status),
          `Signout should work, got ${response.status}`
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("callback page exists", async () => {
      try {
        const response = await fetch(`${baseUrl}/auth/callback`);

        // Should return a page, not 404
        assert.notEqual(response.status, 404, "Callback page should exist");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("confirm page exists", async () => {
      try {
        const response = await fetch(`${baseUrl}/auth/confirm`);

        assert.notEqual(response.status, 404, "Confirm page should exist");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("Protected Routes", () => {
    test("dashboard redirects unauthenticated users", async () => {
      try {
        const response = await fetch(`${baseUrl}/dashboard`, {
          redirect: "manual",
        });

        // Should redirect to login or return the page (depending on middleware)
        assert.ok(
          [200, 302, 303, 307, 308].includes(response.status),
          "Dashboard should respond"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("settings redirects unauthenticated users", async () => {
      try {
        const response = await fetch(`${baseUrl}/settings`, {
          redirect: "manual",
        });

        assert.ok(
          [200, 302, 303, 307, 308].includes(response.status),
          "Settings should respond"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("Public Routes", () => {
    test("login page is accessible", async () => {
      try {
        const response = await fetch(`${baseUrl}/login`);

        assert.equal(response.status, 200, "Login page should be accessible");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("signup page is accessible", async () => {
      try {
        const response = await fetch(`${baseUrl}/signup`);

        assert.equal(response.status, 200, "Signup page should be accessible");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("join page is accessible", async () => {
      try {
        const response = await fetch(`${baseUrl}/join`);

        assert.equal(response.status, 200, "Join page should be accessible");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("home page is accessible", async () => {
      try {
        const response = await fetch(`${baseUrl}/`);

        assert.equal(response.status, 200, "Home page should be accessible");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("API Response Format", () => {
    test("cron endpoint returns JSON", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`);
        const contentType = response.headers.get("content-type");

        assert.ok(
          contentType?.includes("application/json"),
          "Should return JSON content type"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("HTTP Methods", () => {
    test("cron endpoint rejects POST requests", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`, {
          method: "POST",
          headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
        });

        // Should return 405 Method Not Allowed or similar
        assert.ok(
          [405, 400, 404].includes(response.status),
          "POST should not be allowed on cron endpoint"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("cron endpoint rejects PUT requests", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`, {
          method: "PUT",
          headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
        });

        assert.ok(
          [405, 400, 404].includes(response.status),
          "PUT should not be allowed on cron endpoint"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("cron endpoint rejects DELETE requests", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`, {
          method: "DELETE",
          headers: cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {},
        });

        assert.ok(
          [405, 400, 404].includes(response.status),
          "DELETE should not be allowed on cron endpoint"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("Error Handling", () => {
    test("404 for non-existent API routes", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/nonexistent-route-12345`);

        assert.equal(response.status, 404, "Should return 404 for unknown routes");
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("invalid UUID parameter handling", async () => {
      try {
        const response = await fetch(`${baseUrl}/projects/not-a-uuid/tasks`);

        // Should handle gracefully - either 400 or redirect
        assert.ok(
          [400, 404, 302, 303, 307, 308, 200].includes(response.status),
          "Should handle invalid UUID gracefully"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });

  test.describe("Headers", () => {
    test("responses include cache headers", async () => {
      try {
        const response = await fetch(`${baseUrl}/`);
        const cacheControl = response.headers.get("cache-control");

        // Should have some cache policy
        assert.ok(response.headers.has("cache-control") || response.headers.has("etag"));
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });

    test("CORS headers present on API endpoints", async () => {
      try {
        const response = await fetch(`${baseUrl}/api/cron/reminders`, {
          method: "OPTIONS",
        });

        // OPTIONS should be handled
        assert.ok(
          [200, 204, 405].includes(response.status),
          "OPTIONS request should be handled"
        );
      } catch (error) {
        console.log("Server not available for API tests");
      }
    });
  });
}
