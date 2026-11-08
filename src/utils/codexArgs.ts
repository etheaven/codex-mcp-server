/**
 * Pure builders for Codex CLI argument lists.
 *
 * Kept free of I/O so they can be unit-tested against the flags the current
 * Codex CLI accepts (verified against codex-cli 0.153). Global flags go before
 * the subcommand (`exec` / `review`); the prompt is always sent via stdin (`-`)
 * so long prompts never hit OS argv limits.
 */
import { CLI } from '../constants.js';

export const CONCISE_PREFIX =
  'Please provide a focused, concise response without unnecessary elaboration. ';

export interface CodexArgOptions {
  readonly model?: string;
  readonly reasoningEffort?: string;
  readonly fullAuto?: boolean;
  readonly approvalPolicy?: string;
  readonly approval?: string;
  readonly sandboxMode?: string;
  readonly yolo?: boolean;
  readonly workingDir?: string; // already resolved
  readonly config?: string | Record<string, unknown>;
  readonly profile?: string;
  readonly image?: string | string[];
  readonly search?: boolean;
  readonly oss?: boolean;
  readonly enableFeatures?: readonly string[];
  readonly disableFeatures?: readonly string[];
}

export interface CodexInvocation {
  readonly args: string[];
  readonly stdin: string;
}

function tomlValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

/** One `-c key=value` pair per entry (Codex parses each -c separately). */
export function configArgs(config?: string | Record<string, unknown>): string[] {
  if (!config) return [];
  if (typeof config === 'string') return [CLI.FLAGS.CONFIG, config];
  return Object.entries(config).flatMap(([key, value]) => [
    CLI.FLAGS.CONFIG,
    `${key}=${tomlValue(value)}`,
  ]);
}

export function validateSafetyOptions(options: CodexArgOptions): void {
  const approval = options.approval || options.approvalPolicy;
  if (options.yolo && approval) {
    throw new Error('Cannot combine yolo with approvalPolicy: yolo already bypasses approvals.');
  }
  if (options.yolo && options.sandboxMode) {
    throw new Error('Cannot combine yolo with sandboxMode: yolo already disables the sandbox.');
  }
}

/**
 * Sandbox / approval flags.
 * `--full-auto` was removed from Codex CLI, so fullAuto maps to
 * `--sandbox workspace-write` (exec mode never prompts for approval anyway).
 */
export function safetyArgs(options: CodexArgOptions): string[] {
  validateSafetyOptions(options);
  if (options.yolo) return [CLI.FLAGS.YOLO];

  const approval = options.approval || options.approvalPolicy;
  const approvalArgs = approval ? [CLI.FLAGS.ASK_FOR_APPROVAL, approval] : [];

  // Web search (--search) and --oss run outside the command sandbox, so they no
  // longer force a writable sandbox. fullAuto / an approval policy still do.
  const needsWrite = options.fullAuto || Boolean(approval);
  const sandbox = options.sandboxMode || (needsWrite ? CLI.DEFAULTS.AUTO_SANDBOX : undefined);
  const sandboxArgs = sandbox ? [CLI.FLAGS.SANDBOX_MODE, sandbox] : [];

  return [...approvalArgs, ...sandboxArgs];
}

/** Flags shared by `exec` and `review`: model, effort, cwd, config, features. */
export function commonArgs(options: CodexArgOptions): string[] {
  const model = options.model ? [CLI.FLAGS.MODEL, options.model] : [];
  const effort = options.reasoningEffort
    ? [CLI.FLAGS.CONFIG, `model_reasoning_effort=${JSON.stringify(options.reasoningEffort)}`]
    : [];
  const cwd = options.workingDir ? [CLI.FLAGS.CD, options.workingDir] : [];
  const profile = options.profile ? [CLI.FLAGS.PROFILE, options.profile] : [];
  const enable = (options.enableFeatures || []).flatMap(f => [CLI.FLAGS.ENABLE, f]);
  const disable = (options.disableFeatures || []).flatMap(f => [CLI.FLAGS.DISABLE, f]);

  return [
    ...model,
    ...effort,
    ...cwd,
    ...configArgs(options.config),
    ...profile,
    ...enable,
    ...disable,
  ];
}

export function buildExecInvocation(
  prompt: string,
  options: CodexArgOptions = {}
): CodexInvocation {
  const images = options.image
    ? (Array.isArray(options.image) ? options.image : [options.image]).flatMap(img => [
        CLI.FLAGS.IMAGE,
        img,
      ])
    : [];

  // `-i <FILE>...` is greedy: placed right before `exec` it swallows the
  // subcommand, and right before `-` it swallows the stdin marker. So images go
  // after `exec` and are always followed by --skip-git-repo-check.
  const args = [
    ...safetyArgs(options),
    ...commonArgs(options),
    ...(options.search ? [CLI.FLAGS.SEARCH] : []),
    ...(options.oss ? [CLI.FLAGS.OSS] : []),
    CLI.COMMANDS.EXEC,
    ...images,
    CLI.FLAGS.SKIP_GIT_REPO_CHECK,
    CLI.FLAGS.STDIN_PROMPT,
  ];

  return { args, stdin: `${CONCISE_PREFIX}${prompt}` };
}

export interface ReviewTarget {
  readonly uncommitted?: boolean;
  readonly base?: string;
  readonly commit?: string;
  readonly title?: string;
  readonly prompt?: string;
}

/**
 * `codex review` accepts either a target (--uncommitted / --base / --commit)
 * or free-form instructions, never both.
 */
export function buildReviewInvocation(
  target: ReviewTarget,
  options: CodexArgOptions = {}
): CodexInvocation {
  const targets = [target.uncommitted, target.base, target.commit].filter(Boolean);
  if (targets.length > 1) {
    throw new Error('Pick one review target: uncommitted, base or commit.');
  }
  if (targets.length === 1 && target.prompt) {
    throw new Error(
      'Codex CLI does not accept custom instructions together with uncommitted/base/commit. ' +
        'Drop the prompt, or drop the target and describe what to review in the prompt.'
    );
  }
  if (targets.length === 0 && !target.prompt) {
    throw new Error(
      'Nothing to review: set uncommitted: true, base: "<branch>", commit: "<sha>", or a prompt.'
    );
  }

  const targetArgs = [
    ...(target.uncommitted ? ['--uncommitted'] : []),
    ...(target.base ? ['--base', target.base] : []),
    ...(target.commit ? ['--commit', target.commit] : []),
    ...(target.title ? ['--title', target.title] : []),
  ];

  const args = [
    ...commonArgs(options),
    CLI.COMMANDS.REVIEW,
    ...targetArgs,
    ...(target.prompt ? [CLI.FLAGS.STDIN_PROMPT] : []),
  ];

  return { args, stdin: target.prompt || '' };
}
