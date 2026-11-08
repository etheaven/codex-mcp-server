import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { executeCodexReview } from '../utils/codexExecutor.js';
import { formatCodexResponseForMCP } from '../utils/outputParser.js';
import { modelSchema, reasoningEffortSchema, timeoutSchema } from './sharedSchema.js';

// Based on the idea in cexll/codex-mcp-server PR #6 (Lies188), adapted to the
// shared executor and to Codex CLI's rule that a prompt excludes a target.
const reviewArgsSchema = z.object({
  uncommitted: z
    .boolean()
    .optional()
    .describe('Review staged, unstaged and untracked changes in the working directory'),
  base: z.string().optional().describe('Review the current branch against this base branch'),
  commit: z.string().optional().describe('Review the changes introduced by this commit SHA'),
  title: z.string().optional().describe('Optional title shown in the review summary'),
  prompt: z
    .string()
    .optional()
    .describe(
      'Custom review instructions. Codex CLI only accepts this when uncommitted/base/commit are NOT set.'
    ),
  workingDir: z
    .string()
    .optional()
    .describe(
      'Git repository to review. Defaults to CODEX_MCP_CWD / the client working directory.'
    ),
  model: modelSchema,
  reasoningEffort: reasoningEffortSchema,
  timeout: timeoutSchema,
});

export const reviewCodexTool: UnifiedTool = {
  name: 'review',
  description:
    'Run a Codex code review (codex review) on git changes: uncommitted work, a branch against a base, or a single commit. Returns prioritized findings with file:line references. Read-only.',
  zodSchema: reviewArgsSchema,
  prompt: {
    description: 'Review git changes with Codex',
  },
  category: 'codex',
  execute: async (args, onProgress) => {
    const {
      uncommitted,
      base,
      commit,
      title,
      prompt,
      workingDir,
      model,
      reasoningEffort,
      timeout,
    } = args;

    try {
      const result = await executeCodexReview(
        {
          uncommitted: Boolean(uncommitted),
          base: base as string | undefined,
          commit: commit as string | undefined,
          title: title as string | undefined,
          prompt: (prompt as string | undefined)?.trim() || undefined,
        },
        {
          workingDir: workingDir as string | undefined,
          model: model as string | undefined,
          reasoningEffort: reasoningEffort as string | undefined,
          timeout: timeout as number | undefined,
        },
        onProgress
      );
      return formatCodexResponseForMCP(result, false, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `❌ **Codex Review Error**: ${message}`;
    }
  },
};
