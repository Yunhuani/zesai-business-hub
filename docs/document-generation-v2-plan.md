# 泽思AI 文档生成功能 V2 产品开发方案

> 版本：V2.0  
> 日期：2026-01-16  
> 状态：设计阶段

---

## 一、产品目标

### 1.1 核心目标
让用户能够将AI咨询对话内容，一键生成专业的商业文档（Word/Excel/PPT），可直接用于商业场景。

### 1.2 成功标准
- 文档内容完整，无截断
- 排版专业，可直接交付客户
- 下载成功率 > 99%
- 用户满意度 > 4.5/5

---

## 二、功能设计

### 2.1 支持的文档类型

| 格式 | 适用场景 | 优先级 |
|------|---------|--------|
| **Word (.docx)** | 商业计划书、分析报告、方案文档 | P0 |
| **PDF** | 正式报告、只读分享 | P1 |
| **Excel (.xlsx)** | 财务模型、数据分析、对比表格 | P2 |
| **PPT (.pptx)** | 路演演示、汇报材料 | P3 |

### 2.2 文档模板体系

每个Agent对应一套文档模板，定义：
- 文档结构（章节目录）
- 每个章节的生成提示词
- 样式规范（字体、颜色、间距）

**示例 - 商业计划书Agent：**
```
1. 执行摘要
2. 公司介绍
3. 产品/服务
4. 市场分析
5. 竞争分析
6. 营销策略
7. 运营计划
8. 管理团队
9. 财务预测
10. 融资需求
11. 附录
```

### 2.3 文档质量等级

| 等级 | 说明 | 积分消耗 | 生成时间 |
|------|------|---------|---------|
| 标准版 | 基础排版，内容完整 | 100 | ~30秒 |
| 专业版 | 专业排版，图表优化 | 200 | ~60秒 |
| 高级版 | 定制封面，完整设计 | 300 | ~90秒 |

---

## 三、前端交互设计

### 3.1 入口位置

**方案A：对话页面底部浮动按钮（推荐）**
- 当对话内容足够丰富时（>5轮对话），显示"生成文档"按钮
- 点击后弹出文档类型选择面板

**方案B：对话结束后提示**
- AI回复最后一条消息后，自动提示"是否生成文档"

### 3.2 交互流程

```
用户点击"生成文档"
    ↓
选择文档类型（Word/Excel/PPT）
    ↓
选择文档模板（商业计划书/分析报告/...）
    ↓
选择质量等级（标准/专业/高级）
    ↓
确认积分消耗
    ↓
显示生成进度（预计时间、当前步骤）
    ↓
生成完成 → 预览 + 下载
```

### 3.3 UI组件设计

#### 3.3.1 文档生成面板
```
┌─────────────────────────────────────────┐
│  📄 生成专业文档                    [×] │
├─────────────────────────────────────────┤
│                                         │
│  选择文档格式：                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │
│  │Word │ │ PDF │ │Excel│ │ PPT │       │
│  └─────┘ └─────┘ └─────┘ └─────┘       │
│                                         │
│  选择文档类型：                         │
│  ○ 商业计划书（完整版）                 │
│  ○ 商业计划书（精简版）                 │
│  ○ 市场分析报告                         │
│  ○ 竞品分析报告                         │
│                                         │
│  质量等级：                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ 标准版  │ │ 专业版  │ │ 高级版  │   │
│  │ 100积分 │ │ 200积分 │ │ 300积分 │   │
│  └─────────┘ └─────────┘ └─────────┘   │
│                                         │
│  当前积分：580                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        确认生成（200积分）       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### 3.3.2 生成进度面板
```
┌─────────────────────────────────────────┐
│  📄 正在生成文档...                     │
├─────────────────────────────────────────┤
│                                         │
│  ████████████░░░░░░░░  60%              │
│                                         │
│  ✓ 分析对话内容                         │
│  ✓ 生成执行摘要                         │
│  ✓ 生成市场分析                         │
│  ● 生成财务预测...                      │
│  ○ 生成附录                             │
│  ○ 排版优化                             │
│                                         │
│  预计剩余时间：30秒                     │
│                                         │
└─────────────────────────────────────────┘
```

#### 3.3.3 完成面板
```
┌─────────────────────────────────────────┐
│  ✓ 文档生成完成                         │
├─────────────────────────────────────────┤
│                                         │
│  📄 商业计划书（完整版）.docx           │
│     文件大小：2.3 MB                    │
│     有效期：7天                         │
│                                         │
│  ┌───────────┐  ┌───────────┐          │
│  │   预览    │  │   下载    │          │
│  └───────────┘  └───────────┘          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │        生成其他格式              │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 3.4 我的文档页面

新增"我的文档"页面，展示用户生成的所有文档：

```
┌─────────────────────────────────────────────────────────────┐
│  我的文档                                    [生成新文档]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📄 商业计划书（完整版）.docx                        │   │
│  │    来源：融资商业计划书顾问 | 2026-01-16 10:30     │   │
│  │    有效期：还剩5天                                  │   │
│  │    [预览] [下载] [重新生成]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 财务预测模型.xlsx                                │   │
│  │    来源：财务分析顾问 | 2026-01-15 14:20           │   │
│  │    有效期：还剩4天                                  │   │
│  │    [预览] [下载] [重新生成]                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、后端逻辑设计

### 4.1 核心流程

```
┌──────────────────────────────────────────────────────────────┐
│                      文档生成核心流程                         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 接收请求                                                 │
│     ↓                                                        │
│  2. 权限校验（用户身份、积分余额）                           │
│     ↓                                                        │
│  3. 获取完整对话历史                                         │
│     ↓                                                        │
│  4. 加载Agent对应的文档模板                                  │
│     ↓                                                        │
│  5. 分段生成内容（每个章节单独调用LLM）                      │
│     ├── 章节1: 执行摘要 → LLM生成                           │
│     ├── 章节2: 市场分析 → LLM生成                           │
│     ├── 章节3: 财务预测 → LLM生成                           │
│     └── ...                                                  │
│     ↓                                                        │
│  6. 合并章节内容                                             │
│     ↓                                                        │
│  7. 生成文档文件（Word/Excel/PPT）                           │
│     ↓                                                        │
│  8. 上传到S3                                                 │
│     ↓                                                        │
│  9. 扣除积分、记录日志                                       │
│     ↓                                                        │
│  10. 返回下载链接                                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 分段生成策略

**核心思想：** 将长文档拆分成多个章节，每个章节单独调用LLM生成，避免token限制导致的内容截断。

```typescript
async function generateDocumentByChapters(
  conversationHistory: Message[],
  template: DocumentTemplate
): Promise<string> {
  const chapters: string[] = [];
  
  for (const chapter of template.chapters) {
    const chapterContent = await invokeLLM({
      messages: [
        {
          role: "system",
          content: buildChapterPrompt(chapter, template.agentRole)
        },
        {
          role: "user", 
          content: `基于以下对话内容，生成"${chapter.title}"章节：\n\n${formatConversation(conversationHistory)}`
        }
      ],
      max_tokens: 4096
    });
    
    chapters.push(chapterContent);
    
    // 实时推送进度
    await pushProgress(chapter.index, template.chapters.length);
  }
  
  return mergeChapters(chapters, template);
}
```

### 4.3 文档生成器架构

```
┌─────────────────────────────────────────────────────────────┐
│                    DocumentGenerator                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐                                        │
│  │ ContentGenerator│  负责调用LLM生成文本内容               │
│  │  - generateByChapters()                                  │
│  │  - enhanceContent()                                      │
│  └────────┬────────┘                                        │
│           ↓                                                 │
│  ┌─────────────────┐                                        │
│  │ FormatConverter │  负责将内容转换为目标格式              │
│  │  - toWord()                                              │
│  │  - toExcel()                                             │
│  │  - toPPT()                                               │
│  │  - toPDF()                                               │
│  └────────┬────────┘                                        │
│           ↓                                                 │
│  ┌─────────────────┐                                        │
│  │ TemplateEngine  │  负责应用样式模板                      │
│  │  - applyWordTemplate()                                   │
│  │  - applyPPTTemplate()                                    │
│  └────────┬────────┘                                        │
│           ↓                                                 │
│  ┌─────────────────┐                                        │
│  │ StorageManager  │  负责文件存储和管理                    │
│  │  - uploadToS3()                                          │
│  │  - generateDownloadUrl()                                 │
│  └─────────────────┘                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 进度推送机制

使用Server-Sent Events (SSE)实时推送生成进度：

```typescript
// 服务端
app.get('/api/document/progress/:taskId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  
  const unsubscribe = progressEmitter.on(req.params.taskId, (progress) => {
    res.write(`data: ${JSON.stringify(progress)}\n\n`);
  });
  
  req.on('close', unsubscribe);
});

// 客户端
const eventSource = new EventSource(`/api/document/progress/${taskId}`);
eventSource.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  updateProgressUI(progress);
};
```

---

## 五、数据结构设计

### 5.1 数据库表结构

#### 5.1.1 文档模板表 (document_templates)

```sql
CREATE TABLE document_templates (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER REFERENCES agents(id),
  name VARCHAR(100) NOT NULL,           -- 模板名称，如"商业计划书（完整版）"
  file_id VARCHAR(50) NOT NULL,         -- 模板标识，如"business_plan_full"
  format VARCHAR(20) NOT NULL,          -- 支持的格式：word/excel/ppt
  structure JSONB NOT NULL,             -- 章节结构定义
  style_config JSONB,                   -- 样式配置
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**structure字段示例：**
```json
{
  "chapters": [
    {
      "id": "executive_summary",
      "title": "执行摘要",
      "order": 1,
      "prompt": "请基于对话内容，撰写一份简洁有力的执行摘要，包含：项目概述、核心价值主张、目标市场、商业模式、融资需求。控制在500字以内。",
      "required": true
    },
    {
      "id": "market_analysis",
      "title": "市场分析",
      "order": 2,
      "prompt": "请基于对话内容，撰写详细的市场分析章节，包含：市场规模、增长趋势、目标客户画像、市场痛点。如有数据请用表格呈现。",
      "required": true
    }
  ]
}
```

#### 5.1.2 生成任务表 (document_tasks)

```sql
CREATE TABLE document_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  conversation_id INTEGER REFERENCES conversations(id) NOT NULL,
  template_id INTEGER REFERENCES document_templates(id) NOT NULL,
  
  status VARCHAR(20) DEFAULT 'pending',  -- pending/processing/completed/failed
  progress INTEGER DEFAULT 0,            -- 0-100
  current_step VARCHAR(100),             -- 当前步骤描述
  
  file_url TEXT,                         -- S3下载链接
  file_size INTEGER,                     -- 文件大小(bytes)
  
  credits_cost INTEGER NOT NULL,         -- 消耗积分
  quality_level VARCHAR(20) NOT NULL,    -- standard/professional/premium
  
  error_message TEXT,                    -- 错误信息
  expires_at TIMESTAMP,                  -- 过期时间
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5.1.3 章节内容缓存表 (document_chapters)

```sql
CREATE TABLE document_chapters (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES document_tasks(id) NOT NULL,
  chapter_id VARCHAR(50) NOT NULL,
  chapter_title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.2 API接口设计

#### 5.2.1 获取可用模板
```
GET /api/document/templates?agentId={agentId}

Response:
{
  "templates": [
    {
      "id": 1,
      "name": "商业计划书（完整版）",
      "fileId": "business_plan_full",
      "formats": ["word", "pdf"],
      "chapters": ["执行摘要", "市场分析", "财务预测", ...],
      "estimatedTime": 60,
      "credits": {
        "standard": 100,
        "professional": 200,
        "premium": 300
      }
    }
  ]
}
```

#### 5.2.2 创建生成任务
```
POST /api/document/generate

Request:
{
  "conversationId": 123,
  "templateId": 1,
  "format": "word",
  "qualityLevel": "professional"
}

Response:
{
  "taskId": "task_abc123",
  "estimatedTime": 60,
  "creditsDeducted": 200
}
```

#### 5.2.3 查询任务进度
```
GET /api/document/progress/{taskId}

Response (SSE):
data: {"progress": 30, "step": "正在生成市场分析章节..."}
data: {"progress": 60, "step": "正在生成财务预测章节..."}
data: {"progress": 100, "step": "完成", "fileUrl": "https://..."}
```

#### 5.2.4 获取用户文档列表
```
GET /api/document/list

Response:
{
  "documents": [
    {
      "id": 1,
      "name": "商业计划书（完整版）",
      "format": "word",
      "fileUrl": "https://...",
      "fileSize": 2345678,
      "createdAt": "2026-01-16T10:30:00Z",
      "expiresAt": "2026-01-23T10:30:00Z"
    }
  ]
}
```

---

## 六、技术选型

### 6.1 文档生成库

| 格式 | 推荐库 | 说明 |
|------|--------|------|
| Word | docx (npm) | 功能完整，支持样式、表格、图片 |
| PDF | pdfkit 或 puppeteer | pdfkit轻量，puppeteer支持HTML转PDF |
| Excel | exceljs | 功能强大，支持公式、图表 |
| PPT | pptxgenjs | 专业PPT生成，支持模板 |

### 6.2 LLM调用

- **主选：** Manus内置LLM（已集成）
- **备选：** OpenAI GPT-4（需配置API Key）
- **优化：** 对于长文档，使用Claude（200K context）

### 6.3 存储

- **文件存储：** S3（已集成）
- **缓存：** Redis（可选，用于进度状态）

---

## 七、开发阶段规划

### 阶段一：基础架构（3天）

| 任务 | 时间 | 产出 |
|------|------|------|
| 数据库表设计与迁移 | 0.5天 | SQL脚本 |
| 文档模板数据结构 | 0.5天 | TypeScript类型定义 |
| 分段生成核心逻辑 | 1天 | ContentGenerator模块 |
| 进度推送机制 | 0.5天 | SSE接口 |
| 单元测试 | 0.5天 | 测试用例 |

### 阶段二：Word文档生成（3天）

| 任务 | 时间 | 产出 |
|------|------|------|
| Word生成器重构 | 1天 | wordGenerator.ts |
| 专业排版模板 | 1天 | 封面、目录、样式 |
| 前端生成面板 | 0.5天 | DocumentGeneratePanel组件 |
| 集成测试 | 0.5天 | 端到端测试 |

### 阶段三：前端交互完善（2天）

| 任务 | 时间 | 产出 |
|------|------|------|
| 生成进度面板 | 0.5天 | ProgressPanel组件 |
| 我的文档页面 | 1天 | MyDocuments页面 |
| 下载与预览 | 0.5天 | 下载逻辑优化 |

### 阶段四：Excel生成（2天）

| 任务 | 时间 | 产出 |
|------|------|------|
| Excel生成器重构 | 1天 | excelGenerator.ts |
| 财务模型模板 | 0.5天 | 预设公式、图表 |
| 测试与优化 | 0.5天 | 测试用例 |

### 阶段五：PPT生成（3天）

| 任务 | 时间 | 产出 |
|------|------|------|
| PPT生成器重构 | 1天 | pptGenerator.ts |
| 商务PPT模板设计 | 1.5天 | 多套配色、布局 |
| 测试与优化 | 0.5天 | 测试用例 |

### 阶段六：测试与上线（2天）

| 任务 | 时间 | 产出 |
|------|------|------|
| 灰度测试 | 1天 | 管理员测试 |
| Bug修复 | 0.5天 | 问题修复 |
| 全量发布 | 0.5天 | 上线 |

**总计：15天**

---

## 八、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|---------|
| LLM生成内容质量不稳定 | 文档质量参差不齐 | 设计fallback机制，人工审核模板 |
| 长文档生成超时 | 用户等待过久 | 异步生成+进度推送，设置合理超时 |
| 文件下载失败 | 用户无法获取文档 | S3多区域备份，重试机制 |
| 积分扣除后生成失败 | 用户投诉 | 失败自动退还积分 |

---

## 九、后续优化方向

1. **AI辅助编辑** - 用户可以对生成的文档进行AI辅助修改
2. **协作功能** - 多人协作编辑文档
3. **版本管理** - 保存文档历史版本
4. **自定义模板** - 用户上传自己的模板
5. **批量生成** - 一次生成多种格式

---

## 附录：Agent文档模板配置示例

### A.1 融资商业计划书Agent

```json
{
  "agentId": 2,
  "templates": [
    {
      "name": "商业计划书（完整版）",
      "fileId": "business_plan_full",
      "formats": ["word", "pdf"],
      "chapters": [
        {"id": "cover", "title": "封面", "type": "cover"},
        {"id": "toc", "title": "目录", "type": "toc"},
        {"id": "executive_summary", "title": "执行摘要", "prompt": "..."},
        {"id": "company_intro", "title": "公司介绍", "prompt": "..."},
        {"id": "product_service", "title": "产品与服务", "prompt": "..."},
        {"id": "market_analysis", "title": "市场分析", "prompt": "..."},
        {"id": "competition", "title": "竞争分析", "prompt": "..."},
        {"id": "marketing", "title": "营销策略", "prompt": "..."},
        {"id": "operations", "title": "运营计划", "prompt": "..."},
        {"id": "team", "title": "管理团队", "prompt": "..."},
        {"id": "financials", "title": "财务预测", "prompt": "..."},
        {"id": "funding", "title": "融资需求", "prompt": "..."},
        {"id": "appendix", "title": "附录", "prompt": "..."}
      ]
    },
    {
      "name": "商业计划书（精简版）",
      "fileId": "business_plan_lite",
      "formats": ["word", "pdf"],
      "chapters": [
        {"id": "executive_summary", "title": "执行摘要", "prompt": "..."},
        {"id": "business_model", "title": "商业模式", "prompt": "..."},
        {"id": "market_opportunity", "title": "市场机会", "prompt": "..."},
        {"id": "financials", "title": "财务概要", "prompt": "..."},
        {"id": "funding", "title": "融资需求", "prompt": "..."}
      ]
    }
  ]
}
```

### A.2 品牌定位Agent

```json
{
  "agentId": 5,
  "templates": [
    {
      "name": "品牌定位报告",
      "fileId": "brand_positioning_report",
      "formats": ["word", "pdf", "ppt"],
      "chapters": [
        {"id": "brand_essence", "title": "品牌核心", "prompt": "..."},
        {"id": "target_audience", "title": "目标受众", "prompt": "..."},
        {"id": "brand_personality", "title": "品牌个性", "prompt": "..."},
        {"id": "value_proposition", "title": "价值主张", "prompt": "..."},
        {"id": "positioning_statement", "title": "定位声明", "prompt": "..."},
        {"id": "visual_identity", "title": "视觉识别建议", "prompt": "..."},
        {"id": "communication", "title": "传播策略", "prompt": "..."}
      ]
    }
  ]
}
```
