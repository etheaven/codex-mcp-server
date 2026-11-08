import { z } from 'zod';

/**
 * Shared argument schemas. Model IDs and reasoning levels change faster than
 * this server is released, so they are free-form strings validated by Codex CLI
 * itself; the `list-models` tool reports what the installed CLI supports.
 */
export const MODEL_DESCRIPTION =
  'Optional model ID, passed straight to Codex CLI (-m). Omit to use the default from ' +
  '~/.codex/config.toml (recommended). Do not guess IDs: call the list-models tool to see the ' +
  'models this Codex install offers.';

export const REASONING_DESCRIPTION =
  'Optional reasoning effort (model_reasoning_effort). Common values: low, medium, high, xhigh, ' +
  'max; some models also take none, minimal or ultra. Support varies per model: list-models shows ' +
  'the levels each model accepts. Omit to use the model/config default.';

export const modelSchema = z.string().min(1).optional().describe(MODEL_DESCRIPTION);

export const reasoningEffortSchema = z.string().min(1).optional().describe(REASONING_DESCRIPTION);

export const timeoutSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe(
    'Maximum execution time in milliseconds. Default: CODEX_MCP_TIMEOUT_MS env var, else 600000 (10 min).'
  );

export const searchSchema = z
  .boolean()
  .optional()
  .describe('Enable live web search (Codex --search). Does not change the sandbox.');
