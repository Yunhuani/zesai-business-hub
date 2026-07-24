import { expect, test } from "@playwright/test";

test("采集对话页正常渲染且存在可交互回答元素", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", message => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  const response = await page.goto("/diagnosis/conversation");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveURL(/\/diagnosis\/conversation(?:[/?#]|$)/);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("#conversation-unit-0")).toBeVisible();
  await expect(
    page.locator('button[data-testid^="option-"]:not([disabled]), input:not([disabled])').first(),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
