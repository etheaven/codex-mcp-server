import { executeCommandDetailed, defaultTimeoutMs, RetryOptions } from './commandExecutor.js';
import { Logger } from './logger.js';
import { CLI } from '../constants.js';
import { resolveWorkingDirectory } from './workingDirResolver.js';
import {
  buildExecInvocation,
  buildReviewInvocation,
  CodexArgOptions,
  CodexInvocation,
  ReviewTarget,
} from './codexArgs.js';

// Type-safe enums
export enum ApprovalPolicy {
  Never = 'never',
  OnRequest = 'on-request',
  OnFailure = 'on-failure',
  Untrusted = 'untrusted',
}

export enum SandboxMode {
  ReadOnly = 'read-only',
  WorkspaceWrite = 'workspace-write',
  DangerFullAccess = 'danger-full-access',
}

export interface CodexExecOptions {
  readonly model?: string;
  readonly reasoningEffort?: string;
  readonly fullAuto?: boolean;
  readonly approvalPolicy?: ApprovalPolicy | string;
  readonly sandboxMode?: SandboxMode | string;
  readonly approval?: string;
  readonly yolo?: boolean;
  readonly cd?: string;
  readonly workingDir?: string;
  readonly timeoutMs?: number;
  readonly timeout?: number;
  readonly maxOutputBytes?: number;
  readonly retry?: RetryOptions;
  readonly image?: string | string[];
  readonly config?: string | Record<string, any>;
  readonly profile?: string;
  readonly search?: boolean; // Enable live web search (--search)
  readonly oss?: boolean; // Use local open-source provider (--oss)
  readonly enableFeatures?: string[];
  readonly disableFeatures?: string[];
  /** @deprecated prompts always go via stdin now */
  readonly useStdinForLongPrompts?: boolean;
  /** @deprecated exec mode is always used */
  readonly useExec?: boolean;
}

function selectCodexOutput(stdout: string, stderr: string): string {
  const trimmedStdout = stdout.trim();
  if (trimmedStdout) {
    return trimmedStdout;
  }

  const trimmedStderr = stderr.trim();
  if (trimmedStderr) {
    Logger.warn('Codex CLI returned empty stdout; falling back to stderr output');
    return trimmedStderr;
  }

  Logger.warn('Codex CLI returned no output on stdout or stderr');
  return '';
}

/** Pick the most informative line from Codex stderr (it prints a banner first). */
export function extractErrorLine(stderr: string): string {
  const lines = stderr.split('\n').map(line => line.trim());
  return (
    lines.find(line => line.startsWith('ERROR:')) ||
    lines.find(line => line.startsWith('error:')) ||
    lines.find(line => line.includes('"message"')) ||
    stderr.trim() ||
    'Unknown error (no stderr output)'
  );
}

/** Map a failed Codex run to an actionable error message. */
export function describeCodexFailure(stderr: string, timedOut: boolean, timeoutMs: number): string {
  if (timedOut) {
    const minutes = Math.round(timeoutMs / 60000);
    return (
      `Codex CLI timed out after ${timeoutMs}ms (~${minutes} min). ` +
      `Pass a larger \`timeout\` (ms) or set CODEX_MCP_TIMEOUT_MS. ` +
      `Your MCP client may enforce its own limit too (Claude Code: MCP_TOOL_TIMEOUT).`
    );
  }

  const errorLine = extractErrorLine(stderr);
  const lower = errorLine.toLowerCase();

  if (lower.includes("command 'codex' not found") || lower.includes('enoent')) {
    return 'Codex CLI not found. Install with: npm install -g @openai/codex (then restart your MCP client)';
  }
  if (lower.includes('unexpected argument') || lower.includes('invalid value')) {
    return (
      `Codex CLI rejected an argument: ${errorLine}. ` +
      `Your Codex CLI may be newer or older than this server expects; run \`codex --version\` and update one of them.`
    );
  }
  if (
    lower.includes('unsupported value') ||
    lower.includes('model is not') ||
    lower.includes('model_not_found') ||
    (lower.includes('not supported') && (lower.includes('model') || lower.includes('reasoning')))
  ) {
    return `Model error: ${errorLine}. Call the list-models tool to see models and reasoning levels your Codex CLI supports.`;
  }
  if (lower.includes('authentication') || lower.includes('unauthorized')) {
    return 'Authentication failed. Run "codex login" or set OPENAI_API_KEY';
  }
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('usage limit')) {
    return `Rate limit exceeded: ${errorLine}`;
  }
  if (
    lower.includes('sandbox policy') ||
    lower.includes('permission denied') ||
    lower.includes('blocked by sandbox')
  ) {
    return `Permission denied. Try adjusting sandbox mode or approval policy: ${errorLine}`;
  }
  return `Codex CLI failed: ${errorLine}`;
}

function toArgOptions(prompt: string, options: CodexExecOptions = {}): CodexArgOptions {
  const workingDir = resolveWorkingDirectory({
    workingDir: options.workingDir || options.cd,
    prompt,
  });
  if (workingDir) {
    Logger.debug(`Resolved working directory: ${workingDir}`);
  }
  return {
    model: options.model,
    reasoningEffort: options.reasoningEffort,
    fullAuto: options.fullAuto,
    approvalPolicy: options.approvalPolicy,
    approval: options.approval,
    sandboxMode: options.sandboxMode,
    yolo: options.yolo,
    workingDir,
    config: options.config,
    profile: options.profile,
    image: options.image,
    search: options.search,
    oss: options.oss,
    enableFeatures: options.enableFeatures,
    disableFeatures: options.disableFeatures,
  };
}

interface RunOptions {
  readonly timeoutMs: number;
  readonly maxOutputBytes?: number;
  readonly retry?: RetryOptions;
  readonly salvagePartial: boolean;
}

async function runCodex(
  invocation: CodexInvocation,
  run: RunOptions,
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const result = await executeCommandDetailed(CLI.COMMANDS.CODEX, invocation.args, {
    onProgress,
    timeoutMs: run.timeoutMs,
    maxOutputBytes: run.maxOutputBytes,
    retry: run.retry,
    stdin: invocation.stdin,
  });

  if (result.ok) {
    return selectCodexOutput(result.stdout, result.stderr);
  }

  if (run.salvagePartial && result.partialStdout && result.partialStdout.length > 1000) {
    Logger.warn('Command failed but partial output available, attempting to use it');
    return result.partialStdout;
  }

  const message =
    result.partialStdout !== undefined
      ? `Codex output exceeded the ${run.maxOutputBytes ?? 50 * 1024 * 1024}-byte limit and was stopped. Narrow the request.`
      : describeCodexFailure(result.stderr, result.timedOut, run.timeoutMs);
  Logger.error('Codex CLI execution failed:', message);
  throw new Error(message);
}

function resolveTimeout(options?: CodexExecOptions): number {
  return options?.timeout || options?.timeoutMs || defaultTimeoutMs();
}

/**
 * Execute `codex exec` (used by brainstorm). Salvages large partial output.
 */
export async function executeCodexCLI(
  prompt: string,
  options?: CodexExecOptions,
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const invocation = buildExecInvocation(prompt, toArgOptions(prompt, options));
  return runCodex(
    invocation,
    {
      timeoutMs: resolveTimeout(options),
      maxOutputBytes: options?.maxOutputBytes,
      retry: options?.retry,
      salvagePartial: true,
    },
    onProgress
  );
}

/**
 * Execute `codex exec` with the full option set (ask-codex, batch-codex).
 */
export async function executeCodex(
  prompt: string,
  options?: CodexExecOptions,
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const invocation = buildExecInvocation(prompt, toArgOptions(prompt, options));
  return runCodex(
    invocation,
    {
      timeoutMs: resolveTimeout(options),
      maxOutputBytes: options?.maxOutputBytes,
      retry: options?.retry,
      salvagePartial: false,
    },
    onProgress
  );
}

/**
 * Execute `codex review` against git changes in the working directory.
 */
export async function executeCodexReview(
  target: ReviewTarget,
  options?: CodexExecOptions,
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const invocation = buildReviewInvocation(target, toArgOptions(target.prompt || '', options));
  return runCodex(
    invocation,
    { timeoutMs: resolveTimeout(options), salvagePartial: false },
    onProgress
  );
}
