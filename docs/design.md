# 豆包搜索 pi 扩展 - 设计文档

## 1. 概述

为 pi coding agent 开发一个联网搜索扩展，基于火山引擎豆包搜索 API，让 LLM 能在对话中主动发起网络搜索，获取实时信息。

### 设计目标

- **LLM 友好**：工具参数简洁、描述清晰、输出格式易于 LLM 消费
- **Token 高效**：默认返回精炼摘要，控制上下文消耗
- **多 Key 容灾**：支持多 API Key 轮询 + 自动故障转移
- **双版本支持**：Custom 版（国内内容、功能丰富）+ Global 版（国际内容）

### 参考实践

**pi 扩展设计**:

- [pi extensions.md](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)：扩展 API、事件系统、工具注册、自定义渲染
- [pi examples/extensions/](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions)：`truncated-tool.ts`（截断模式）、`todo.ts`（状态管理+渲染）、`preset.ts`（配置加载模式）、`dynamic-tools.ts`（promptSnippet/guidelines）

**工具设计最佳实践**:

- [Anthropic - Writing effective tools for AI agents](https://www.anthropic.com/engineering/writing-effective-tools-for-ai-agents-using-ai-agents)：工具宜少不宜多，返回高信号上下文，优化 token 效率
- [MCP Client Best Practices](https://modelcontextprotocol.io/docs/develop/clients/client-best-practices)：工具命名、参数精简、结构化输出、错误可操作
- Claude Code 内置 web_search：query + allowed_domains + blocked_domains 三参数设计
- Tavily API：`include_answer` 生成 AI 摘要，`score` 相关性评分，snippet / content 分层

---

## 2. 需求分析

### 核心需求

| 需求 | 说明 |
| ------ | ------ |
| Web 搜索 | LLM 可调用工具搜索网页，获取实时信息 |
| 结果精炼 | 默认返回摘要而非全文，控制 token 消耗 |
| 时效过滤 | 支持按时间范围过滤（一天内、一周内等） |
| 站点过滤 | 支持指定/屏蔽特定域名 |
| 多 Key 管理 | 多 API Key 轮询，额度耗尽自动切换 |
| 双版本 | Custom 版（默认）+ Global 版（国际内容） |

### 非核心需求（后续迭代）

| 需求 | 说明 |
| ------ | ------ |
| 图片搜索 | Custom 版支持 SearchType=image |
| 火山如意卡片 | 天气、股票等结构化卡片数据 |
| TUI 自定义渲染 | 搜索结果折叠展示、高亮标题 |
| 结果缓存 | 相同 query 短时间内返回缓存结果 |

---

## 3. API 能力梳理

### 3.1 Custom 版

- **URL**: `POST https://open.feedcoopapi.com/search_api/web_search`
- **认证**: `Authorization: Bearer <API_KEY>`
- **限流**: 5 QPS（账号维度）
- **免费额度**: 500 次/月（与 Global 共享）

**请求参数（web 搜索）**:

| 参数 | 类型 | 必填 | 说明 |
| ------ | ------ | ------ | ------ |
| Query | String | 是 | 搜索词，1-100 字符 |
| SearchType | String | 是 | 固定 `web` |
| Count | Number | 否 | 返回条数，默认 10，最大 50 |
| Filter.NeedContent | Boolean | 否 | 是否仅返回有正文的结果 |
| Filter.NeedUrl | Boolean | 否 | 是否仅返回有 URL 的结果 |
| Filter.Sites | String | 否 | 限定站点，`\|` 分隔，最多 20 个 |
| Filter.BlockHosts | String | 否 | 屏蔽站点，`\|` 分隔，最多 5 个 |
| Filter.AuthInfoLevel | Number | 否 | 0=不限制，1=仅非常权威 |
| TimeRange | String | 否 | OneDay/OneWeek/OneMonth/OneYear/YYYY-MM-DD..YYYY-MM-DD |
| QueryControl.QueryRewrite | Boolean | 否 | 是否开启 Query 改写 |
| ContentFormats | String | 否 | `text` 或 `markdown`，默认 text |
| Industry | String | 否 | finance/game/gov 行业搜索 |

**响应关键字段**:

| 字段 | 说明 | 长度 | LLM 适用性 |
| ------ | ------ | ------ | ----------- |
| Snippet | 简短片段 | ~200 字 | ⚠️ 太短，仅适合列表展示 |
| Summary | 相关摘要 | 500-1000 字 | ✅ **推荐 LLM 使用** |
| Content | 网页正文 | 可能上万字 | ⚠️ 过长，需截断 |
| RankScore | 相关性评分 0-1 | - | ✅ 帮助 LLM 判断质量 |
| AuthInfoDes | 权威度描述 | - | ✅ 辅助判断可信度 |
| PublishTime | 发布时间 | - | ✅ 时效性判断 |
| CardResults | 火山如意卡片 | 结构化 | 后续支持 |

### 3.2 Global 版

- **URL**: `POST https://open.feedcoopapi.com/search_api/global_search`
- **认证**: `Authorization: Bearer <API_KEY>`
- **限流**: 5 QPS（与 Custom 独立）

**请求参数**:

| 参数 | 类型 | 必填 | 说明 |
| ------ | ------ | ------ | ------ |
| Query | String | 是 | 搜索词，1-100 字符 |
| DocCount | Number | 否 | 返回条数，默认 10，最大 20 |
| MaxSnippetLength | Number | 否 | 单摘要最大 token，默认 500，最大 3000 |
| MaxImageCountPerDoc | Number | 否 | 单结果图片数，默认 3，最大 10 |

**响应关键字段**:

| 字段 | 说明 |
| ------ | ------ |
| Snippet[] | 摘要数组，Type=text/image |
| DocumentInfo | 正文统计、类型（webpage/pdf）、发布时间 |
| HostInfo | 站点名、Icon |

Global 版没有 Summary/Content 分层，只有 Snippet，通过 `MaxSnippetLength` 控制长度。

### 3.3 错误码

| 错误码 | 含义 | 策略（2026-07 实现） |
| -------- | ------ | --------------- |
| 10400 | 参数错误 | fatal（换 Key 没用） |
| 10402 | 非法搜索类型 | fatal |
| 10403 | 权限/未开通 | exhausted → 换 Key |
| 10406 | 免费额度用尽 | exhausted → 换 Key |
| 10408 | 功能不可用（Global） | fatal（账号级，换 Key 无意义） |
| 10409 | 套餐模式不支持 | exhausted → 换 Key |
| 10410 | 无可用套餐 | exhausted → 换 Key |
| 10412 | 套餐额度不足 | exhausted → 换 Key |
| 10500 | 内部错误（官方：可重试） | **retrySameKey**：同 Key 重试 1 次（200ms 退避），仍失败则换 Key |
| 10501 | 免费额度链路依赖失败（Global，官方：可重试） | **retrySameKey**（同上） |
| 700429 | QPS 限流 | rateLimited → 冷却后换 Key |
| 700901 | APIKey 无效 | exhausted → 换 Key |

> 网络连接类错误（fetch failed / ECONNRESET）换 Key 重试；**超时/用户取消不重试**（超时可能已在服务端计费）。

---

## 4. 工具设计

### 4.1 设计原则

基于 Anthropic 的工具设计指导和 pi 扩展规范：

1. **单一工具**：只注册一个 `web_search` 工具，通过参数控制行为，不拆成 `custom_search` / `global_search`
2. **参数精简**：只暴露 LLM 真正常用的参数，其余通过配置文件设定默认值
3. **描述驱动**：工具描述包含使用场景、示例、负面指引（何时不该用）
4. **`promptSnippet` + `promptGuidelines`**：利用 pi 的系统提示注入机制，让 LLM 主动发现和使用工具
5. **默认精炼**：默认返回 Summary 摘要而非全文，控制 token 消耗
6. **结构化输出**：返回格式化的文本，包含标题、URL、摘要、评分、来源
7. **流式反馈**：搜索过程中通过 `onUpdate` 给 LLM 和用户反馈进度
8. **可取消**：`execute` 的 `signal` 参数传入 `fetch`，用户按 Esc 可中止搜索

### 4.2 工具定义

使用 pi 的 `defineTool()` 在独立模块中定义工具（便于测试和复用），在 `index.ts` 中注册：

```typescript
// src/tool.ts
import { defineTool } from "@earendil-works/pi-coding-agent";

export const webSearchTool = defineTool({
  name: "web_search",
  label: "Web Search",
  // ...
});

// src/index.ts
import { webSearchTool } from "./tool.ts";
export default function (pi: ExtensionAPI) {
  pi.registerTool(webSearchTool);
}
```

**工具描述（给 LLM 看）**:

```typescript
{
  name: "web_search",
  label: "Web Search",

  // 工具描述：包含使用场景、负面指引、示例
  description: `Search the web for current information using Doubao Search API.

Use this tool when you need:
- Real-time information (news, prices, weather, latest releases)
- Information not available in the codebase or local files
- Fact-checking or verifying claims

Do NOT use this tool when:
- The information is in local files (use read/grep instead)
- You already have the answer in conversation context

Examples:
- "Python 3.13 release date"
- "latest React 19 documentation"
- "北京今日天气"

Results are returned as summaries by default. Use detail_level="full" only when you need complete article content.`,

  // promptSnippet: 在系统提示 "Available tools" 中显示的一行说明
  promptSnippet: "Search the web for real-time information via Doubao Search",

  // promptGuidelines: 在系统提示 "Guidelines" 中添加的指引
  // 注意：必须写明工具名，不能写 "Use this tool when..."
  promptGuidelines: [
    "Use web_search when you need current information not in local files or conversation context.",
    "Use web_search with time_range='OneWeek' for recent events or latest releases.",
  ],
}
```

### 4.3 参数设计

```typescript
parameters: Type.Object({
  query: Type.String({
    description: "Search query, 1-100 characters. Be specific and include relevant context."
  }),

  count: Type.Optional(Type.Number({
    description: "Number of results to return. Default 5, max 10. Fewer results = faster + less tokens."
  })),

  version: StringEnum(["custom", "global"] as const, {
    description: "custom: Chinese content, richer filters, faster. global: international content. Default: custom."
  }),

  detail_level: StringEnum(["brief", "summary", "full"] as const, {
    description: "brief: title+snippet(~200 chars). summary: title+summary(~500-1000 chars, default). full: title+summary+full content(truncated)."
  }),

  time_range: Type.Optional(Type.String({
    description: "Time filter. One of: OneDay, OneWeek, OneMonth, OneYear, or date range YYYY-MM-DD..YYYY-MM-DD. Custom version only."
  })),

  sites: Type.Optional(Type.String({
    description: "Restrict to specific domains, pipe-separated. Example: stackoverflow.com|github.com"
  })),

  block_hosts: Type.Optional(Type.String({
    description: "Exclude domains, pipe-separated. Example: pinterest.com|quora.com"
  })),
})
```

**参数设计决策**:

| 参数 | 为什么暴露 | 为什么不给默认值在 code 里 |
| ------ | ----------- | ------------------------- |
| query | 必须的 | - |
| count | LLM 应根据任务复杂度决定要几条 | 给了默认值 5 |
| version | LLM 可根据 query 语言判断用哪个版本 | 给了默认值 custom |
| detail_level | 关键的 token 控制手段，LLM 应主动选择 | 给了默认值 summary |
| time_range | "最新"类 query 非常常见，LLM 应主动用 | 无默认值（不限制） |
| sites | 类似 Claude Code 的 allowed_domains | 无默认值 |
| block_hosts | 类似 Claude Code 的 blocked_domains | 无默认值 |

**不暴露给 LLM 的参数**（通过配置文件设定）:

| 参数 | 原因 |
| ------ | ------ |
| ContentFormats | 固定 markdown（比 text 更适合 LLM），无需 LLM 决策 |
| Filter.AuthInfoLevel | 专业参数，用户在配置文件里设全局默认 |
| Filter.NeedContent / NeedUrl | 固定合理默认值 |
| Industry | 小众场景，配置文件设定 |
| QueryControl.QueryRewrite | 固定 false（减少耗时），用户配置文件可改 |
| MaxSnippetLength (Global) | 固定 1000（配置可调，上限 3000），无需 LLM 决策 |
| MaxImageCountPerDoc (Global) | **LLM 自主决策**——工具参数 `include_images`（默认 false）映射（2026-07 已实现） |

### 4.4 返回格式

返回纯文本格式（非 JSON），因为 pi 工具返回的是 text content，且格式化文本比 JSON 更省 token、更易于 LLM 自然阅读。

**detail_level = summary（默认）时**:

```text
搜索完成，返回 5 条结果（豆包搜索 Custom 版）
查询: Python 3.13 release date

[1] Python 3.13.0 发布 - Python.org
    🔗 https://docs.python.org/3.13/whatsnew/3.13.html
    📅 2024-10-07 | 站点: python.org | 权威度: 非常权威 | 相关度: 0.95
    📝 Python 3.13 于 2024 年 10 月 7 日发布。主要新特性包括：
    交互式解释器现在基于 PyPy 的 pyrepl，支持多行编辑和历史回溯。
    实验性的自由线程模式（PEP 703）和 JIT 编译器（PEP 744）...
    （摘要 832 字）

[2] What's New In Python 3.13 - Real Python
    🔗 https://realpython.com/python313-new-features/
    📅 2024-10-08 | 站点: realpython.com | 权威度: 正常权威 | 相关度: 0.89
    📝 Python 3.13 带来了多项改进，包括新的 REPL、改进的错误消息...
    （摘要 654 字）

[3] ...
```

**detail_level = brief 时**:

```text
搜索完成，返回 5 条结果（豆包搜索 Custom 版）
查询: Python 3.13 release date

[1] Python 3.13.0 发布 - Python.org
    https://docs.python.org/3.13/whatsnew/3.13.html | 2024-10-07 | 相关度: 0.95
    Python 3.13 于 2024 年 10 月 7 日发布。主要新特性包括...

[2] What's New In Python 3.13 - Real Python
    https://realpython.com/python313-new-features/ | 2024-10-08 | 相关度: 0.89
    Python 3.13 带来了多项改进...
```

**detail_level = full 时**:

每条结果在 summary 基础上增加 Content 全文（截断到 5000 字），并标注：

```text
[1] Python 3.13.0 发布 - Python.org
    🔗 https://docs.python.org/3.13/whatsnew/3.13.html
    📅 2024-10-07 | 站点: python.org | 权威度: 非常权威 | 相关度: 0.95
    📝 摘要: Python 3.13 于 2024 年 10 月 7 日发布...
    📄 正文（截断至 5000 字）:
    Python 3.13 于 2024 年 10 月 7 日发布。本文档介绍了 3.13 中的
    所有新特性。主要变化包括：新的交互式解释器...
```

### 4.5 截断策略

**三层截断**:

1. **单条结果截断**:
   - brief: Snippet 截断到 200 字
   - summary: Summary 截断到 1000 字
   - full: Content 截断到 5000 字，Summary 完整保留

2. **总条数截断**: 默认 5 条，最大 10 条

3. **总输出截断**: 使用 `truncateHead`，50KB / 2000 行（pi 默认限制）

截断时在末尾添加提示:

```text
⚠️ 部分结果已截断。共找到 20 条结果，返回了 5 条。完整结果可通过调整 count 参数获取。
```

**Token 估算**（summary 级别，5 条结果）:

| 项目 | 估算 |
| ------ | ------ |
| 每条结果元数据 | ~50 字 |
| 每条 Summary | 500-1000 字 |
| 5 条总计 | ~5500 字 ≈ 1400 tokens |
| 在 2000 tokens 目标内 | ✅ |

### 4.6 Global 版的适配

Global 版没有 Summary/Content 分层，只有 Snippet。适配逻辑:

| detail_level | Global 版行为 |
| ------------- | -------------- |
| brief | 取 Snippet text，截断到 200 字 |
| summary | 取 Snippet text，截断到 1000 字（通过 MaxSnippetLength=1000 请求） |
| full | 同 summary（Global 版无正文全文） |

Global 版不支持的参数: `time_range`、`sites`、`block_hosts`。当 version=global 时这些参数被忽略，并在输出中提示。

### 4.7 pi 工具执行模式

#### 流式进度反馈 (`onUpdate`)

搜索请求可能耗时 1-2 秒，在 `execute` 中通过 `onUpdate` 给 LLM 和用户实时反馈：

```typescript
async execute(toolCallId, params, signal, onUpdate, ctx) {
  // 1. 通知开始搜索
  onUpdate?.({
    content: [{ type: "text", text: `正在搜索: ${params.query}...` }],
  });

  // 2. 执行搜索（传入 signal 支持取消）
  const results = await client.search(params, config, signal);

  // 3. 通知正在格式化
  onUpdate?.({
    content: [{ type: "text", text: `找到 ${results.totalCount} 条结果，正在格式化...` }],
  });

  // 4. 格式化并返回
  const text = formatter.format(results, params);
  return { content: [{ type: "text", text }], details: { ... } };
}
```

#### 取消支持 (`signal`)

`execute` 的 `signal` 参数是 `AbortSignal`，传入 `fetch` 后用户按 Esc 可中止请求：

```typescript
// client.ts
async function doRequest(body, version, apiKey, signal?: AbortSignal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
    signal,  // 关键：传入 AbortSignal
  });
  // ...
}
```

#### 自定义 TUI 渲染 (`renderCall` + `renderResult`)

利用 pi 的自定义渲染机制，让搜索结果在 TUI 中更直观：

```typescript
import { Text } from "@earendil-works/pi-tui";

// 渲染工具调用行（搜索进行中显示）
renderCall(args, theme, _context) {
  let text = theme.fg("toolTitle", theme.bold("web_search "));
  text += theme.fg("accent", `"${args.query}"`);
  if (args.version === "global") {
    text += theme.fg("dim", " (global)");
  }
  if (args.time_range) {
    text += theme.fg("muted", ` ${args.time_range}`);
  }
  if (args.sites) {
    text += theme.fg("dim", ` @${args.sites}`);
  }
  return new Text(text, 0, 0);
},

// 渲染工具结果行（搜索完成后显示）
renderResult(result, { expanded, isPartial }, theme, _context) {
  const details = result.details as WebSearchDetails;

  // 搜索中
  if (isPartial) {
    return new Text(theme.fg("warning", "搜索中..."), 0, 0);
  }

  // 搜索失败
  if (!details || details.returnedCount === 0) {
    return new Text(theme.fg("dim", "无结果"), 0, 0);
  }

  // 折叠视图：紧凑显示
  let text = theme.fg("success", `✓ ${details.returnedCount} 条结果`);
  text += theme.fg("dim", ` (${details.version}版, ${details.timeCostMs}ms)`);
  if (details.truncated) {
    text += theme.fg("warning", " (已截断)");
  }

  // 展开视图：显示前几条结果的标题
  if (expanded) {
    const preview = details.results.slice(0, 5);
    for (const r of preview) {
      text += `\n  ${theme.fg("accent", r.title)}`;
      text += ` ${theme.fg("dim", r.url)}`;
    }
    if (details.results.length > 5) {
      text += `\n  ${theme.fg("muted", `... 还有 ${details.results.length - 5} 条`)}`;
    }
  }

  return new Text(text, 0, 0);
}
```

渲染效果：

- **折叠时**：`✓ 5 条结果 (custom版, 372ms)`
- **展开时**：显示前 5 条结果的标题和 URL
- **搜索中**：显示 `搜索中...`
- **无结果**：显示 `无结果`

#### 模式感知

搜索工具本身在所有模式（tui/rpc/json/print）都可用，但 `/doubao-keys` 命令需要守卫：

```typescript
pi.registerCommand("doubao-keys", {
  description: "Show API key pool status",
  handler: async (_args, ctx) => {
    if (!ctx.hasUI) return;  // print/json 模式跳过
    ctx.ui.notify(pool?.getStatusText() || "No pool", "info");
  },
});
```

### 4.8 API 差异处理：适配器模式

Global 和 Custom 版的 API 差异很大（参数名、响应结构、能力范围都不同）。采用适配器模式隔离差异，参考 Claude Code 的 WebSearchTool 多后端设计。

**核心思路**：定义统一内部模型，每个版本实现自己的适配器。formatter 和 client 完全版本无关。

```text
LLM 参数
  │
  ▼
UnifiedSearchRequest (统一请求模型)
  │
  ├── version=custom ──> CustomAdapter.buildRequest() ──> Custom API 请求体
  └── version=global ──> GlobalAdapter.buildRequest() ──> Global API 请求体
                                                    │
                                          client.ts (HTTP + KeyPool，版本无关)
                                                    │
                                          原始 API 响应
                                                    │
  ├── version=custom ──> CustomAdapter.parseResponse() ──┐
  └── version=global ──> GlobalAdapter.parseResponse() ──┤
                                                          ▼
                                          UnifiedSearchResult (统一结果模型)
                                                    │
                                          formatter.ts (版本无关)
```

#### 统一请求模型

```typescript
interface UnifiedSearchRequest {
  query: string;
  count: number;
  detailLevel: "brief" | "summary" | "full";
  timeRange?: string;       // Custom only
  sites?: string;           // Custom only
  blockHosts?: string;      // Custom only
  contentFormat: "text" | "markdown";  // Custom only
  includeImages?: boolean;  // Global only (映射为 MaxImageCountPerDoc)
}
```

#### 统一结果模型

```typescript
interface UnifiedSearchResult {
  totalCount: number;
  results: UnifiedSearchItem[];
  timeCostMs?: number;
  logId?: string;
  version: "custom" | "global";
  unsupportedParams?: string[];  // 被忽略的参数（如 Global 忽略 time_range）
}

interface UnifiedSearchItem {
  title: string;
  url: string;
  snippet: string;       // 短摘要（Custom.Snippet / Global.Snippet text）
  summary?: string;      // 长摘要（Custom.Summary / Global: 拼接 Snippet texts）
  content?: string;      // 正文（Custom.Content / Global: 无）
  publishTime?: string;
  siteName?: string;     // Custom.SiteName / Global.HostInfo.Hostname
  rankScore?: number;    // Custom only
  authInfoDes?: string;  // Custom only
  authInfoLevel?: number;// Custom only
  filetype?: string;     // Global only
}
```

#### 适配器接口

```typescript
interface SearchAdapter {
  readonly version: "custom" | "global";
  readonly apiUrl: string;
  buildRequest(req: UnifiedSearchRequest, config: DoubaoSearchConfig): Record<string, unknown>;
  parseResponse(raw: unknown): UnifiedSearchResult;
}
```

#### 关键设计决策

1. **formatter.ts 完全版本无关**：只消费 `UnifiedSearchResult`。detail_level 字段选择统一化：
   - `brief` → 用 `snippet`
   - `summary` → 用 `summary`（Custom 有独立 Summary；Global 是拼接的 Snippet texts）
   - `full` → 用 `content`（Custom 有；Global 回退到 `summary`）

2. **不支持的参数静默忽略 + 输出提示**：Global 忽略 `time_range`/`sites`/`block_hosts` 时，在返回结果末尾加提示：

   ```text
   ⚠️ 以下参数在 Global 版中不支持，已被忽略: time_range, sites
   ```

3. **client.ts 版本无关**：只负责发 HTTP 请求 + KeyPool failover。URL 和请求体由适配器提供。

4. **Global 版的 Snippet 数组处理**：Global 的 Snippet 是 `{Type, Text/Image}` 数组，混合 text 和 image。适配器将其拼接为纯文本：

   ```typescript
   const textSnippets = (d.Snippet ?? [])
     .filter(s => s.Type === "text")
     .map(s => s.Text)
     .join("\n");
   ```

---

## 5. 多 API Key 管理

### 5.1 配置方式

豆包搜索的 API Key 分为两种计费类型：

- **按量后付费**（postpaid）：按实际调用量计费，Global 和 Custom 版都支持
- **订阅套餐**（subscription）：预付费套餐，仅 Custom 版支持（Global 版不支持订阅套餐调用）

两种 Key 共用一个 KeyPool，但需要标记类型，以便：

1. Global 版只使用 postpaid Key（subscription Key 调 Global 会报 10409）
2. Custom 版优先使用 subscription Key（消耗预付费额度），耗尽后回退到 postpaid

```bash
# 不区分类型（全部视为 postpaid）
DOUBAO_SEARCH_API_KEYS=key1,key2,key3

# 单 Key（向后兼容）
DOUBAO_SEARCH_API_KEY=key1

# 区分计费类型（用前缀标记）
DOUBAO_SEARCH_API_KEYS=postpaid:key1,postpaid:key2,subscription:key3
```

也可在配置文件中指定：

```json
{
  "postpaidKeys": ["key1", "key2"],
  "subscriptionKeys": ["key3"]
}
```

**加载逻辑**：

- 配置文件的 `postpaidKeys` / `subscriptionKeys` 优先于环境变量
- 环境变量中无前缀的 Key 默认视为 postpaid
- 合并为统一的 `KeyState[]`，每个 Key 带有 `billingType` 字段

### 5.2 KeyPool 设计

```typescript
type KeyStatus = "active" | "rate_limited" | "exhausted";
type BillingType = "postpaid" | "subscription";

interface KeyState {
  key: string;
  label: string;           // key1, key2...（日志/状态展示用）
  billingType: BillingType; // 计费类型
  status: KeyStatus;
  rateLimitedUntil?: number;  // 时间戳，到期自动恢复
  lastError?: string;
  useCount: number;
}
```

**选取策略**：

`acquire(version)` 按版本和计费类型筛选可用 Key：

| version | 优先级 1 | 优先级 2 |
| ------- | -------- | -------- |
| custom | subscription Key（消耗预付费额度） | postpaid Key |
| global | postpaid Key | ❌（subscription Key 不支持 Global） |

每个优先级内 Round-robin 轮询，跳过非 active 状态的 Key。

**状态流转**:

```text
active ──(700429 限流)──> rate_limited ──(冷却 60s 后)──> active
active ──(10406/10412 额度耗尽)──> exhausted（本 session 永久不可用）
active ──(700901 Key 无效)──> exhausted
active ──(10403 权限错误)──> exhausted
active ──(10409 套餐模式不支持)──> exhausted（仅 subscription Key 调 Global 时触发）
```

**生命周期**：KeyPool 是运行时状态，不需要持久化到 session 历史。在 `session_start` 事件中初始化即可，fork/branch 时不需要重建（因为 key 耗尽是运行时状态，不是会话历史的一部分）。

### 5.3 Failover 调用流程

```text
acquire(version)
  │
  ├─ 有可用 Key ──> 发起请求
  │   ├─ 成功 ──> 返回结果
  │   ├─ 700429 ──> markRateLimited(key, 60s) ──> 回到 acquire（换下一个 Key）
  │   ├─ 10406/10412 ──> markExhausted(key) ──> 回到 acquire（换下一个 Key）
  │   ├─ 10409 ──> markExhausted(key) ──> 回到 acquire（subscription Key 不支持此版本）
  │   ├─ 10500/10501 ──> 同 Key 重试 1 次（200ms 退避）──> 仍失败则换下一个 Key
  │   ├─ 连接类网络错误 ──> 换下一个 Key 重试
  │   ├─ 10400/10402 ──> throw（参数错误，换 Key 没用）
  │   └─ 超时/用户取消 ──> throw（不重试，超时可能已计费）
  └─ 无可用 Key ──> throw("所有 API Key 均不可用")
```

> 注意：`acquire(version)` 会自动跳过不适用的 Key 类型。例如 `acquire("global")` 不会返回 subscription Key，因此正常流程中不会触发 10409。10409 的防护是兜底机制。

最多尝试 `pool.size` 次（每个 Key 各一次），每个 Key 至多同 Key 重试 1 次，避免无限重试。

### 5.4 状态查看命令

注册 `/doubao-keys` 命令，展示各 Key 状态:

```text
[1] key1 (a3f...8b2)  postpaid     active         使用 23 次
[2] key2 (7c1...9d4)  postpaid     rate_limited   冷却中（剩余 42s）  使用 15 次
[3] key3 (e2b...5f8)  subscription exhausted     套餐额度用尽        使用 500 次
```

---

## 6. 错误处理

### 6.1 错误信息设计

遵循 "错误必须可操作" 原则，包含：出了什么问题 + 如何修复。

| 场景 | 错误信息 |
| ------ | --------- |
| 未配置 API Key | `未配置豆包搜索 API Key。请设置环境变量 DOUBAO_SEARCH_API_KEYS 或 DOUBAO_SEARCH_API_KEY。` |
| 所有 Key 不可用 | `所有 API Key 均不可用。Key 状态: key1=额度耗尽, key2=限流中(剩余42s)。请等待冷却或补充新 Key。` |
| 参数错误 (10400) | `搜索参数错误: query is empty。请检查 query 是否为空且在 1-100 字符内。` |
| QPS 限流 (700429) | 自动切换到下一个 Key 重试。如果所有 Key 都限流: `请求频率超限。默认 5 QPS，请降低调用频率。` |
| 套餐不支持 (10409) | `该 Key 为订阅套餐类型，不支持 Global 版搜索。请使用 postpaid Key 或切换到 Custom 版。` |
| 网络超时 | `搜索请求超时。可尝试减少 count 或使用更简短的 query 重试。` |
| 无结果 | `搜索完成但未找到结果。尝试调整 query 关键词或放宽 time_range/sites 过滤。` |

### 6.2 错误抛出方式

按 pi 扩展规范，错误通过 `throw new Error()` 抛出（不是返回值），pi 会自动标记 `isError: true` 并报告给 LLM。

---

## 7. 配置管理

### 7.1 环境变量

| 变量 | 说明 | 必填 |
| ---- | ---- | ---- |
| `DOUBAO_SEARCH_API_KEYS` | 多 API Key，逗号分隔 | 二选一 |
| `DOUBAO_SEARCH_API_KEY` | 单 API Key | 二选一 |

### 7.2 配置文件

遵循 pi 扩展的配置加载标准模式（参考 `preset.ts`、`sandbox/index.ts`）：

- 全局配置：`~/.pi/agent/doubao-search.json`（通过 `getAgentDir()` 获取）
- 项目配置：`.pi/doubao-search.json`（通过 `CONFIG_DIR_NAME` 获取）
- 项目配置覆盖全局配置

```typescript
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function loadConfig(cwd: string): DoubaoSearchConfig {
  const globalPath = join(getAgentDir(), "doubao-search.json");
  const projectPath = join(cwd, CONFIG_DIR_NAME, "doubao-search.json");

  let globalConfig: Partial<DoubaoSearchConfig> = {};
  let projectConfig: Partial<DoubaoSearchConfig> = {};

  if (existsSync(globalPath)) {
    try {
      globalConfig = JSON.parse(readFileSync(globalPath, "utf-8"));
    } catch (e) {
      console.error(`Failed to load ${globalPath}: ${e}`);
    }
  }
  if (existsSync(projectPath)) {
    try {
      projectConfig = JSON.parse(readFileSync(projectPath, "utf-8"));
    } catch (e) {
      console.error(`Failed to load ${projectPath}: ${e}`);
    }
  }

  // 项目配置覆盖全局配置
  return { ...DEFAULT_CONFIG, ...globalConfig, ...projectConfig };
}
```

配置文件内容：

```json
{
  "defaultVersion": "custom",
  "defaultCount": 5,
  "defaultDetailLevel": "summary",
  "contentFormat": "markdown",
  "queryRewrite": false,
  "authInfoLevel": 0,
  "industry": null,
  "maxSnippetLength": 1000,
  "requestTimeoutMs": 10000,
  "rateLimitCooldownMs": 60000
}
```

加载优先级：项目配置 > 全局配置 > 默认值。环境变量单独处理 Key。

### 7.3 生命周期与初始化

遵循 pi 扩展生命周期规范：不在工厂函数中启动后台资源。在 `session_start` 事件中完成初始化：

```typescript
export default function (pi: ExtensionAPI) {
  let pool: KeyPool | null = null;
  let config: DoubaoSearchConfig = DEFAULT_CONFIG;

  pi.on("session_start", async (_event, ctx) => {
    // 1. 加载配置
    config = loadConfig(ctx.cwd);

    // 2. 从环境变量加载 Key
    const keys = loadKeysFromEnv();

    // 3. 初始化 KeyPool
    pool = new KeyPool(keys);

    // 4. 启动检查
    if (keys.length === 0 && ctx.hasUI) {
      ctx.ui.notify(
        "未配置豆包搜索 API Key。请设置环境变量 DOUBAO_SEARCH_API_KEYS 或 DOUBAO_SEARCH_API_KEY。",
        "warning"
      );
    }
  });
}
```

> **注意**：不要在工厂函数（`export default function(pi)`）中初始化 KeyPool 或读取配置。工厂函数可能在未启动 session 的场景下被调用。延迟到 `session_start` 确保此时有有效的 `ctx`。

---

## 8. 工程结构

```text
pi-byted-web-search/
├── docs/                              # 已有 API 文档
│   ├── 豆包搜索产品简介.md
│   ├── 豆包搜索 Custom版.md
│   ├── 豆包搜索 Global版.md
│   ├── 豆包搜索 Custom版 - 火山如意数据结构.md
│   └── design.md                      # 本设计文档
├── src/
│   ├── index.ts                       # 扩展入口：注册工具/命令，生命周期管理
│   ├── tool.ts                        # web_search 工具定义（defineTool）
│   ├── types.ts                       # 类型定义（请求/响应/配置）
│   ├── config.ts                      # 配置加载（环境变量 + 配置文件）
│   ├── key-pool.ts                    # 多 API Key 状态管理与轮询
│   ├── client.ts                      # HTTP 请求封装 + failover 重试（版本无关）
│   ├── custom-adapter.ts               # Custom 版适配器（buildRequest + parseResponse）
│   ├── global-adapter.ts               # Global 版适配器（buildRequest + parseResponse）
│   ├── formatter.ts                   # 搜索结果 → LLM 文本格式化 + 截断
│   └── renderer.ts                    # TUI 自定义渲染（renderCall/renderResult）
├── package.json
└── README.md
```

### 模块职责

| 模块 | 职责 | 依赖 |
| ------ | ------ | ------ |
| index.ts | 扩展入口，注册工具和命令，生命周期管理（session_start 初始化） | config, client, tool, formatter |
| tool.ts | `defineTool()` 定义 web_search 工具（参数、描述、promptSnippet、renderCall/renderResult） | types, client, formatter, renderer |
| config.ts | 加载环境变量和配置文件（getAgentDir + CONFIG_DIR_NAME），合并默认值 | types |
| key-pool.ts | Key 状态管理，轮询获取，标记限流/耗尽 | types |
| client.ts | 发起 HTTP 请求（传入 signal），处理响应和错误码，failover 重试（版本无关） | key-pool, types |
| custom-adapter.ts | Custom 版适配器：buildRequest + parseResponse | types |
| global-adapter.ts | Global 版适配器：buildRequest + parseResponse | types |
| formatter.ts | 统一格式化结果为 LLM 文本，截断处理（truncateHead） | types |
| types.ts | 所有 TypeScript 类型定义 | - |
| renderer.ts | renderCall/renderResult 渲染函数 | pi-tui, types |

### package.json

```json
{
  "name": "pi-byted-web-search",
  "version": "0.1.0",
  "type": "module",
  "pi": {
    "extensions": ["./src/index.ts"]
  },
  "dependencies": {},
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "@earendil-works/pi-ai": "*",
    "typebox": "*"
  }
}
```

无外部 npm 依赖，HTTP 请求使用 Node.js 内置 `fetch`。

---

## 9. 数据流

```text
LLM 调用 web_search 工具
        │
        ▼
  tool.ts (工具 execute)
        │
        ├── onUpdate({ text: "正在搜索..." })  // 流式进度反馈
        │
        ├── 读取 config（版本、格式、截断等默认值）
        │
        ├── 构造请求参数
        │   ├── version=custom → custom-adapter.ts → buildRequest()
        │   └── version=global → global-adapter.ts → buildRequest()
        │
        ├── client.ts → searchWithKeyPool(signal)  // 传入 signal 支持取消
        │   ├── key-pool.ts → acquire() 取 Key
        │   ├── fetch(API_URL, { headers, body, signal })  // signal 传入 fetch
        │   ├── 解析响应 + 错误码处理
        │   └── 失败 → failover 下一个 Key
        │
        ├── 响应解析
        │   ├── version=custom → custom-adapter.ts → parseResponse()
        │   └── version=global → global-adapter.ts → parseResponse()
        │
        ├── formatter.ts → formatResults()
        │   ├── 按 detail_level 选择字段
        │   ├── 截断（单条 + 总输出，truncateHead）
        │   └── 格式化为文本
        │
        ├── onUpdate({ text: `找到 N 条结果` })  // 格式化进度
        │
        └── 返回 { content: [{ type: "text", text }], details: {...} }
             // details 供 renderResult 使用
```

### details 结构（用于 renderResult 渲染）

```typescript
interface WebSearchDetails {
  query: string;
  version: "custom" | "global";
  totalCount: number;          // API 返回的总结果数
  returnedCount: number;       // 实际返回的条数
  detailLevel: "brief" | "summary" | "full";
  truncated: boolean;          // 是否发生了截断
  timeCostMs: number;          // 搜索耗时
  keyUsed: string;             // 使用的 Key label（如 "key1"）
  results: SearchResult[];     // 结构化结果（供渲染用）
}
```

---

## 10. 后续迭代方向

### 10.1 图片搜索（优先级: 中）

Custom 版支持 `SearchType=image`。可以:

- 作为 `web_search` 工具的一个 `search_type` 参数
- 或单独注册 `image_search` 工具

倾向于后者，因为图片搜索的使用场景和返回结构与网页搜索差异较大。

### 10.2 火山如意卡片（优先级: 低）

天气、股票、汇率等结构化卡片。需要:

- 按卡片类型实现解析器
- 格式化为 LLM 易读的文本
- 可能需要自定义 TUI 渲染

50KB 的数据结构文档，建议按需逐个支持，优先支持天气和股票。

### 10.3 TUI 自定义渲染增强（优先级: 低）

基础 `renderCall`/`renderResult` 已在 4.7 节设计。后续增强：

- 标题高亮、URL 可点击
- 相关度评分可视化
- 站点 icon 展示
- 结果列表交互式浏览（自定义 `ctx.ui.custom()` 组件）

### 10.4 结果缓存（优先级: 低）

相同 query + 参数的组合，在短时间内（如 5 分钟）返回缓存结果，避免重复消耗 API 额度。

### 10.5 Search -> Fetch 两步模式（优先级: 中）

参考业界最佳实践，拆分为:

1. `web_search` - 搜索，返回标题/URL/摘要
2. `fetch_url` - 获取指定 URL 的完整内容

这能让 LLM 先快速浏览搜索结果，再选择性地获取全文，进一步优化 token 效率。但豆包搜索 API 本身已提供 Content 字段，不一定需要额外 fetch。

---

## 11. 开放问题（已决策）

| 问题 | 决策 |
| ------ | ------ |
| Custom 版默认 ContentFormats | **markdown**（结构更清晰，需验证实际返回效果） |
| Global 版 MaxImageCountPerDoc | **已实现（2026-07）**——工具参数 `include_images`（默认 false），Global 版映射为 MaxImageCountPerDoc |
| 是否需要 search_type=image | **LLM 自主决策**——后续迭代中添加 `image_search` 独立工具（Custom 版 SearchType=image），LLM 可根据需求选择 |
| 配置文件格式 | **JSON**（pi 生态统一） |
| 是否支持 Custom/Global 各自独立的 Key 池 | **不支持**--两个版本共用 KeyPool，但 Key 需区分计费类型（postpaid / subscription），Global 版只用 postpaid Key |
| count 默认值 | **默认 5**，LLM 可通过 count 参数自行调整（最大 10） |
