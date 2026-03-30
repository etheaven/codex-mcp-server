# Codex MCP Tool

<div align="center">

[![GitHub Release](https://img.shields.io/github/v/release/etheaven/codex-mcp-server?logo=github&label=GitHub)](https://github.com/etheaven/codex-mcp-server/releases)
[![npm version](https://img.shields.io/npm/v/@etheaven/codex-mcp-server)](https://www.npmjs.com/package/@etheaven/codex-mcp-server)
[![npm downloads](https://img.shields.io/npm/dt/@etheaven/codex-mcp-server)](https://www.npmjs.com/package/@etheaven/codex-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/etheaven/codex-mcp-server)

</div>

Codex MCP Tool is an open‑source Model Context Protocol (MCP) server that connects your IDE or AI assistant (Claude, Cursor, etc.) to the Codex CLI. It enables non‑interactive automation with `codex exec`, safe sandboxed edits with approvals, and large‑scale code analysis via `@` file references. Built for reliability and speed, it streams progress updates, supports structured change mode (OLD/NEW patch output), and integrates cleanly with standard MCP clients for code review, refactoring, documentation, and CI automation.

> **Latest Release (v1.3.8)**: Fixed empty `ask-codex` responses, improved Codex CLI transcript parsing, and repaired release packaging so npm/marketplace updates publish correctly. [See changelog](#recent-updates)

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

### Install via Claude Code Marketplace (Recommended)

In Claude Code, run:

```
/plugin marketplace add etheaven/codex-mcp-server
/plugin install codex-mcp-server@codex-mcp-server
```

### Alternative: CLI Setup

```bash
claude mcp add codex-cli -- npx -y @etheaven/codex-mcp-server
```

### Verify Installation

Type `/mcp` inside Claude Code to verify the Codex MCP is active.

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
- Claude Code: Type `/codex-cli` to access the MCP server tools.

## Usage Examples

### Model Selection

```javascript
// Use the default model (gpt-5.4)
'explain the architecture of @src/';

// Use gpt-5.3-codex for complex coding tasks
'use codex with model gpt-5.3-codex to refactor @legacy-code.js';

// Use gpt-5.4 with high reasoning for deep analysis
'use codex with model gpt-5.4 and reasoning high to analyze complex algorithm in @algorithm.py';

// Use o4-mini for quick tasks
'use codex with model o4-mini to add comments to @utils.js';

// Use o3 for deep reasoning
'use codex with model o3 to design microservices architecture for @requirements.md';

// Use gpt-5-mini for cost-effective tasks
'use codex with model gpt-5-mini to summarize @README.md';
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

- `sandbox: true` → Enables **fullAuto** mode (equivalent to `fullAuto: true`)
- `sandbox: false` (default) → Does **NOT** disable sandboxing, just doesn't enable auto mode
- **Important:** The `sandbox` parameter is a convenience flag, not a security control

**Granular Control Parameters:**

- `sandboxMode`: Controls file system access level
- `approvalPolicy`: Controls when user approval is required
- `fullAuto`: Shorthand for `sandboxMode: "workspace-write"` + `approvalPolicy: "on-failure"`
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
| `on-request`  | Ask before every action          | Maximum control, manual review      |
| `on-failure`  | Only ask when operations fail    | Balanced automation (recommended)   |
| `untrusted`   | Maximum paranoia mode            | Untrusted code or high-risk changes |

#### Configuration Examples

**Example 1: Balanced Automation (Recommended)**

```javascript
{
  "approvalPolicy": "on-failure",
  "sandboxMode": "workspace-write",  // Auto-set if omitted in v1.2+
  "model": "gpt-5.4",
  "prompt": "refactor @src/utils for better performance"
}
```

**Example 2: Quick Automation (Convenience Mode)**

```javascript
{
  "sandbox": true,  // Equivalent to fullAuto: true
  "model": "gpt-5.4",
  "prompt": "fix type errors in @src/"
}
```

**Example 3: Read-Only Analysis**

```javascript
{
  "sandboxMode": "read-only",
  "model": "gpt-5.4",
  "prompt": "analyze @src/ and explain the architecture"
}
```

#### Smart Defaults (v1.2+)

Starting from version 1.2.0, the server automatically applies intelligent defaults to prevent permission errors:

- ✅ If `approvalPolicy` is set but `sandboxMode` is not → auto-sets `sandboxMode: "workspace-write"`
- ✅ If `search: true` or `oss: true` → auto-sets `sandboxMode: "workspace-write"` (for network access)
- ✅ All commands include `--skip-git-repo-check` to prevent errors in non-git environments

#### Troubleshooting Permission Errors

If you encounter `❌ Permission Error: Operation blocked by sandbox policy`:

**Check 1: Verify sandboxMode**

```bash
# Ensure you're not using read-only mode for write operations
{
  "sandboxMode": "workspace-write",  // Not "read-only"
  "approvalPolicy": "on-failure"
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
# Set the MCP tool timeout environment variable (in milliseconds)
export MCP_TOOL_TIMEOUT=36000000  # 10 hours

# For Windows (PowerShell):
$env:MCP_TOOL_TIMEOUT=36000000

# For Windows (CMD):
set MCP_TOOL_TIMEOUT=36000000
```

Add this to your shell profile (`~/.bashrc`, `~/.zshrc`, or PowerShell profile) to make it permanent.

**Issue 2: Codex Cannot Write Files**

If Codex responds with permission errors like "Operation blocked by sandbox policy" or "rejected by user approval settings", configure your Codex CLI settings:

Create or edit `~/.codex/config.toml`:

```toml
# Dynamically generated Codex configuration
model = "gpt-5.4"
model_reasoning_effort = "high"
model_reasoning_summary = "detailed"
approval_policy = "never"
sandbox_mode = "danger-full-access"
disable_response_storage = true
network_access = true
```

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
  - Optional `model` parameter — recommended models:
    - `gpt-5.4` (default, latest flagship)
    - `gpt-5.3-codex` (best for complex coding)
    - `gpt-5.3-codex-spark` (instant coding, Pro only)
    - `o3` (deep reasoning)
    - `o4-mini` (fast & efficient)
    - `gpt-5-mini` (cost-effective)
    - `gpt-4.1` (1M context, no reasoning)
    - See [full model list](docs/concepts/models.md)
  - Optional `reasoningEffort` parameter: `none`, `minimal`, `low`, `medium`, `high`, `xhigh`
  - `sandbox=true` enables `--full-auto` mode
  - `changeMode=true` returns structured OLD/NEW edits
  - Supports approval policies and sandbox modes
  - **Automatically includes `--skip-git-repo-check`** to prevent permission errors in non-git environments

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
- Codex CLI installed and authenticated (`npm install -g @openai/codex`)

## Acknowledgments

This project was inspired by the excellent work from [jamubc/gemini-mcp-tool](https://github.com/jamubc/gemini-mcp-tool). Special thanks to [@jamubc](https://github.com/jamubc) for the original MCP server architecture and implementation patterns.

## Contributing

Contributions are welcome! Please submit pull requests or report issues through GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

**Disclaimer:** This is an unofficial, third-party tool and is not affiliated with, endorsed, or sponsored by OpenAI.
