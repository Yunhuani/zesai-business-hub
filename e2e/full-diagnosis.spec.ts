import { expect, test, type Page } from "@playwright/test";

const COMPANY_NAME = "测试案例科技（宁波）精密制造有限公司";

const TEXT_ANSWERS = {
  industry:
    "我们主要为欧美工业设备品牌提供精密金属零部件的研发、打样和批量制造服务，订单以出口代工和联合开发为主。",
  homeMarket:
    "目前主力市场是德国、荷兰和美国的工业设备客户，主要通过当地进口商及品牌方采购团队承接年度框架订单。",
  expansion:
    "未来两年希望进入东南亚新能源设备供应链，同时尝试直接服务欧洲中型品牌客户，降低对现有进口商的依赖。",
  competitors:
    "主要对手包括华东地区同类精密加工厂、越南的低成本代工企业，以及具备欧洲本地仓储能力的土耳其供应商。",
  uniqueAssets:
    "公司拥有多项材料处理工艺经验、稳定的自动化产线和长期合作的模具团队，并积累了十年以上欧美客户质量审核记录。",
  revenueSources:
    "收入主要来自工业设备结构件、精密传动组件和小批量定制模块，其中批量制造贡献稳定收入，联合开发项目贡献较高毛利。",
  earningAndRetention:
    "我们依靠复杂零件的一体化加工和稳定交期获得合理利润，再通过快速打样、质量追溯和持续降本方案维持长期合作。",
  costStructure:
    "成本大头是特种钢材和铝材采购，其次是生产人员工资、设备折旧与能源费用，国际物流和客户验厂也占有一定比例。",
  anxiety:
    "目前最焦虑的是大客户订单增长已经放缓，而新市场销售周期偏长，希望找到可复制的获客方式并改善客户集中度。",
} as const;

const DIMENSIONS = [
  "市场与机会",
  "竞争格局",
  "商业模式",
  "内部能力",
  "财务健康",
] as const;

async function resetDiagnosisDraft(page: Page) {
  const storageState = await page.context().storageState();
  const token = storageState.origins
    .flatMap(origin => origin.localStorage)
    .find(item => item.name === "auth_token")?.value;
  const response = await page.request.post(
    "/api/trpc/diagnosis.draft.save",
    {
      data: {
        json: {
          stepIndex: 0,
          conversationUnitIndex: 0,
          answers: {},
          customValues: {},
        },
      },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  expect(response.ok()).toBe(true);
  await page.addInitScript(() => {
    window.localStorage.removeItem("zesai-diagnosis-draft-v1");
  });
}

async function answerText(page: Page, answer: string) {
  await page.getByTestId("answer-input").fill(answer);
  await page.getByTestId("answer-send").click();
}

async function answerChoice(page: Page, optionIndexes: number[]) {
  for (const optionIndex of optionIndexes) {
    await page
      .locator(`[data-testid="option-${optionIndex}"]:not([disabled])`)
      .click();
  }
  await page.getByTestId("answer-send").click();
}

async function continueCurrentQuestion(page: Page) {
  await page
    .locator('[data-testid="continue-button"]:visible')
    .click();
}

test("填写完整采集问卷、生成并解锁完整诊断报告", async ({ page }) => {
  test.setTimeout(900000);

  await resetDiagnosisDraft(page);
  await page.goto("/diagnosis/conversation");
  await expect(page).toHaveURL(/\/diagnosis\/conversation(?:[/?#]|$)/);

  // 1–2：公司基本信息
  await answerText(page, COMPANY_NAME);
  await answerText(page, TEXT_ANSWERS.industry);

  // 3–7：规模、趋势和销售渠道
  await answerChoice(page, [2]);
  await answerChoice(page, [2, 7]);
  await answerChoice(page, [1]);
  await answerChoice(page, [2]);
  await answerChoice(page, [0, 1]);

  // 8–14：市场、竞争与商业模式
  await answerText(page, TEXT_ANSWERS.homeMarket);
  await answerText(page, TEXT_ANSWERS.expansion);
  await answerText(page, TEXT_ANSWERS.competitors);
  await answerChoice(page, [1, 3, 5]);
  await answerText(page, TEXT_ANSWERS.uniqueAssets);
  await answerText(page, TEXT_ANSWERS.revenueSources);
  await answerText(page, TEXT_ANSWERS.earningAndRetention);

  // 15：三条产品线，收入合计大于 0
  const productLines = [
    { name: "工业设备结构件", revenue: "3200", totalCost: "2960" },
    { name: "精密传动组件", revenue: "2100", totalCost: "1950" },
    { name: "小批量定制模块", revenue: "900", totalCost: "830" },
  ];
  for (let rowIndex = 0; rowIndex < productLines.length; rowIndex += 1) {
    if (rowIndex > 0) {
      await page.getByTestId("table-add-row").click();
    }
    const row = productLines[rowIndex];
    await page.getByTestId(`table-${rowIndex}-name`).fill(row.name);
    await page.getByTestId(`table-${rowIndex}-revenue`).fill(row.revenue);
    await page
      .getByTestId(`table-${rowIndex}-total_cost`)
      .fill(row.totalCost);
  }
  await continueCurrentQuestion(page);

  // 16：三个客户，收入占比合计 75%
  const customers = [
    { name: "德国客户Alpha", percentage: "32" },
    { name: "美国客户Beta", percentage: "25" },
    { name: "荷兰客户Gamma", percentage: "18" },
  ];
  for (let rowIndex = 0; rowIndex < customers.length; rowIndex += 1) {
    if (rowIndex > 0) {
      await page.getByTestId("table-add-row").click();
    }
    const row = customers[rowIndex];
    await page.getByTestId(`table-${rowIndex}-name`).fill(row.name);
    await page.getByTestId(`table-${rowIndex}-pct`).fill(row.percentage);
  }
  await continueCurrentQuestion(page);

  // 17：团队结构矩阵
  const teamStructure = ["研发", "生产", "销售", "职能"] as const;
  for (const field of teamStructure) {
    const optionIndex = field === "生产" ? 3 : 2;
    await page
      .getByTestId(`matrix-capability.team_structure.${field}-${optionIndex}`)
      .click();
  }
  await continueCurrentQuestion(page);

  // 18：关键职能矩阵
  const functionStrengths = [
    ["product", 2],
    ["supply_chain", 3],
    ["channel", 2],
    ["marketing", 1],
    ["finance", 2],
  ] as const;
  for (const [field, optionIndex] of functionStrengths) {
    await page
      .getByTestId(
        `matrix-capability.function_strength.${field}-${optionIndex}`
      )
      .click();
  }
  await continueCurrentQuestion(page);

  // 19–20：利润与成本
  await answerChoice(page, [2]);
  await answerText(page, TEXT_ANSWERS.costStructure);

  // 21–22：现金和月固定开销
  await page.getByTestId("number-input").fill("680");
  await continueCurrentQuestion(page);
  await page.getByTestId("number-input").fill("85");
  await continueCurrentQuestion(page);

  // 23a/23b：应收余额与平均账期
  await page.getByTestId("ar-balance").fill("1250");
  await page.getByTestId("ar-days").fill("75");
  await continueCurrentQuestion(page);

  // 24：当前最焦虑的问题
  await answerText(page, TEXT_ANSWERS.anxiety);

  await page.getByTestId("submit-diagnosis").click();
  await expect(page).toHaveURL(
    /\/diagnosis\/\d+\/processing(?:[/?#]|$)/,
    { timeout: 60_000 }
  );

  await expect
    .poll(() => page.url(), {
      message: "等待诊断报告生成完成并跳转到报告页",
      timeout: 600_000,
      intervals: [3_000],
    })
    .toMatch(/\/diagnosis\/\d+\/report(?:[/?#]|$)/);

  await expect(page.locator(".diagnosis-report")).toBeVisible();
  await expect(page.locator(".report-health")).toBeVisible();
  for (const dimension of DIMENSIONS) {
    await expect(page.getByText(dimension, { exact: true }).first()).toBeVisible();
  }

  const unlockButton = page.getByRole("button", {
    name: /解锁完整报告/,
  });
  await expect(unlockButton).toBeEnabled();
  const unlockResponsePromise = page.waitForResponse(
    response =>
      response.url().includes("/api/trpc/diagnosis.submitFull") &&
      response.request().method() === "POST"
  );
  await unlockButton.click();
  const unlockResponse = await unlockResponsePromise;
  expect(unlockResponse.ok()).toBe(true);
  await expect(
    page.getByText("完整诊断已解锁", { exact: true })
  ).toBeVisible();

  const fullDimensions = page.locator(".report-dimension");
  const fullDimensionHeadings = fullDimensions.locator(".report-heading");
  await expect(fullDimensions).toHaveCount(5);
  await expect(fullDimensionHeadings).toHaveCount(5);
  await expect(fullDimensions.first()).toBeVisible();
  for (const dimension of DIMENSIONS) {
    await expect(
      fullDimensionHeadings.filter({ hasText: dimension })
    ).toHaveCount(1);
  }
  await expect(unlockButton).toHaveCount(0);
});
