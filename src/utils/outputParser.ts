import { Logger } from './logger.js';

// Codex Output Interface
export interface CodexOutput {
  metadata: {
    version?: string;
    workdir?: string;
    model?: string;
    provider?: string;
    approval?: string;
    sandbox?: string;
    reasoning_effort?: string;
    reasoning_summaries?: string;
    [key: string]: string | undefined;
  };
  userInstructions: string;
  thinking?: string;
  response: string;
  tokensUsed?: number;
  timestamps: string[];
  rawOutput: string;
}

export function parseCodexOutput(rawOutput: string): CodexOutput {
  const normalizedOutput = rawOutput.trim();
  const lines = rawOutput.split('\n');
  const timestamps: string[] = [];
  let metadata: Record<string, string | undefined> = {};
  let thinking = '';
  let response = normalizedOutput;
  let tokensUsed: number | undefined;

  let currentSection: 'header' | 'metadata' | 'content' | 'userInstructions' | 'thinking' | 'response' =
    'header';
  let metadataLines: string[] = [];
  let userInstructionLines: string[] = [];
  let thinkingLines: string[] = [];
  let responseLines: string[] = [];
  let sawConversationRole = false;

  if (!hasStructuredCodexTranscript(lines)) {
    const output: CodexOutput = {
      metadata,
      userInstructions: '',
      thinking: undefined,
      response,
      tokensUsed,
      timestamps,
      rawOutput,
    };

    Logger.codexResponse(response, tokensUsed);
    return output;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Extract timestamps
    const timestampMatch = line.match(/^\[([^\]]+)\]/);
    if (timestampMatch) {
      timestamps.push(timestampMatch[1]);
    }

    // Extract tokens used
    if (trimmedLine) {
      const tokenMatch = parseTokensUsed(trimmedLine, lines[i + 1]);
      if (tokenMatch.tokensUsed !== undefined) {
        tokensUsed = tokenMatch.tokensUsed;
        if (tokenMatch.consumedNextLine) {
          i++;
        }
        continue;
      }
    }

    if (isDiagnosticLine(trimmedLine)) {
      continue;
    }

    if (isCodexHeader(trimmedLine)) {
      currentSection = 'header';
      continue;
    }

    if (isSeparator(trimmedLine)) {
      if (currentSection === 'header') {
        currentSection = 'metadata';
      } else if (currentSection === 'metadata') {
        currentSection = 'content';
      }
      continue;
    }

    if (isUserInstructionsHeader(trimmedLine)) {
      sawConversationRole = true;
      currentSection = 'userInstructions';
      continue;
    }

    if (isThinkingHeader(trimmedLine)) {
      sawConversationRole = true;
      currentSection = 'thinking';
      continue;
    }

    if (isResponseHeader(trimmedLine)) {
      sawConversationRole = true;
      currentSection = 'response';
      continue;
    }

    if (!trimmedLine) {
      switch (currentSection) {
        case 'userInstructions':
          appendBlankLine(userInstructionLines);
          break;
        case 'thinking':
          appendBlankLine(thinkingLines);
          break;
        case 'response':
          appendBlankLine(responseLines);
          break;
        case 'content':
          if (!sawConversationRole) {
            appendBlankLine(responseLines);
          }
          break;
      }
      continue;
    }

    // Parse based on current section
    switch (currentSection) {
      case 'metadata':
        if (trimmedLine) {
          metadataLines.push(trimmedLine);
        }
        break;
      case 'userInstructions':
        appendContentLine(userInstructionLines, line);
        break;
      case 'thinking':
        appendContentLine(thinkingLines, line);
        break;
      case 'response':
        appendContentLine(responseLines, line);
        break;
      case 'content':
        if (!sawConversationRole) {
          appendContentLine(responseLines, line);
        }
        break;
    }
  }

  // Parse metadata
  metadata = parseMetadata(metadataLines);
  thinking = thinkingLines.join('\n').trim();
  response = responseLines.join('\n').trim() || normalizedOutput;
  const userInstructions = userInstructionLines.join('\n').trim();

  const output: CodexOutput = {
    metadata,
    userInstructions,
    thinking: thinking || undefined,
    response,
    tokensUsed,
    timestamps,
    rawOutput,
  };

  Logger.codexResponse(response, tokensUsed);
  return output;
}

function parseMetadata(metadataLines: string[]): any {
  const metadata: Record<string, string | undefined> = {};

  for (const line of metadataLines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
      const value = line.substring(colonIndex + 1).trim();
      metadata[key] = value;
    }
  }

  return metadata;
}

function hasStructuredCodexTranscript(lines: string[]): boolean {
  return lines.some(line => {
    const trimmedLine = line.trim();
    return (
      isCodexHeader(trimmedLine) ||
      isSeparator(trimmedLine) ||
      isUserInstructionsHeader(trimmedLine) ||
      isResponseHeader(trimmedLine)
    );
  });
}

function isCodexHeader(line: string): boolean {
  return /OpenAI Codex|Codex CLI/i.test(line);
}

function isSeparator(line: string): boolean {
  return /^-{4,}\s*$/.test(line);
}

function isUserInstructionsHeader(line: string): boolean {
  return /^(user|user instructions:?)$/i.test(line);
}

function isThinkingHeader(line: string): boolean {
  return /^(thinking|reasoning|thinking:|reasoning:)$/i.test(line);
}

function isResponseHeader(line: string): boolean {
  return /^(codex|assistant|content|response|response:)$/i.test(line);
}

function isDiagnosticLine(line: string): boolean {
  if (!line) {
    return false;
  }

  return (
    /^\d{4}-\d{2}-\d{2}T.*\b(?:WARN|INFO|ERROR|DEBUG)\b/.test(line) ||
    /^mcp startup:/i.test(line)
  );
}

function parseTokensUsed(
  currentLine: string,
  nextLine?: string
): { tokensUsed?: number; consumedNextLine: boolean } {
  const inlineMatch = currentLine.match(/^tokens used:?\s*([\d,]+)$/i);
  if (inlineMatch) {
    return {
      tokensUsed: parseInt(inlineMatch[1].replace(/,/g, ''), 10),
      consumedNextLine: false,
    };
  }

  if (/^tokens used:?$/i.test(currentLine) && nextLine?.trim()) {
    const nextLineMatch = nextLine.trim().match(/^[\d,]+$/);
    if (nextLineMatch) {
      return {
        tokensUsed: parseInt(nextLineMatch[0].replace(/,/g, ''), 10),
        consumedNextLine: true,
      };
    }
  }

  return { consumedNextLine: false };
}

function appendContentLine(target: string[], line: string): void {
  target.push(line.trimEnd());
}

function appendBlankLine(target: string[]): void {
  if (target.length > 0 && target[target.length - 1] !== '') {
    target.push('');
  }
}

export function formatCodexResponse(
  output: CodexOutput,
  includeThinking: boolean = true,
  includeMetadata: boolean = true
): string {
  let formatted = '';
  const responseText = output.response.trim();

  // Add metadata summary if requested
  if (includeMetadata && (output.metadata.model || output.metadata.sandbox)) {
    formatted += `**Codex Configuration:**\n`;
    if (output.metadata.model) formatted += `- Model: ${output.metadata.model}\n`;
    if (output.metadata.sandbox) formatted += `- Sandbox: ${output.metadata.sandbox}\n`;
    if (output.metadata.approval) formatted += `- Approval: ${output.metadata.approval}\n`;
    formatted += '\n';
  }

  // Add thinking section if requested and available
  if (includeThinking && output.thinking) {
    formatted += `**Reasoning:**\n`;
    formatted += output.thinking + '\n\n';
  }

  // Add main response
  if (responseText && (includeMetadata || includeThinking)) {
    formatted += `**Response:**\n`;
  }
  formatted += responseText;

  // Add token usage if available
  if (output.tokensUsed) {
    formatted += `\n\n*Tokens used: ${output.tokensUsed}*`;
  }

  return formatted;
}

export function formatCodexResponseForMCP(
  result: string,
  includeThinking: boolean = true,
  includeMetadata: boolean = true
): string {
  // Try to parse the output first
  try {
    const parsed = parseCodexOutput(result);
    if (!parsed.response.trim()) {
      const fallbackOutput = parsed.rawOutput.trim();
      Logger.warn('Parsed Codex response was empty; returning raw output');
      return fallbackOutput || 'Warning: Codex returned an empty response.';
    }
    return formatCodexResponse(parsed, includeThinking, includeMetadata);
  } catch {
    // If parsing fails, return the raw output
    return result;
  }
}

export function extractCodeBlocks(text: string): string[] {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const matches = text.match(codeBlockRegex);
  return matches || [];
}

export function extractDiffBlocks(text: string): string[] {
  const diffRegex = /```diff[\s\S]*?```/g;
  const matches = text.match(diffRegex);
  return matches || [];
}

export function isErrorResponse(output: CodexOutput | string): boolean {
  const errorKeywords = [
    'error',
    'failed',
    'unable',
    'cannot',
    'authentication',
    'permission denied',
    'rate limit',
    'quota exceeded',
  ];

  const responseText =
    typeof output === 'string' ? output.toLowerCase() : output.response.toLowerCase();

  return errorKeywords.some(keyword => responseText.includes(keyword));
}
