import { expect, test } from "@playwright/test";

test("首页返回 200 且页面标题非空", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/.+/);
});

test("登录页显示邮箱和密码输入框", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("#login-email")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
});

test("定价页正常渲染且没有 JavaScript console error", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", message => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  const response = await page.goto("/pricing");

  expect(response?.status()).toBe(200);
  await expect(page.locator("body")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
