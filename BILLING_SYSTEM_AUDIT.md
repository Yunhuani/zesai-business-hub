# 计费体系统一排查报告

## 目标
将所有"次数限制"改为"积分制"，确保整个平台只使用积分作为唯一计费单位。

## 排查范围

### 1. 数据库Schema
- [ ] subscriptions表中的monthlyLimit字段
- [ ] usageRecords表中的usageCount字段
- [ ] users表中的积分相关字段

### 2. 后端代码
- [ ] payment.ts中的PLAN_CONFIG（monthlyLimit定义）
- [ ] db.ts中的checkUsageLimit函数
- [ ] creditsManager.ts中的PLAN_CREDITS配置
- [ ] routers.ts中的订阅相关接口

### 3. 前端代码
- [ ] Pricing.tsx中的套餐展示（limit字段）
- [ ] Credits.tsx中的积分显示
- [ ] 其他页面中的次数/积分显示

### 4. 套餐配置
- [ ] 统一套餐定义（只保留积分，删除次数）
- [ ] 更新套餐描述文案

## 发现的问题

### 问题1：两套并存的计费系统
**位置：** `server/routers/payment.ts`
```typescript
const PLAN_CONFIG = {
  basic: {
    monthlyLimit: 20,  // ❌ 次数限制
    price: 9900,
  },
  professional: {
    monthlyLimit: 100, // ❌ 次数限制
    price: 29900,
  },
}
```

**位置：** `server/creditsManager.ts`
```typescript
export const PLAN_CREDITS = {
  basic: 1000,        // ✅ 积分制
  professional: 3500, // ✅ 积分制
}
```

### 问题2：使用次数检查逻辑
**位置：** `server/db.ts`
```typescript
export async function checkUsageLimit(userId: number) {
  // 检查每月使用次数限制
  const freeLimit = 3; // ❌ 使用次数
}
```

### 问题3：前端显示次数
**位置：** `client/src/pages/Pricing.tsx`
```typescript
const plans = [
  {
    id: "basic",
    limit: 20, // ❌ 显示次数
  }
]
```

## 修改方案

### 方案：统一为积分制

**1. 删除所有次数相关字段和逻辑**
- 删除subscriptions.monthlyLimit
- 删除usageRecords表（不再需要）
- 删除checkUsageLimit函数

**2. 统一使用积分系统**
- 用户购买套餐 → 获得对应积分（每月重置）
- 用户使用功能 → 扣除对应积分
- 积分不足 → 提示充值或升级套餐

**3. 套餐配置统一**
```typescript
const PLAN_CONFIG = {
  free: {
    name: "免费版",
    price: 0,
    monthlyCredits: 500,    // ✅ 每月积分
  },
  basic: {
    name: "基础版",
    price: 9900,
    monthlyCredits: 5000,   // ✅ 每月积分
  },
  professional: {
    name: "专业版",
    price: 29900,
    monthlyCredits: 20000,  // ✅ 每月积分
  },
  enterprise: {
    name: "企业版",
    price: 99900,
    monthlyCredits: 100000, // ✅ 每月积分
  },
}
```

**4. 前端显示统一**
- 所有套餐卡片显示"每月X积分"
- 删除"每月X次"的描述
- 统一使用积分余额显示

## 待修改文件清单

### 后端
- [ ] `server/routers/payment.ts` - 修改PLAN_CONFIG
- [ ] `server/creditsManager.ts` - 统一PLAN_CREDITS
- [ ] `server/db.ts` - 删除checkUsageLimit
- [ ] `server/routers.ts` - 删除次数检查逻辑
- [ ] `drizzle/schema.ts` - 删除monthlyLimit字段

### 前端
- [ ] `client/src/pages/Pricing.tsx` - 修改套餐显示
- [ ] `client/src/pages/Credits.tsx` - 确认积分显示正确
- [ ] 其他相关页面

### 数据库迁移
- [ ] 创建迁移脚本删除无用字段
- [ ] 为现有用户初始化积分

## 验证清单
- [ ] 用户购买套餐后，积分正确增加
- [ ] 用户使用功能时，积分正确扣除
- [ ] 套餐到期后，订阅积分正确重置
- [ ] 前端所有页面不再显示"次数"
- [ ] 所有测试通过


---

## 详细排查结果

### 数据库Schema问题

**文件：** `drizzle/schema.ts`

1. **subscriptions表 - Line 93**
   ```typescript
   monthlyLimit: int("monthlyLimit").notNull().default(0), // ❌ 需要删除
   ```
   - 问题：使用次数限制而非积分
   - 影响：所有订阅相关逻辑都基于此字段
   
2. **usageRecords表 - Line 108-115**
   ```typescript
   export const usageRecords = mysqlTable("usageRecords", {
     id: int("id").autoincrement().primaryKey(),
     userId: int("userId").notNull(),
     month: varchar("month", { length: 7 }).notNull(),
     usageCount: int("usageCount").notNull().default(0), // ❌ 整个表都要删除
   });
   ```
   - 问题：整个表用于记录使用次数
   - 影响：需要完全删除此表

### 后端代码问题

**文件：** `server/routers/payment.ts`

1. **PLAN_CONFIG定义 - Line 10-29**
   ```typescript
   const PLAN_CONFIG = {
     basic: {
       monthlyLimit: 20,    // ❌ 改为 monthlyCredits: 5000
       price: 9900,
     },
     professional: {
       monthlyLimit: 100,   // ❌ 改为 monthlyCredits: 20000
       price: 29900,
     },
     enterprise: {
       monthlyLimit: 0,     // ❌ 改为 monthlyCredits: 100000
       price: 99900,
     },
   }
   ```

2. **支付订单描述 - Line 69, 156**
   ```typescript
   body: `订阅${config.name},${config.monthlyLimit === 0 ? "无限次" : `${config.monthlyLimit}次/月`}咨询服务`
   // ❌ 改为显示积分数量
   ```

3. **订阅激活逻辑 - Line 231-237, 328-334**
   ```typescript
   await createOrUpdateSubscription({
     monthlyLimit: subscriptionConfig.monthlyLimit, // ❌ 需要改为积分逻辑
   });
   ```

**文件：** `server/db.ts`

1. **createOrUpdateSubscription函数 - Line 211-244**
   ```typescript
   export async function createOrUpdateSubscription(data: {
     monthlyLimit: number, // ❌ 删除此参数
   })
   ```

2. **checkUsageLimit函数 - Line 296-333**
   ```typescript
   export async function checkUsageLimit(userId: number) {
     // ❌ 整个函数需要删除，改用 checkCredits
   }
   ```

3. **getOrCreateUsageRecord函数 - Line 247-271**
   ```typescript
   export async function getOrCreateUsageRecord() {
     // ❌ 整个函数需要删除
   }
   ```

4. **incrementUsageCount函数 - Line 273-294**
   ```typescript
   export async function incrementUsageCount() {
     // ❌ 整个函数需要删除
   }
   ```

**文件：** `server/routers.ts`

1. **subscription.upgrade接口 - Line 419-425**
   ```typescript
   await createOrUpdateSubscription({
     monthlyLimit: plan.limit, // ❌ 需要改为积分逻辑
   });
   ```

**文件：** `server/_core/index.ts`

1. **支付宝回调处理 - Line 84-101**
   ```typescript
   const PLAN_CONFIG = {
     basic: { monthlyLimit: 20, ... }, // ❌ 需要统一配置
   };
   ```

### 前端代码问题

**文件：** `client/src/pages/Pricing.tsx`

1. **套餐配置 - Line 12-75**
   ```typescript
   const plans = [
     {
       id: "free",
       limit: 3,      // ❌ 改为 monthlyCredits: 500
     },
     {
       id: "basic",
       limit: 20,     // ❌ 改为 monthlyCredits: 5000
     },
     {
       id: "professional",
       limit: 100,    // ❌ 改为 monthlyCredits: 20000
     },
     {
       id: "enterprise",
       limit: 0,      // ❌ 改为 monthlyCredits: 100000
     },
   ]
   ```

2. **套餐特性描述**
   - 需要将所有"每月X次"改为"每月X积分"
   - 需要添加积分消耗说明

### 测试文件问题

**文件：** `server/test-payment-flow.test.ts`
**文件：** `server/__tests__/payment.test.ts`

- 所有测试中的monthlyLimit断言都需要更新

---

## 统一后的配置方案

### 1. 套餐积分配置

```typescript
// server/routers/payment.ts
const PLAN_CONFIG = {
  free: {
    name: "免费版",
    price: 0,
    monthlyCredits: 500,      // 每月500积分
    duration: 30,
  },
  basic: {
    name: "基础版",
    price: 9900,              // ¥99
    monthlyCredits: 5000,     // 每月5000积分
    duration: 30,
  },
  professional: {
    name: "专业版",
    price: 29900,             // ¥299
    monthlyCredits: 20000,    // 每月20000积分
    duration: 30,
  },
  enterprise: {
    name: "企业版",
    price: 99900,             // ¥999
    monthlyCredits: 100000,   // 每月100000积分
    duration: 30,
  },
}
```

### 2. 积分消耗标准（已存在）

```typescript
// server/creditsManager.ts
export const CREDITS_COST = {
  BASIC_CHAT: 10,           // 基础对话 10积分
  DEEP_CHAT: 20,            // 深度对话 20积分
  DOCUMENT_ANALYSIS: 30,    // 文档分析 30积分
  EXPORT_PPT: 50,           // 导出PPT 50积分
  EXPORT_PDF: 30,           // 导出PDF 30积分
  CHART_GENERATION: 20,     // 图表生成 20积分
}

// 文档生成
export const DOCUMENT_PRICING = {
  heavy: 200,   // 重度文档 200积分
  medium: 140,  // 中度文档 140积分
  light: 100,   // 轻度文档 100积分
}
```

### 3. 套餐价值对比

| 套餐 | 价格 | 每月积分 | 基础对话次数 | 重度文档数 |
|------|------|----------|------------|-----------|
| 免费版 | ¥0 | 500 | ~50次 | ~2份 |
| 基础版 | ¥99 | 5000 | ~500次 | ~25份 |
| 专业版 | ¥299 | 20000 | ~2000次 | ~100份 |
| 企业版 | ¥999 | 100000 | ~10000次 | ~500份 |

---

## 修改优先级

### P0 - 核心逻辑（必须立即修改）
1. ✅ `server/creditsManager.ts` - 已经是积分制，无需修改
2. ❌ `server/routers/payment.ts` - PLAN_CONFIG改为monthlyCredits
3. ❌ `server/db.ts` - 删除checkUsageLimit等函数
4. ❌ `drizzle/schema.ts` - 删除monthlyLimit字段和usageRecords表

### P1 - 业务逻辑（影响功能）
5. ❌ `server/routers.ts` - 修改subscription相关接口
6. ❌ `server/_core/index.ts` - 统一支付回调逻辑
7. ❌ `client/src/pages/Pricing.tsx` - 改为显示积分

### P2 - 测试和文档（确保质量）
8. ❌ 更新所有测试文件
9. ❌ 更新API文档
10. ❌ 创建数据库迁移脚本

---

## 下一步行动

等待您确认后开始修改。确认后我将：

1. 修改数据库schema
2. 修改所有后端代码
3. 修改所有前端代码
4. 运行测试验证
5. 创建数据库迁移脚本
6. 更新文档

**重要提醒：** 这是核心架构修改，需要谨慎处理。建议在测试环境充分验证后再部署到生产环境。
