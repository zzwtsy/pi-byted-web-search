# AGENTS.md

pi-byted-web-search - a pi package that provides Doubao Search (Volcano Engine) web search capabilities for pi sessions.

## Git and destructive operations

- **All git write operations require explicit user approval before execution**: commit, push, reset, revert, rebase, merge, branch/tag creation or deletion, and force operations.
- **Staging files (git add) also requires explicit approval**, unless the user has already asked to stage/commit a specific change.
- **Destructive file operations** (deleting files, moving/renaming tracked files, git clean, checkout overwriting worktree changes) likewise require explicit approval.
- Read-only operations (status, diff, log, show, grep) are always allowed.
- When a change is ready to be committed, present the summary and wait for explicit approval instead of committing.

## Coding conventions

- **Comments**: always in Chinese (code comments, JSDoc, docstrings).
- **Everything else**: English - identifiers (variables/functions/classes/filenames), UI text (tool label/description, command output, notifications/status strings), error messages, commit messages, code and commands inside docs.
- User-facing docs (README) may be written in Chinese, but code, identifiers, and commands within them stay English.

## Commands

- `pnpm check` - tsc --noEmit
- `pnpm lint` - eslint
- `pnpm test` - vitest
- `pi -e ./src/index.ts` - smoke-test the extension locally

## Architecture

- `src/index.ts` - extension entry point (default export factory), registers the `doubao_web_search` tool and the `/doubao-keys` command. Lifecycle: `session_start` loads config + keys + cache, `session_shutdown` clears pool + cache.
- `src/tool.ts` - `doubao_web_search` tool definition: wires adapter -> client -> formatter -> renderer. Handles cache lookup, cancellation, and streaming progress updates.
- `src/client.ts` - HTTP request + KeyPool failover retry. Rate limit / quota exhaustion -> switch key; internal error -> same-key retry with backoff; network error -> switch key; timeout/cancel -> no retry.
- `src/key-pool.ts` - multi-API-key pool: round-robin selection + failover. Custom version prefers subscription keys, Global version uses postpaid only. In-flight tracking for load balancing.
- `src/key-status.ts` - `/doubao-keys` TUI component: scrollable key status list with live refresh.
- `src/config.ts` - config loading (env vars > project `.pi/` file > global file > defaults) and validation.
- `src/types.ts` - shared type definitions: config, key state, unified search models, adapter interface, tool details.
- `src/errors.ts` - API error codes, error strategy mapping, `DoubaoApiError` and `SearchError` classes.
- `src/cache.ts` - in-memory TTL cache for search results.
- `src/custom-adapter.ts` - Custom version adapter: unified model <-> Custom API request/response.
- `src/global-adapter.ts` - Global version adapter: unified model <-> Global API request/response.
- `src/formatter.ts` - search result formatting + truncation. Version-agnostic, consumes `UnifiedSearchResult`.
- `src/renderer.ts` - TUI `renderCall`/`renderResult` (presentation only, no core logic).
- `tests/` - vitest unit tests with mocked fetch.

## Comments

- Three tiers (all comments in Chinese, per coding conventions):
  - `//` line comments - only "why": decisions, measured API findings, external constraints, gotchas.
  - `/** */` block comments - file headers (one-line responsibility) and exported symbols (interfaces, types, methods).
  - Never write: comments restating the code, commented-out code, changelog/history, decorative dividers.
- Contracts over tags: document when a function returns `undefined` or throws; use `@param`/`@returns` as needed, not on every function.
- Keep comments in sync with code: update adjacent comments when editing; stale comments must be fixed or removed. Avoid version numbers, dates, and "currently only supports X" phrasing - write the "why", not the "current state".

## Verification

- Before handing work back, run `pnpm check && pnpm lint && pnpm test` and report the result.

## Documentation map

- User docs: `README.md` (English, default) / `README.zh-CN.md` (Chinese).
- API reference: `docs/api/` (snapshots from Volcano Engine docs, may lag - always verify against live docs).
- Working plans: `docs/plans/` (gitignored).
