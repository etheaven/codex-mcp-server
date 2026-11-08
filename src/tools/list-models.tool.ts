import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { executeCommandDetailed } from '../utils/commandExecutor.js';
import { CLI } from '../constants.js';

const listModelsArgsSchema = z.object({
  includeHidden: z
    .boolean()
    .default(false)
    .describe('Also list models the Codex CLI hides from its picker'),
});

interface CodexModelEntry {
  slug?: string;
  display_name?: string;
  description?: string;
  visibility?: string;
  default_reasoning_level?: string;
  supported_reasoning_levels?: Array<{ effort?: string }>;
}

export function formatModelList(raw: string, includeHidden: boolean): string {
  const parsed = JSON.parse(raw) as { models?: CodexModelEntry[] };
  const models = (parsed.models || []).filter(
    m => m.slug && (includeHidden || m.visibility !== 'hide')
  );
  if (models.length === 0) {
    return 'Codex CLI reported no models. Check `codex login` and your provider settings.';
  }

  const lines = models.map(m => {
    const efforts = (m.supported_reasoning_levels || [])
      .map(level => level.effort)
      .filter(Boolean)
      .join(', ');
    const defaultEffort = m.default_reasoning_level
      ? ` (default ${m.default_reasoning_level})`
      : '';
    const summary = m.description ? ` — ${m.description}` : '';
    return `- \`${m.slug}\`${summary}\n  reasoningEffort: ${efforts || 'n/a'}${defaultEffort}`;
  });

  return [
    '**Models available to this Codex CLI** (from `codex debug models`):',
    '',
    ...lines,
    '',
    'Omit `model` to use the default from ~/.codex/config.toml.',
  ].join('\n');
}

export const listModelsTool: UnifiedTool = {
  name: 'list-models',
  description:
    'List the model IDs and reasoning effort levels the installed Codex CLI supports. Call this before passing a model or reasoningEffort to other Codex tools.',
  zodSchema: listModelsArgsSchema,
  prompt: {
    description: 'Show models and reasoning levels supported by the local Codex CLI',
  },
  category: 'simple',
  execute: async args => {
    const result = await executeCommandDetailed(CLI.COMMANDS.CODEX, ['debug', 'models'], {
      timeoutMs: 30000,
    });
    if (!result.ok) {
      return (
        `❌ Could not list models (\`codex debug models\` failed: ${result.stderr || 'no output'}). ` +
        'Update Codex CLI (npm install -g @openai/codex) or omit `model` to use your configured default.'
      );
    }
    try {
      return formatModelList(result.stdout, Boolean(args.includeHidden));
    } catch {
      return `Codex returned a model list this server could not parse:\n\n${result.stdout.slice(0, 4000)}`;
    }
  },
};
