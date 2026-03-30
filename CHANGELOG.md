# Changelog

## [Unreleased]

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
