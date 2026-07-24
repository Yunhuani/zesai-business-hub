import { expect, test } from "@playwright/test";

test("登录后显示账号菜单", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  test.skip(!email, "E2E_EMAIL 未配置");

  await page.goto("/login");
  await page.locator("#login-email").fill(email!);
  await page.locator("#login-password").fill(password ?? "");
  await page.locator('form button[type="submit"]').click();

  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/);
  await expect(page.locator('button[aria-label="打开账号菜单"]')).toBeVisible();
});
