# Codex MCP Tool

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/etheaven/codex-mcp-server?logo=github&label=GitHub)](https://github.com/etheaven/codex-mcp-server/releases)
[![npm version](https://img.shields.io/npm/v/@etheaven/codex-mcp-server)](https://www.npmjs.com/package/@etheaven/codex-mcp-server)
[![npm downloads](https://img.shields.io/npm/dt/@etheaven/codex-mcp-server)](https://www.npmjs.com/package/@etheaven/codex-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/etheaven/codex-mcp-server)

</div>

Codex MCP Tool is an open‑source Model Context Protocol (MCP) server that connects your IDE or AI assistant (Claude, Cursor, etc.) to the Codex CLI. It enables non‑interactive automation with `codex exec`, safe sandboxed edits with approvals, and large‑scale code analysis via `@` file references. Built for reliability and speed, it streams progress updates, supports structured change mode (OLD/NEW patch output), and integrates cleanly with standard MCP clients for code review, refactoring, documentation, and CI automation.

> **Latest Release (v1.4.0)**: Works with current Codex CLI (tested on 0.153): fixes `sandbox`/`fullAuto` calls broken by the removed `--full-auto` flag, adds a `review` tool for git changes and a `list-models` tool, and no longer pins a frozen model list. [See changelog](#recent-updates)

- Ask Codex questions from your MCP client, or brainstorm ideas programmatically.

<a href="https://glama.ai/mcp/servers/@etheaven/codex-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@etheaven/codex-mcp-server/badge" alt="Codex Tool MCP server" />
</a>

## TLDR: [![Claude](https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff)](#) + Codex CLI

Goal: Use Codex directly from your MCP-enabled editor to analyze and edit code efficiently.

## Prerequisites

Before using this tool, ensure you have:

1. **[Node.js](https://nodejs.org/)** (v18.0.0 or higher)
2. **[Codex CLI](https://github.com/openai/codex)** installed and authenticated

> **✅ Cross-Platform Support**: Fully tested and working on Windows, macOS, and Linux (v1.2.4+)

Check the CLI works on its own first: `codex --version` and `codex exec "say hi"`.

### Claude Code: plugin (recommended)

This repository is its own Claude Code plugin marketplace (self-hosted; it is not listed in Anthropic's official marketplace). In Claude Code, run:

```
/plugin marketplace add etheaven/codex-mcp-server
/plugin install codex-mcp-server@codex-mcp-server
```

### Claude Code: plain MCP server

```bash
claude mcp add codex-cli -- npx -y @etheaven/codex-mcp-server
```

### Cursor

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (per project):

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "npx",
      "args": ["-y", "@etheaven/codex-mcp-server"]
    }
  }
}
```

### Other MCP clients

Any client that launches stdio MCP servers works: the command is `npx -y @etheaven/codex-mcp-server` (or `codex-mcp` after a global install).

### Verify Installation

Type `/mcp` inside Claude Code (or open Cursor's MCP settings) and check the server is connected. Then ask: "use codex list-models".

### Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `CODEX_MCP_CWD` | client working dir | Directory Codex runs in when a call does not pass `workingDir` |
| `CODEX_MCP_TIMEOUT_MS` | `600000` (10 min) | Default per-call timeout; a call's `timeout` argument overrides it |
| `CODEX_MCP_MAX_RESPONSE_CHARS` | `16000` | Responses longer than this are truncated so they do not flood the client's context |
| `MCP_TOOL_TIMEOUT` | client-specific | Claude Code's own MCP tool timeout; raise it together with `CODEX_MCP_TIMEOUT_MS` for long tasks |

Example: `claude mcp add codex-cli -e CODEX_MCP_TIMEOUT_MS=1800000 -- npx -y @etheaven/codex-mcp-server`

---

## Configuration

### Claude Desktop

Add to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "npx",
      "args": ["-y", "@etheaven/codex-mcp-server"]
    }
  }
}
```

**Config file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/claude/claude_desktop_config.json`

### Global Installation

```bash
npm install -g @etheaven/codex-mcp-server
```

Then use `"command": "codex-mcp"` instead of the npx approach.

After updating configuration, restart your terminal session.

## Example Workflow

- Natural language: "use codex to explain index.html", "understand this repo with @src", "look for vulnerabilities and suggest fixes"
- "use codex to review my uncommitted changes", "have codex review this branch against main"
- Claude Code: the server's prompts also appear in the `/` slash-command menu.

## Usage Examples

### Model Selection

By default Codex uses the `model` and `model_reasoning_effort` from your `~/.codex/config.toml`, which is usually what you want. OpenAI changes the model lineup often, so this server does not hard-code model names: any `model` string is passed to Codex as-is. To see what your Codex install supports, call the `list-models` tool (it wraps `codex debug models`):

```javascript
// Use your configured default model
'explain the architecture of @src/';

// Ask which models and reasoning levels are available
'use codex list-models';

// Pick one explicitly, with a reasoning level that model supports
'use codex with model <id from list-models> and reasoning high to analyze @algorithm.py';
```

### With File References (using @ syntax)

- `ask codex to analyze @src/main.ts and explain what it does`
- `use codex to summarize @. the current directory`
- `analyze @package.json and list dependencies`

### General Questions (without files)

- `ask codex to explain div centering`
- `ask codex about best practices for React development related to @src/components/Button.tsx`

### Brainstorming & Ideation

- `brainstorm ways to optimize our CI/CD pipeline using SCAMPER method`
- `use codex to brainstorm 10 innovative features for our app with feasibility analysis`
- `ask codex to generate product ideas for the healthcare domain with design-thinking approach`

### Codex Approvals & Sandbox

Codex CLI supports fine-grained control over permissions and approvals through sandbox modes and approval policies.

#### Understanding Parameters

**The `sandbox` Parameter (Convenience Flag):**

- `sandbox: true` → same as `fullAuto: true`: runs Codex with `--sandbox workspace-write` so it can edit files in the working directory
- `sandbox: false` (default) → Codex uses the sandbox from your config, which is `read-only` unless you changed it
- Codex CLI removed its `--full-auto` flag; since v1.4.0 this server maps `fullAuto` to `--sandbox workspace-write` instead

**Granular Control Parameters:**

- `sandboxMode`: Controls file system access level
- `approvalPolicy`: Controls when user approval is required (`codex exec` is non-interactive, so in practice commands either run or fail)
- `fullAuto`: Shorthand for `sandboxMode: "workspace-write"`
- `yolo`: ⚠️ Bypasses all safety checks (dangerous, not recommended)

#### Sandbox Modes

| Mode                  | Description                          | Use Case                                          |
| --------------------- | ------------------------------------ | ------------------------------------------------- |
| `read-only`           | Analysis only, no file modifications | Code review, exploration, documentation reading   |
| `workspace-write`     | Can modify files in workspace        | Most development tasks, refactoring, bug fixes    |
| `danger-full-access`  | Full system access including network | Advanced automation, CI/CD pipelines              |

#### Approval Policies

| Policy        | Description                      | When to Use                         |
| ------------- | -------------------------------- | ----------------------------------- |
| `never`       | No approvals required            | Fully trusted automation            |
| `on-request`  | The model decides when to ask    | Default in recent Codex CLI         |
| `on-failure`  | Legacy; still accepted by Codex  | Older configs                       |
| `untrusted`   | Legacy; still accepted by Codex  | Older configs                       |

#### Configuration Examples

**Example 1: Balanced Automation (Recommended)**

```javascript
{
  "approvalPolicy": "never",
  "sandboxMode": "workspace-write",  // Auto-set if omitted in v1.2+
  "prompt": "refactor @src/utils for better performance"
}
```

**Example 2: Quick Automation (Convenience Mode)**

```javascript
{
  "sandbox": true,  // Equivalent to fullAuto: true (workspace-write)
  "prompt": "fix type errors in @src/"
}
```

**Example 3: Read-Only Analysis**

```javascript
{
  "sandboxMode": "read-only",
  "prompt": "analyze @src/ and explain the architecture"
}
```

#### Smart Defaults (v1.2+)

Starting from version 1.2.0, the server automatically applies intelligent defaults to prevent permission errors:

- ✅ If `approvalPolicy` is set but `sandboxMode` is not → auto-sets `sandboxMode: "workspace-write"`
- ✅ `search: true` uses Codex's `--search` flag (live web search) and no longer changes the sandbox (v1.4.0)
- ✅ All commands include `--skip-git-repo-check` to prevent errors in non-git environments
- ✅ Prompts are sent on stdin, so very large prompts no longer hit OS command-line limits (v1.4.0)

#### Troubleshooting Permission Errors

If you encounter `❌ Permission Error: Operation blocked by sandbox policy`:

**Check 1: Verify sandboxMode**

```bash
# Ensure you're not using read-only mode for write operations
{
  "sandboxMode": "workspace-write",  // Not "read-only"
  "approvalPolicy": "never"
}
```

**Check 2: Use convenience flags**

```bash
# Let the server handle defaults
{
  "sandbox": true,  // Simple automation
  "prompt": "your task"
}
```

**Check 3: Update to latest version**

```bash
# v1.2+ includes smart defaults to prevent permission errors
npm install -g @etheaven/codex-mcp-server@latest
```

#### Common Issues

**Issue 1: MCP Tool Timeout Error**

If you encounter timeout errors when using Codex MCP tools:

```bash
# Claude Code's MCP tool timeout (in milliseconds)
export MCP_TOOL_TIMEOUT=1800000  # 30 minutes

# This server's own per-call timeout (default 10 minutes)
export CODEX_MCP_TIMEOUT_MS=1800000

# For Windows (PowerShell):
$env:MCP_TOOL_TIMEOUT=1800000

# For Windows (CMD):
set MCP_TOOL_TIMEOUT=1800000
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, or PowerShell profile) to make it permanent.

**Issue 2: Codex Cannot Write Files**

If Codex responds with permission errors like "Operation blocked by sandbox policy" or "rejected by user approval settings", configure your Codex CLI settings:

Create or edit `~/.codex/config.toml`:

```toml
approval_policy = "never"
sandbox_mode = "workspace-write"

[sandbox_workspace_write]
network_access = true   # only if Codex must reach the network from its shell
```

Only switch to `sandbox_mode = "danger-full-access"` if Codex must write outside the workspace.

**⚠️ Security Warning**: The `danger-full-access` mode grants Codex full file system access. Only use this configuration in trusted environments and for tasks you fully understand.

**Configuration File Locations:**
- **macOS/Linux**: `~/.codex/config.toml`
- **Windows**: `%USERPROFILE%\.codex\config.toml`

After updating the configuration, restart your MCP client (Claude Desktop, Claude Code, etc.).

#### Basic Examples

- `use codex to create and run a Python script that processes data`
- `ask codex to safely test @script.py and explain what it does`

**Default Behavior:**

- All `codex exec` commands automatically include `--skip-git-repo-check` to avoid unnecessary git repository checks, as not all execution environments are git repositories.
- This prevents permission errors when running Codex in non-git directories or when git checks would interfere with automation.

### Advanced Examples

```javascript
// Using ask-codex with specific model and reasoning effort
'ask codex using gpt-5.3-codex with reasoning high to refactor @utils/database.js for better performance';

// Brainstorming with constraints
"brainstorm solutions for reducing API latency with constraints: 'must use existing infrastructure, budget under $5k'";

// Change mode for structured edits
'use codex in change mode to update all console.log to use winston logger in @src/';
```

### Tools (for the AI)

These tools are designed to be used by the AI assistant.

#### Core Tools

- **`ask-codex`**: Sends a prompt to Codex via `codex exec`.
  - Supports `@` file references for including file content
  - Optional `model`: any ID your Codex CLI accepts; omit it to use your config default (see `list-models`)
  - Optional `reasoningEffort`: e.g. `low`, `medium`, `high`, `xhigh`, `max` (per-model support, see `list-models`)
  - `sandbox=true` lets Codex edit files (`--sandbox workspace-write`)
  - `changeMode=true` returns structured OLD/NEW edits
  - Supports approval policies and sandbox modes
  - **Automatically includes `--skip-git-repo-check`** to prevent permission errors in non-git environments

- **`review`**: Runs `codex review` on git changes and returns prioritized findings with `file:line` references.
  - One target: `uncommitted: true`, `base: "main"` or `commit: "<sha>"`
  - Or free-form `prompt` instructions with no target (Codex CLI does not accept both)
  - `workingDir` picks the repository; read-only

- **`list-models`**: Lists the models and reasoning levels the installed Codex CLI supports (`codex debug models`).

- **`brainstorm`**: Generate novel ideas with structured methodologies.
  - Multiple frameworks: divergent, convergent, SCAMPER, design-thinking, lateral
  - Domain-specific context (software, business, creative, research, product, marketing)
  - Supports same models and `reasoningEffort` as `ask-codex`
  - Configurable idea count and analysis depth
  - Includes feasibility, impact, and innovation scoring
  - Example: `brainstorm prompt:"ways to improve code review process" domain:"software" methodology:"scamper"`

- **`ping`**: A simple test tool that echoes back a message.
  - Use to verify MCP connection is working
  - Example: `/codex-cli:ping (MCP) "Hello from Codex MCP!"`

- **`help`**: Shows the Codex CLI help text and available commands.

#### Advanced Tools

- **`fetch-chunk`**: Retrieves cached chunks from changeMode responses.
  - Used for paginating large structured edit responses
  - Requires `cacheKey` and `chunkIndex` parameters

- **`timeout-test`**: Test tool for timeout prevention.
  - Runs for a specified duration in milliseconds
  - Useful for testing long-running operations

### Slash Commands (for the User)

You can use these commands directly in Claude Code's interface (compatibility with other clients has not been tested).

- **/analyze**: Analyzes files or directories using Codex, or asks general questions.
  - **`prompt`** (required): The analysis prompt. Use `@` syntax to include files (e.g., `/analyze prompt:@src/ summarize this directory`) or ask general questions (e.g., `/analyze prompt:Please use a web search to find the latest news stories`).
- **/sandbox**: Safely tests code or scripts with Codex approval modes.
  - **`prompt`** (required): Code testing request (e.g., `/sandbox prompt:Create and run a Python script that processes CSV data` or `/sandbox prompt:@script.py Test this script safely`).
- **/help**: Displays the Codex CLI help information.
- **/ping**: Tests the connection to the server.
  - **`message`** (optional): A message to echo back.

## Recent Updates

### v1.4.0 (2026-11-08)

**🐛 Fixes for current Codex CLI (tested on 0.153.4):**
- `sandbox: true` / `fullAuto: true` failed with `unexpected argument '--full-auto'`; now mapped to `--sandbox workspace-write`
- `search: true` now uses Codex's `--search` flag instead of the deprecated `web_search_request` feature, and no longer forces a writable sandbox
- Prompts are sent on stdin; `brainstorm` prompts over 100 KB were previously passed to Codex as a literal `< /tmp/file` string
- `image` attachments: Codex's greedy `-i` swallowed the `exec` subcommand, so image calls did not run `codex exec`
- `config` objects become one `-c key=value` per entry (they were joined into a single invalid `-c`)
- Timeouts are reported only for real timeouts (an output-size kill was misreported as a timeout)

**✨ New:**
- `review` tool for `codex review` (uncommitted changes, branch vs base, single commit), based on the idea in upstream PR cexll/codex-mcp-server#6
- `list-models` tool; `model` and `reasoningEffort` are free-form, so new models and levels such as `max` work without a server release
- `CODEX_MCP_TIMEOUT_MS` and `CODEX_MCP_MAX_RESPONSE_CHARS` environment variables
- Clearer errors: unsupported model/effort, CLI flag mismatches, and timeouts say what to change
- Server and `version` tool report the real package version (the `version` tool said v1.2.5)
- First real test suite (`npm test`, 23 tests), now required in CI and release

### v1.3.9 (2026-04-01)

- Truncate responses above 16k characters so oversized results do not break Claude Code
- Concise-response instruction added to every `ask-codex` call

### v1.3.8 (2026-03-30)

**📦 Release Fix:**
- Added `search-insights` to devDependencies so `npm ci` passes in the GitHub release workflow
- This is the first publishable release that includes the empty `ask-codex` response fix

### v1.3.7 (2026-03-30)

**📦 Release Fix:**
- Synced `package-lock.json` with `package.json` so the GitHub release workflow can complete `npm ci` and publish successfully
- Carries forward the empty `ask-codex` response fix from the failed `v1.3.6` release attempt

### v1.3.6 (2026-03-30)

**🐛 Bug Fixes:**
- Fixed empty `ask-codex` responses when Codex CLI emitted the usable transcript on `stderr`
- Reworked output parsing to handle role-based transcript sections like `user`, `codex`, and `assistant`
- Prevented the formatter from returning a bare `**Response:**` header when no response content was parsed

**📦 Release Metadata:**
- Synced npm, lockfile, and Claude marketplace/plugin metadata to version `1.3.6`

### v1.3.0 (2026-03-15)

**Model Support Overhaul:**
- **Updated model list** to March 2026: added gpt-5.4, gpt-5.4-pro, gpt-5.3-codex, gpt-5.3-codex-spark, gpt-5.2-codex, gpt-5.2, gpt-5.1-codex-max, gpt-5.1-codex, gpt-5.1, gpt-5-pro, gpt-5-mini, gpt-5-nano, o3-pro, gpt-4.1-mini, gpt-4.1-nano
- **Removed deprecated models**: `codex-1` and `codex-mini-latest` (never existed in OpenAI API)
- **New `reasoningEffort` parameter** for ask-codex, brainstorm, and batch-codex tools — supports `none`, `minimal`, `low`, `medium`, `high`, `xhigh`
- **Improved tool schema descriptions** with exact valid model IDs to prevent AI clients from inventing model names
- **Updated default model** recommendation from `gpt-5-codex` to `gpt-5.4`
- **Comprehensive model documentation** rewrite with per-model reasoning effort support tables

### v1.2.4 (2025-10-27)

**🔧 Major Improvement:**
- **Windows Compatibility Enhancement**: Replaced Node.js native `spawn()` with industry-standard `cross-spawn` package
  - Root cause: Previous `shell: true` fix still failed on some Windows configurations
  - Solution: Use `cross-spawn` (50M+ weekly downloads, used by Webpack/Jest) for automatic Windows `.cmd` handling
  - Benefits:
    - Zero configuration required for Windows users
    - Automatic handling of `.cmd`, `.ps1`, and `.exe` extensions
    - Compatible with both CMD and PowerShell environments
    - <5ms performance overhead
  - Dependencies: Added `cross-spawn@^7.0.6` and `@types/cross-spawn`

**🐛 Bug Fixes:**
- Enhanced ENOENT error diagnostics with Windows-specific 4-step troubleshooting guide
- Added optional chaining for `stdout`/`stderr` to handle null values in TypeScript strict mode

**📝 Documentation:**
- Added comprehensive Windows troubleshooting section in docs
- Documented `spawn codex ENOENT` error resolution steps

### v1.2.3 (2025-10-27)

**🐛 Bug Fixes:**
- **Windows Compatibility**: Fixed Codex CLI detection failing on Windows despite proper installation
  - Root cause: `spawn()` with `shell: false` couldn't resolve `.cmd` extensions on Windows
  - Solution: Enabled shell mode for cross-platform command execution
  - Impact: Zero performance impact (~10ms overhead), maintains security with array-form arguments
  - Platforms verified: Windows, macOS, Linux via GitHub Actions CI

**📝 Documentation:**
- Updated all package references from `@trishchuk/codex-mcp-tool` to `@etheaven/codex-mcp-server` (now hosted at etheaven/codex-mcp-server)
- Enhanced cross-platform setup instructions

**🔍 Testing:**
- CI/CD now validates on Ubuntu, macOS, and Windows across Node.js 18.x, 20.x, and 22.x

### v1.2.2 & Earlier

- Smart sandbox mode defaults to prevent permission errors
- Enhanced debug information for troubleshooting
- Automatic `--skip-git-repo-check` flag for non-git environments
- Web search integration with feature flags
- Structured change mode with pagination support

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **Windows** | ✅ Fully Supported | Enhanced in v1.2.4 with cross-spawn |
| **macOS** | ✅ Fully Supported | Tested on Darwin 23.5.0+ |
| **Linux** | ✅ Fully Supported | Tested on Ubuntu Latest |

**Minimum Requirements:**
- Node.js v18.0.0 or higher
- Codex CLI installed and authenticated (`npm install -g @openai/codex`); v1.4.0 is tested against Codex CLI 0.153

## Acknowledgments

This project was inspired by the excellent work from [jamubc/gemini-mcp-tool](https://github.com/jamubc/gemini-mcp-tool). Special thanks to [@jamubc](https://github.com/jamubc) for the original MCP server architecture and implementation patterns.

## Contributing

Contributions are welcome! Please submit pull requests or report issues through GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

**Disclaimer:** This is an unofficial, third-party tool and is not affiliated with, endorsed, or sponsored by OpenAI.
