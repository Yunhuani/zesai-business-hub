import { expect, test } from "@playwright/test";

test("登录后显示账号菜单", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL, "E2E_EMAIL 未配置");

  const response = await page.goto("/my-diagnoses");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/my-diagnoses(?:[/?#]|$)/);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator('button[aria-label="打开账号菜单"]')).toBeVisible();
});
