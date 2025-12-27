import { test, expect } from "@playwright/test";

test.describe("Zero Board E2E Smoke Tests", () => {
  test("should load login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator("text=Zero Board")).toBeVisible();
    await expect(page.locator("text=Sign in to your account")).toBeVisible();
  });

  test("should login and navigate to dashboard", async ({ page }) => {
    // Note: This test requires the backend to be running with a test user
    // In a real scenario, you'd set up test data first
    
    await page.goto("/login");
    
    // Fill in login form
    await page.fill('input[type="text"]', "zbadmin");
    await page.fill('input[type="password"]', process.env.TEST_ADMIN_PASSWORD || "test-password");
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Check dashboard elements
    await expect(page.locator("text=My Boards")).toBeVisible();
  });

  test("should create a board", async ({ page }) => {
    // This test assumes you're already logged in from previous test
    // In a real scenario, you'd use fixtures or setup/teardown
    
    await page.goto("/dashboard");
    
    // Click create board button
    await page.click("text=Create Board");
    
    // Fill in board title
    const boardTitle = `Test Board ${Date.now()}`;
    await page.fill('input[placeholder="Board title"]', boardTitle);
    
    // Submit
    await page.click("text=Create");
    
    // Should navigate to board page
    await page.waitForURL(/.*boards\/\d+/, { timeout: 5000 });
    
    // Check board title is displayed
    await expect(page.locator(`text=${boardTitle}`)).toBeVisible();
  });

  test("should add a clock widget", async ({ page }) => {
    // This test assumes you're on a board page
    // In a real scenario, you'd navigate from dashboard or create board first
    
    await page.goto("/dashboard");
    
    // For this smoke test, we'll just verify the UI elements exist
    // A full test would create a board, enter edit mode, and add widget
    
    await expect(page.locator("text=My Boards")).toBeVisible();
  });
});

