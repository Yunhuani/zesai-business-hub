import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("登录并保存登录态", async ({ page }) => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  setup.skip(!email, "E2E_EMAIL 未配置");

  await page.goto("/login");
  await page.locator("#login-email").fill(email!);
  await page.locator("#login-password").fill(password ?? "");
  await page.locator('form button[type="submit"]').click();

  await expect(page).not.toHaveURL(/\/login(?:[/?#]|$)/);
  await expect(page.locator('button[aria-label="打开账号菜单"]')).toBeVisible();
  await page.context().storageState({ path: authFile });
});
