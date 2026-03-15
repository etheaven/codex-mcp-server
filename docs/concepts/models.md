# Model Selection

The Codex MCP Tool provides access to OpenAI's latest models through the Codex CLI. Each model offers different capabilities, performance characteristics, and pricing. This guide covers all available models as of March 2026.

## Available Models

### GPT-5.x Flagship & Reasoning

The GPT-5 series models support built-in reasoning with configurable effort levels.

| Model                    | Context | Max Output | Reasoning Effort          | Best For                              | Pricing (Input/Output per 1M) |
| ------------------------ | ------- | ---------- | ------------------------- | ------------------------------------- | ----------------------------- |
| **gpt-5.4**              | 1M      | 128K       | none/low/medium/high/xhigh | Latest flagship, recommended default  | $2.50 / $15.00               |
| **gpt-5.4-pro**          | 1M      | 128K       | high only                 | Maximum reasoning quality             | $30.00 / $180.00             |
| **gpt-5.3-codex**        | 400K    | 128K       | low/medium/high/xhigh    | Best for complex coding tasks         | $1.75 / $14.00               |
| **gpt-5.3-codex-spark**  | —       | —          | —                         | Near-instant coding (Pro only)        | Pro subscription              |
| **gpt-5.2-codex**        | 400K    | 128K       | low/medium/high/xhigh    | Previous gen coding                   | —                             |
| **gpt-5.2**              | 400K    | 128K       | none/low/medium/high/xhigh | Previous gen general                 | —                             |
| **gpt-5.1-codex-max**    | —       | —          | —                         | Long-horizon agentic tasks            | —                             |
| **gpt-5.1-codex**        | —       | —          | —                         | General agentic coding                | —                             |
| **gpt-5.1**              | 400K    | 128K       | none/low/medium/high      | Older gen general                     | —                             |
| **gpt-5**                | 400K    | 128K       | minimal/low/medium/high   | General purpose                       | $1.25 / $10.00               |
| **gpt-5-pro**            | —       | —          | high only                 | Maximum reasoning                     | —                             |
| **gpt-5-codex**          | —       | —          | —                         | Tuned for agentic coding              | —                             |
| **gpt-5-codex-mini**     | —       | —          | —                         | Cost-effective coding                 | —                             |
| **gpt-5-mini**           | 400K    | 128K       | minimal/low/medium/high   | Cost-effective general purpose        | $0.25 / $2.00                |
| **gpt-5-nano**           | —       | —          | —                         | Ultra-cheap, quick tasks              | $0.05 / $0.40                |

### O-Series Reasoning Models

Specialized models trained to think step-by-step before responding.

| Model       | Context | Max Output | Reasoning Effort   | Best For                        |
| ----------- | ------- | ---------- | ------------------ | ------------------------------- |
| **o3**      | 200K    | 100K       | low/medium/high    | Deep reasoning, architecture    |
| **o3-pro**  | —       | —          | —                  | Maximum compute for hard problems |
| **o4-mini** | 200K    | 100K       | low/medium/high    | Fast, cost-efficient reasoning  |

### GPT-4.1 (Non-Reasoning, Instruction-Following)

These models do NOT have reasoning capabilities but offer massive context windows.

| Model            | Context   | Max Output | Best For                    | Pricing (Input/Output per 1M) |
| ---------------- | --------- | ---------- | --------------------------- | ----------------------------- |
| **gpt-4.1**      | 1,047,576 | 32,768     | Large context, no reasoning | $2.00 / $8.00                |
| **gpt-4.1-mini** | —         | —          | Balanced cost/performance   | $0.40 / $1.60                |
| **gpt-4.1-nano** | —         | —          | Ultra-cheap tasks           | $0.10 / $0.40                |

### Legacy Models

| Model          | Notes                          |
| -------------- | ------------------------------ |
| **gpt-4o**     | Previous multimodal flagship   |
| **gpt-4o-mini**| Cost-effective multimodal      |

## Reasoning Effort

Control how deeply the model thinks before responding. Higher effort = deeper analysis, slower response, more tokens consumed.

### Using via MCP Tool

```javascript
// Quick analysis — minimal reasoning
{
  "name": "ask-codex",
  "arguments": {
    "prompt": "summarize @README.md",
    "model": "gpt-5.4",
    "reasoningEffort": "low"
  }
}

// Deep architectural analysis
{
  "name": "ask-codex",
  "arguments": {
    "prompt": "design a microservices architecture for @requirements.md",
    "model": "gpt-5.4",
    "reasoningEffort": "high"
  }
}

// Maximum reasoning for hard problems
{
  "name": "ask-codex",
  "arguments": {
    "prompt": "find the subtle concurrency bug in @src/core/",
    "model": "gpt-5.3-codex",
    "reasoningEffort": "xhigh"
  }
}
```

### Using Codex CLI Directly

```bash
# Via config override
codex -m gpt-5.4 -c model_reasoning_effort='"high"' exec "analyze @src/"

# In ~/.codex/config.toml
model = "gpt-5.4"
model_reasoning_effort = "high"
model_reasoning_summary = "auto"  # auto, concise, detailed, none
```

### Supported Levels by Model

| Model           | none | minimal | low | medium | high | xhigh |
| --------------- | ---- | ------- | --- | ------ | ---- | ----- |
| gpt-5.4         | ✅   | —       | ✅  | ✅     | ✅   | ✅    |
| gpt-5.4-pro     | —    | —       | —   | —      | ✅   | —     |
| gpt-5.3-codex   | —    | —       | ✅  | ✅     | ✅   | ✅    |
| gpt-5.2-codex   | —    | —       | ✅  | ✅     | ✅   | ✅    |
| gpt-5.2         | ✅   | —       | ✅  | ✅     | ✅   | ✅    |
| gpt-5.1         | ✅   | —       | ✅  | ✅     | ✅   | —     |
| gpt-5           | —    | ✅      | ✅  | ✅     | ✅   | —     |
| gpt-5-mini      | —    | ✅      | ✅  | ✅     | ✅   | —     |
| o3 / o4-mini    | —    | —       | ✅  | ✅     | ✅   | —     |

## Model Selection Guidelines

### By Task Type

| Task                    | Recommended Model    | Reasoning Effort |
| ----------------------- | -------------------- | ---------------- |
| Quick code review       | o4-mini              | medium           |
| Comprehensive review    | gpt-5.4              | high             |
| Security audit          | gpt-5.3-codex        | xhigh            |
| System design           | o3                   | high             |
| API design              | gpt-5.4              | medium           |
| Complex bug hunting     | gpt-5.3-codex        | xhigh            |
| Simple fixes            | o4-mini              | low              |
| Documentation           | gpt-5.4              | low              |
| Large-scale refactoring | gpt-5.4 (1M context) | high             |
| Massive monorepos       | gpt-4.1 (1M context) | N/A              |

### Cost Optimization

```bash
# Start cheap, scale up only if needed
codex -m o4-mini "quick overview of @src/"          # Fast & cheap
codex -m gpt-5.4 "detailed analysis of @src/core/"  # Balanced
codex -m gpt-5.3-codex "find bug in @src/critical/" # Deep coding
```

## Configuration

### Codex CLI Config (`~/.codex/config.toml`)

```toml
model = "gpt-5.4"
model_reasoning_effort = "medium"
model_reasoning_summary = "auto"
model_verbosity = "medium"
model_context_window = 1000000
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "codex-cli": {
      "command": "npx",
      "args": ["-y", "@etheaven/codex-mcp-server"],
      "env": {
        "CODEX_MCP_CWD": "/path/to/work"
      }
    }
  }
}
```

## See Also

- [How It Works](./how-it-works.md) — Understanding model integration
- [File Analysis](./file-analysis.md) — Optimizing file references
- [Sandbox Modes](./sandbox.md) — Security with different models
- [OpenAI API Pricing](https://openai.com/api/pricing/) — Latest pricing
- [Codex Models Reference](https://developers.openai.com/codex/models/) — Official model list
