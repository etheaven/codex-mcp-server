# Changelog

## [Unreleased]

## [1.4.0] - 2026-11-08

Compatibility with current Codex CLI (tested on 0.153.4).

- Fixed: `sandbox` / `fullAuto` emitted `--full-auto`, which Codex CLI removed (hard error); now `--sandbox workspace-write`
- Fixed: `search` uses top-level `--search` instead of the deprecated `web_search_request` feature and no longer forces a writable sandbox
- Fixed: prompts go to Codex on stdin (`exec -`); large `brainstorm` prompts were passed as a literal `< /tmp/file` argument
- Fixed: `image` calls put `-i` right before `exec`, which Codex parsed as another image path (no `codex exec` ran)
- Fixed: `config` objects produce one `-c key=value` per entry
- Fixed: output-size kills are no longer reported as timeouts
- Fixed: server info and `version` tool report the package version (was hard-coded 1.3.9 / 1.2.5)
- Added: `review` tool wrapping `codex review` (idea from upstream PR cexll/codex-mcp-server#6 by Lies188)
- Added: `list-models` tool wrapping `codex debug models`
- Changed: `model` / `reasoningEffort` are free-form strings (no frozen March 2026 list; `max`/`ultra` now accepted)
- Added: `CODEX_MCP_TIMEOUT_MS`, `CODEX_MCP_MAX_RESPONSE_CHARS` env vars; actionable error messages
- Added: unit tests (`npm test`), required in CI and release
- Refactor: one pure argument builder (`src/utils/codexArgs.ts`) shared by all Codex calls

## [1.3.9] - 2026-04-01

- Truncate responses above 16k characters so oversized results do not break Claude Code
- Concise-response instruction added to every `ask-codex` call
- Published to npm; no git tag was created for this release

## [1.3.8] - 2026-03-30

- Added `search-insights` to devDependencies so `npm ci` succeeds in GitHub release jobs
- Carries forward the empty `ask-codex` response fix and parser hardening for the first publishable release containing that fix

## [1.3.7] - 2026-03-30

- Synced `package-lock.json` with the package manifest so CI release jobs can complete with `npm ci`
- Carries forward the empty `ask-codex` response fix and transcript parser hardening from the failed `1.3.6` release attempt

## [1.3.6] - 2026-03-30

- Fixed empty `ask-codex` responses when Codex CLI returned useful transcript data on `stderr`
- Hardened transcript parsing for role-based Codex output (`user`, `codex`, `assistant`)
- Prevented the MCP formatter from returning a bare `**Response:**` header when the parsed response was empty
- Synced package and Claude marketplace metadata to release version `1.3.6`

## [1.0.0]

- Public
- Basic Codex CLI integration
- Support for file analysis with @ syntax
- Sandbox mode support
