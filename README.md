# pi-byted-web-search

[中文](./README.zh-CN.md) | **English**

A [pi coding agent](https://github.com/earendil-works/pi-mono) extension that provides web search capabilities via the [Doubao Search API](https://www.volcengine.com/docs/87772) (Volcano Engine).

> API reference snapshots (Custom/Global versions) live in [`docs/api/`](docs/api/). They are captured from the official docs and may lag behind — always verify against the [live Volcano Engine docs](https://www.volcengine.com/docs/87772).

## Features

- **Web Search Tool** - Registers a `doubao_web_search` tool the LLM can call autonomously
- **Dual API Versions** — Custom version (Chinese content, richer filters) and Global version (international content)
- **Multi API Key** — Round-robin key pool with automatic failover on rate limits and quota exhaustion
- **Billing Type Aware** — Distinguishes postpaid vs subscription keys; Global version only uses postpaid keys
- **Token Efficient** — Three detail levels (`brief` / `summary` / `full`), output truncation with `truncateHead`
- **Cancellation** — Passes `AbortSignal` to `fetch`; pressing Esc cancels in-flight requests
- **Custom TUI Rendering** — Compact collapsed view, expandable result preview

## Installation

### From npm (recommended)

```bash
pi install npm:pi-byted-web-search
```

### From GitHub

```bash
pi install git:github.com/zzwtsy/pi-byted-web-search
```

### Try without installing

```bash
pi -e git:github.com/zzwtsy/pi-byted-web-search
```

### From source (development)

```bash
git clone https://github.com/zzwtsy/pi-byted-web-search.git
cd pi-byted-web-search
pi install .
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
| `count` | integer | 5 | Number of results (1-10) |
| `version` | `"custom"` \| `"global"` | `custom` | API version |
| `detail_level` | `"brief"` \| `"summary"` \| `"full"` | `summary` | Result detail level |
| `time_range` | string | — | `OneDay` / `OneWeek` / `OneMonth` / `OneYear` / `YYYY-MM-DD..YYYY-MM-DD` (Custom only) |
| `sites` | string | — | Restrict to domains, pipe-separated (Custom only) |
| `block_hosts` | string | — | Exclude domains, pipe-separated (Custom only) |
| `include_images` | boolean | `false` | Include up to 3 image snippets per result (Global only) |

### Commands

- `/doubao-keys` — Open the interactive API key pool status panel (↑/↓ to select, Esc to close, live refresh)

## Error Handling & Retries

- Rate limits (`700429`) and quota exhaustion (`10406`/`10412`/etc.) automatically fail over to the next API key
- Internal errors (`10500`/`10501`, documented as retryable by Volcano Engine) retry once on the same key with exponential backoff + jitter, then fail over
- Connection-level network errors fail over to the next key; timeouts are **not** retried (the request may have been billed)
- Parameter errors (`10400` etc.) fail fast with the API error message
- All keys unavailable → error with per-key status (keys are masked in status output)
- User cancellation (Esc) returns a friendly message instead of an error

## Caching

Search results are cached in-memory with a configurable TTL (`cacheTtlMs`, default 5 minutes). Repeated searches with identical parameters return cached results instantly without consuming API quota. Set `cacheTtlMs` to `0` to disable caching.

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
