#!/usr/bin/env node

/**
 * End-to-end NBG diagnosis smoke test.
 *
 * Usage:
 *   TEST_EMAIL="user@example.com" TEST_PASSWORD="password" node scripts/test-diagnosis.mjs
 *   API_BASE="https://api.example.com" TEST_EMAIL="user@example.com" TEST_PASSWORD="password" node scripts/test-diagnosis.mjs
 *
 * Environment:
 *   API_BASE               Backend base URL. Default: http://localhost:3000
 *   TEST_EMAIL             Email account used to call protected tRPC routes.
 *   TEST_PASSWORD          Password for TEST_EMAIL.
 *   POLL_INTERVAL_MS       Poll interval. Default: 3000
 *   DIAGNOSIS_TIMEOUT_MS   Max wait time. Default: 900000
 */

const API_BASE = process.env.API_BASE || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL || process.env.LOGIN_EMAIL || process.env.EMAIL;
const TEST_PASSWORD =
  process.env.TEST_PASSWORD || process.env.LOGIN_PASSWORD || process.env.PASSWORD;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 3000);
const DIAGNOSIS_TIMEOUT_MS = Number(process.env.DIAGNOSIS_TIMEOUT_MS || 900000);

const questionnaireInput = {
  answers: {
    "company.name": "宁波海拓精密制造有限公司",
    "company.industry_sub": "工业阀门与流体控制零部件出口制造",
    "company.revenue_band": "5000万-1亿",
    "company.region": ["华东", "海外市场"],
    "company.revenue_trend": "持续增长",
    "company.headcount_band": "100-200人",
    "company.channels": ["渠道销售", "跨境电商", "B端工程"],
    "company.top_anxiety":
      "北美订单增长放缓，欧洲新客户验证周期变长，销售团队忙于报价但高毛利订单占比下降。",
    "market.home_market": "北美和欧洲的工业设备维修渠道，以及国内华东区域设备集成商",
    "market.expansion_intent": "希望进入东南亚食品加工设备配套市场，并提升欧洲OEM客户占比",
    "competition.competitors":
      "本地低价代工厂\n土耳其阀门配件供应商\n欧洲小批量定制工厂",
    "competition.customer_values": ["交期", "品质", "认证"],
    "competition.unique_assets":
      "通过ISO 9001和CE认证\n有稳定的不锈钢精密加工工艺\n服务过多家北美渠道客户\n具备小批量定制能力",
    "business_model.revenue_sources":
      "收入主要来自不锈钢阀体、接头、泵用精密零部件和少量整套流体控制模块。",
    "business_model.how_earn_retain":
      "依靠稳定交期、质量一致性和工程响应速度拿单，靠长期供货记录、认证文件和售后替换件能力留住客户。",
    "capability.team_structure.研发": "中",
    "capability.team_structure.生产": "强",
    "capability.team_structure.销售": "中",
    "capability.team_structure.职能": "中",
    "capability.function_strength.product": "中",
    "capability.function_strength.supply_chain": "强",
    "capability.function_strength.channel": "中",
    "capability.function_strength.marketing": "弱",
    "capability.function_strength.finance": "中",
    "finance_basic.net_margin_band": "10%-15%",
    "finance_basic.cost_structure":
      "原材料约45%，人工约18%，外协加工约12%，物流和认证费用约8%，销售费用约7%。",
    "finance_basic.cash": "420",
    "finance_basic.monthly_fixed": "95",
  },
  customValues: {},
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildUrl(path) {
  return new URL(path, API_BASE.replace(/\/+$/, "") + "/");
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function unwrapTrpcResponse(payload) {
  if (payload?.error) {
    throw new Error(formatJson(payload.error));
  }

  const data = payload?.result?.data;
  if (data && typeof data === "object" && "json" in data) {
    return data.json;
  }
  return data;
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`HTTP ${response.status} ${response.statusText}\n${text}`);
  }
}

async function trpcPost(procedure, input, token) {
  const response = await fetch(buildUrl(`/api/trpc/${procedure}`), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ json: input }),
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`POST ${procedure} failed: HTTP ${response.status}\n${formatJson(payload)}`);
  }

  return unwrapTrpcResponse(payload);
}

async function trpcGet(procedure, input, token) {
  const url = buildUrl(`/api/trpc/${procedure}`);
  url.searchParams.set("input", JSON.stringify({ json: input }));

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`GET ${procedure} failed: HTTP ${response.status}\n${formatJson(payload)}`);
  }

  return unwrapTrpcResponse(payload);
}

async function login() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "diagnosis.submit is protected. Set TEST_EMAIL and TEST_PASSWORD before running this script."
    );
  }

  const data = await trpcPost("auth.loginWithEmail", {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (!data?.token) {
    throw new Error(`Login succeeded but no token was returned:\n${formatJson(data)}`);
  }

  return data.token;
}

function pickHeadline(diagnosis) {
  return (
    diagnosis?.headline ||
    diagnosis?.result?.synthesis_output?.headline ||
    diagnosis?.result?.synthesis_output?.three_key_findings?.[0]?.title ||
    "(headline not exposed by current API)"
  );
}

function pickOverallScore(diagnosis) {
  return (
    diagnosis?.overallScore ??
    diagnosis?.result?.score_summary?.overall_score ??
    "(overall_score not exposed by current API)"
  );
}

function buildFailurePayload(diagnosis) {
  return {
    diagnosis,
    note:
      "Current diagnosis.get serialization does not expose diagnoses.errorMessage. If engine redline details are missing here, expose errorMessage in the backend API or check server logs/database.",
  };
}

async function pollDiagnosis(token, diagnosisId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < DIAGNOSIS_TIMEOUT_MS) {
    const diagnosis = await trpcGet("diagnosis.get", { id: diagnosisId }, token);
    const status = diagnosis?.status;
    console.log(`status=${status || "unknown"} diagnosisId=${diagnosisId}`);

    if (status === "done") {
      console.log(`PASS headline=${pickHeadline(diagnosis)} overall_score=${pickOverallScore(diagnosis)}`);
      return;
    }

    if (status === "error") {
      console.error(`FAIL\n${formatJson(buildFailurePayload(diagnosis))}`);
      process.exitCode = 1;
      return;
    }

    await sleep(POLL_INTERVAL_MS);
  }

  console.error(
    `FAIL\n${formatJson({
      error: "Timed out waiting for diagnosis to finish",
      diagnosisId,
      timeoutMs: DIAGNOSIS_TIMEOUT_MS,
    })}`
  );
  process.exitCode = 1;
}

async function main() {
  console.log(`API_BASE=${API_BASE}`);
  console.log("login=auth.loginWithEmail");
  const token = await login();

  console.log("submit=diagnosis.submit");
  const submitted = await trpcPost("diagnosis.submit", questionnaireInput, token);
  const diagnosisId = submitted?.diagnosisId;

  if (!Number.isInteger(diagnosisId) || diagnosisId <= 0) {
    throw new Error(`diagnosis.submit did not return a valid diagnosisId:\n${formatJson(submitted)}`);
  }

  console.log(`diagnosisId=${diagnosisId}`);
  console.log("poll=diagnosis.get");
  await pollDiagnosis(token, diagnosisId);
}

main().catch(error => {
  console.error(`FAIL\n${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
