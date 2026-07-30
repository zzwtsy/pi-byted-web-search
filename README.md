# pi-byted-web-search

[中文](./README.zh-CN.md) | **English**

A [pi coding agent](https://github.com/earendil-works/pi-mono) extension that provides web search capabilities via the [Doubao Search API](https://www.volcengine.com/docs/87772) (Volcano Engine).

## Features

- **Web Search Tool** - Registers a `doubao_web_search` tool the LLM can call autonomously
- **Dual API Versions** — Custom version (Chinese content, richer filters) and Global version (international content)
- **Multi API Key** — Round-robin key pool with automatic failover on rate limits and quota exhaustion
- **Billing Type Aware** — Distinguishes postpaid vs subscription keys; Global version only uses postpaid keys
- **Token Efficient** — Three detail levels (`brief` / `summary` / `full`), output truncation with `truncateHead`
- **Cancellation** — Passes `AbortSignal` to `fetch`; pressing Esc cancels in-flight requests
- **Custom TUI Rendering** — Compact collapsed view, expandable result preview

## Installation

### From source (development)

```bash
git clone <repo-url>
cd pi-byted-web-search

# Link to pi extensions directory
ln -sf "$(pwd)/src/index.ts" ~/.pi/agent/extensions/pi-byted-web-search.ts
```

Or load temporarily:

```bash
pi -e ./src/index.ts
```

### As a pi package

```bash
pi install ./path/to/pi-byted-web-search
```

## Configuration

### API Keys (required)

```bash
# Multiple keys (comma-separated, recommended)
export DOUBAO_SEARCH_API_KEYS=key1,key2,key3

# Single key
export DOUBAO_SEARCH_API_KEY=key1
```

Keys can be tagged with billing type using a prefix:

```bash
export DOUBAO_SEARCH_API_KEYS=postpaid:key1,subscription:key2
```

Untagged keys default to `postpaid`.

Get your API keys from the [Volcano Engine console](https://console.volcengine.com/search-infinity/api-key).

### Config File (optional)

Global: `~/.pi/agent/doubao-search.json`
Project: `.pi/doubao-search.json` (overrides global)

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
  "postpaidKeys": ["key1"],
  "subscriptionKeys": ["key2"]
}
```

## Usage

Once configured, the LLM can call `doubao_web_search` automatically when it needs real-time information:

```text
> What's new in Python 3.13?

[LLM calls doubao_web_search with query="Python 3.13 release date"]

✓ 5 results (custom, 372ms)
```

### Tool Parameters

| Parameter | Type | Default | Description |
| ----------- | ------ | --------- | ------------- |
| `query` | string | — | Search query, 1-100 chars |
| `count` | number | 5 | Number of results (max 10) |
| `version` | `"custom"` \| `"global"` | `custom` | API version |
| `detail_level` | `"brief"` \| `"summary"` \| `"full"` | `summary` | Result detail level |
| `time_range` | string | — | `OneDay` / `OneWeek` / `OneMonth` / `OneYear` / `YYYY-MM-DD..YYYY-MM-DD` (Custom only) |
| `sites` | string | — | Restrict to domains, pipe-separated (Custom only) |
| `block_hosts` | string | — | Exclude domains, pipe-separated (Custom only) |

### Commands

- `/doubao-keys` — Show API key pool status

## API Version Comparison

| | Custom | Global |
| --- | -------- | -------- |
| Best for | Chinese content, richer filters | International content |
| Max results | 50 | 20 |
| Time/site filtering | Yes | No |
| Content fields | Snippet / Summary / Content | Snippet only |
| Billing | Postpaid & Subscription | Postpaid only |
| Latency | ~700ms avg | ~1053ms avg |

## License

MIT
