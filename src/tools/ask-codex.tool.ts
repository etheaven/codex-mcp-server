import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { executeCodexCLI, executeCodex } from '../utils/codexExecutor.js';
import { processChangeModeOutput } from '../utils/changeModeRunner.js';
import { formatCodexResponseForMCP } from '../utils/outputParser.js';
import { APPROVAL_POLICIES, ERROR_MESSAGES } from '../constants.js';
import { modelSchema, reasoningEffortSchema, searchSchema, timeoutSchema } from './sharedSchema.js';

const askCodexArgsSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe("Task or question. Use @ to include files (e.g., '@largefile.ts explain')."),
  model: modelSchema,
  reasoningEffort: reasoningEffortSchema,
  sandbox: z
    .boolean()
    .default(false)
    .describe(
      'Let Codex edit files in the working directory (sandbox workspace-write). Alias for fullAuto.'
    ),
  fullAuto: z
    .boolean()
    .optional()
    .describe('Let Codex edit files in the working directory (sandbox workspace-write)'),
  approvalPolicy: z
    .enum(['never', 'on-request', 'on-failure', 'untrusted'])
    .optional()
    .describe('Approval: never, on-request, on-failure, untrusted'),
  approval: z
    .string()
    .optional()
    .describe(`Approval policy: ${Object.values(APPROVAL_POLICIES).join(', ')}`),
  sandboxMode: z
    .enum(['read-only', 'workspace-write', 'danger-full-access'])
    .optional()
    .describe('Access: read-only, workspace-write, danger-full-access'),
  yolo: z.boolean().optional().describe('⚠️ Bypass all safety (dangerous)'),
  cd: z.string().optional().describe('Working directory'),
  workingDir: z.string().optional().describe('Working directory for execution'),
  changeMode: z
    .boolean()
    .default(false)
    .describe('Return structured OLD/NEW edits for refactoring'),
  chunkIndex: z
    .preprocess(val => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? undefined : parsed;
      }
      return undefined;
    }, z.number().min(1).optional())
    .describe('Chunk index (1-based)'),
  chunkCacheKey: z.string().optional().describe('Cache key for continuation'),
  image: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Optional image file path(s) to include with the prompt'),
  config: z
    .union([z.string(), z.record(z.any())])
    .optional()
    .describe("Configuration overrides as 'key=value' string or object"),
  profile: z.string().optional().describe('Configuration profile to use from ~/.codex/config.toml'),
  timeout: timeoutSchema,
  includeThinking: z
    .boolean()
    .default(true)
    .describe('Include reasoning/thinking section in response'),
  includeMetadata: z.boolean().default(true).describe('Include configuration metadata in response'),
  search: searchSchema,
  oss: z
    .boolean()
    .optional()
    .describe(
      'Use a local open-source model provider (Codex --oss, e.g. Ollama or LM Studio running locally).'
    ),
  enableFeatures: z
    .array(z.string())
    .optional()
    .describe('Enable feature flags (repeatable). Equivalent to -c features.<name>=true'),
  disableFeatures: z
    .array(z.string())
    .optional()
    .describe('Disable feature flags (repeatable). Equivalent to -c features.<name>=false'),
});

export const askCodexTool: UnifiedTool = {
  name: 'ask-codex',
  description:
    'Use OpenAI Codex to analyze, review, edit, or generate code. Call this tool whenever the user mentions "codex", "use codex", or wants a second opinion from OpenAI models on code. Supports file references with @ syntax (e.g. @src/), model selection (see list-models), reasoning effort, and structured edits via changeMode. Read-only by default; set sandbox: true to let Codex edit files. For reviewing git changes prefer the review tool.',
  zodSchema: askCodexArgsSchema,
  prompt: {
    description: 'Execute Codex CLI with optional changeMode',
  },
  category: 'utility',
  execute: async (args, onProgress) => {
    const {
      prompt,
      model,
      reasoningEffort,
      sandbox,
      fullAuto,
      approvalPolicy,
      approval,
      sandboxMode,
      yolo,
      cd,
      workingDir,
      changeMode,
      chunkIndex,
      chunkCacheKey,
      image,
      config,
      profile,
      timeout,
      includeThinking,
      includeMetadata,
      search,
      oss,
      enableFeatures,
      disableFeatures,
    } = args;

    if (!prompt?.trim()) {
      throw new Error(ERROR_MESSAGES.NO_PROMPT_PROVIDED);
    }

    if (changeMode && chunkIndex && chunkCacheKey) {
      return processChangeModeOutput('', {
        chunkIndex: chunkIndex as number,
        cacheKey: chunkCacheKey as string,
        prompt: prompt as string,
      });
    }

    try {
      // Use enhanced executeCodex for better feature support
      const result = await executeCodex(
        prompt as string,
        {
          model: model as string,
          reasoningEffort: reasoningEffort as string,
          fullAuto: Boolean(fullAuto ?? sandbox),
          approvalPolicy: approvalPolicy as any,
          approval: approval as string,
          sandboxMode: sandboxMode as any,
          yolo: Boolean(yolo),
          cd: cd as string,
          workingDir: workingDir as string,
          image,
          config,
          profile: profile as string,
          timeout: timeout as number,
          search: search as boolean,
          oss: oss as boolean,
          enableFeatures: enableFeatures as string[],
          disableFeatures: disableFeatures as string[],
        },
        onProgress
      );

      if (changeMode) {
        return processChangeModeOutput(result, {
          chunkIndex: args.chunkIndex as number | undefined,
          prompt: prompt as string,
        });
      }

      // Format response with enhanced output parsing
      return formatCodexResponseForMCP(
        result,
        includeThinking as boolean,
        includeMetadata as boolean
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Model not supported (e.g. ChatGPT account limitations)
      if (errorMessage.includes('not supported') || errorMessage.includes('Model error')) {
        return `❌ **Model Not Available**: ${errorMessage}

**Solutions:**
1. Omit \`model\` to use your Codex default, or call the \`list-models\` tool for valid IDs
2. Check \`reasoningEffort\` is one of the levels list-models shows for that model
3. If using a ChatGPT account, some models require an API key instead`;
      }

      if (errorMessage.includes('Codex CLI not found') || errorMessage.includes('ENOENT')) {
        return `❌ **Codex CLI Not Found**: ${ERROR_MESSAGES.CODEX_NOT_FOUND}

**Quick Fix:**
\`\`\`bash
npm install -g @openai/codex
\`\`\``;
      }

      if (errorMessage.includes('Authentication failed') || errorMessage.includes('unauthorized')) {
        return `❌ **Authentication Failed**: ${ERROR_MESSAGES.AUTHENTICATION_FAILED}

**Setup Options:**
1. **API Key:** \`export OPENAI_API_KEY=your-key\`
2. **Login:** \`codex login\``;
      }

      if (errorMessage.includes('Rate limit') || errorMessage.includes('quota')) {
        return `❌ **Usage Limit Reached**: ${ERROR_MESSAGES.QUOTA_EXCEEDED}

Wait and retry, or check quota in OpenAI dashboard.`;
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return `❌ **Request Timeout**: ${errorMessage}

Narrow the request, or raise \`timeout\` / CODEX_MCP_TIMEOUT_MS.`;
      }

      if (
        errorMessage.includes('sandbox policy') ||
        errorMessage.includes('Permission denied') ||
        errorMessage.includes('blocked by sandbox')
      ) {
        return `❌ **Permission Error**: ${errorMessage}

**Solutions:**
- Use \`sandbox: true\` (workspace-write) so Codex can edit files in the working directory
- Use \`sandboxMode: "danger-full-access"\` only if it must write outside the workspace
- \`yolo: true\` bypasses all safety (only in externally sandboxed environments)`;
      }

      // Generic — always show the actual error
      return `❌ **Codex Error**: ${errorMessage}`;
    }
  },
};
