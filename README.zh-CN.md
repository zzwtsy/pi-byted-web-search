# pi-byted-web-search

**中文** | [English](./README.md)

一个 [pi coding agent](https://github.com/earendil-works/pi-mono) 扩展，基于[豆包搜索 API](https://www.volcengine.com/docs/87772)（火山引擎）提供联网搜索能力。

> API 参考快照（Custom/Global 版）存放在 [`docs/api/`](docs/api/)，为官方文档的抓取副本、可能滞后——请以[火山引擎在线文档](https://www.volcengine.com/docs/87772)为准。

## 功能

- **Web 搜索工具** - 注册 `doubao_web_search` 工具，LLM 可自主调用
- **双版本支持** — Custom 版（国内内容、过滤丰富）+ Global 版（国际内容）
- **多 API Key** — 轮询 Key 池，限流/额度耗尽时自动故障转移
- **计费类型感知** — 区分按量后付费 / 订阅套餐 Key；Global 版仅使用后付费 Key
- **Token 高效** — 三级详情（`brief` / `summary` / `full`），`truncateHead` 截断
- **可取消** — `AbortSignal` 传入 `fetch`，按 Esc 中止请求
- **自定义 TUI 渲染** — 折叠紧凑视图，可展开预览结果

## 安装

### 从 npm 安装（推荐）

```bash
pi install npm:pi-byted-web-search
```

### 从 GitHub 安装

```bash
pi install git:github.com/zzwtsy/pi-byted-web-search
```

### 临时试用（不写入配置）

```bash
pi -e git:github.com/zzwtsy/pi-byted-web-search
```

### 源码安装（开发模式）

```bash
git clone https://github.com/zzwtsy/pi-byted-web-search.git
cd pi-byted-web-search
pi install .
```

## 配置

### API Key（必填）

```bash
# 多 Key（逗号分隔，推荐）
export DOUBAO_SEARCH_API_KEYS=key1,key2,key3

# 单 Key
export DOUBAO_SEARCH_API_KEY=key1
```

可用前缀标记计费类型：

```bash
export DOUBAO_SEARCH_API_KEYS=postpaid:key1,subscription:key2
```

无前缀的 Key 默认为 `postpaid`（按量后付费）。

从[火山引擎控制台](https://console.volcengine.com/search-infinity/api-key)获取 API Key。

### 配置文件（可选）

全局：`~/.pi/agent/doubao-search.json`
项目：`.pi/doubao-search.json`（覆盖全局）

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
  "rateLimitCooldownMs": 60000,
  "cacheTtlMs": 300000,
  "postpaidKeys": ["key1"],
  "subscriptionKeys": ["key2"]
}
```

> **优先级**：环境变量 > 项目配置文件 > 全局配置文件 > 默认值。环境变量中的 API Key 优先于配置文件。

## 使用

配置完成后，LLM 需要实时信息时会自动调用 `doubao_web_search`：

```text
> Python 3.13 有什么新特性？

[LLM 调用 doubao_web_search，query="Python 3.13 release date"]

✓ 5 results (custom, 372ms)
```

### 工具参数

| 参数 | 类型 | 默认值 | 说明 |
| ------ | ------ | -------- | ------ |
| `query` | string | — | 搜索词，1-100 字符 |
| `count` | integer | 5 | 返回条数（1-10） |
| `version` | `"custom"` \| `"global"` | `custom` | API 版本 |
| `detail_level` | `"brief"` \| `"summary"` \| `"full"` | `summary` | 结果详情级别 |
| `time_range` | string | — | `OneDay` / `OneWeek` / `OneMonth` / `OneYear` / `YYYY-MM-DD..YYYY-MM-DD`（仅 Custom） |
| `sites` | string | — | 限定站点，管道符分隔（仅 Custom） |
| `block_hosts` | string | — | 屏蔽站点，管道符分隔（仅 Custom） |
| `include_images` | boolean | `false` | 每条结果附带最多 3 张图片摘要（仅 Global） |

### 命令

- `/doubao-keys` — 打开 API Key 池状态交互面板（↑/↓ 选择，Esc 关闭，实时刷新）

## 错误处理与重试

- 限流（`700429`）与额度耗尽（`10406`/`10412` 等）自动切换到下一个 API Key
- 内部错误（`10500`/`10501`，火山引擎文档标注可重试）同 Key 重试 1 次（指数退避 + 抖动）后换 Key
- 连接类网络错误换 Key 重试；**超时不重试**（请求可能已在服务端计费）
- 参数错误（`10400` 等）直接失败并返回 API 错误消息
- 所有 Key 不可用时返回带各 Key 状态的错误（Key 在状态输出中已脱敏）
- 用户取消（Esc）返回友好提示而非错误

## 缓存

搜索结果在内存中缓存，TTL 可配置（`cacheTtlMs`，默认 5 分钟）。相同参数的重复搜索直接返回缓存结果，不消耗 API 额度。设 `cacheTtlMs` 为 `0` 可禁用缓存。

## API 版本对比

| | Custom 版 | Global 版 |
| --- | -------- | -------- |
| 适用场景 | 国内内容、过滤丰富 | 国际内容 |
| 最大返回 | 50 条 | 20 条 |
| 时间/站点过滤 | 支持 | 不支持 |
| 内容字段 | Snippet / Summary / Content | 仅 Snippet |
| 计费模式 | 按量后付费 + 订阅套餐 | 仅按量后付费 |
| 平均时延 | ~700ms | ~1053ms |

## License

MIT
