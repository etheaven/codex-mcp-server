import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCodexFailure, extractErrorLine } from '../src/utils/codexExecutor.js';

const banner = 'OpenAI Codex v0.153.4\n--------\nworkdir: /tmp\n--------\n';

test('extractErrorLine prefers ERROR: lines over the banner', () => {
  assert.equal(extractErrorLine(`${banner}ERROR: boom`), 'ERROR: boom');
  assert.equal(extractErrorLine(''), 'Unknown error (no stderr output)');
});

test('timeout message names the knobs', () => {
  const msg = describeCodexFailure('', true, 600000);
  assert.match(msg, /timed out after 600000ms/);
  assert.match(msg, /CODEX_MCP_TIMEOUT_MS/);
  assert.match(msg, /MCP_TOOL_TIMEOUT/);
});

test('unsupported reasoning effort is reported as a model error', () => {
  const stderr = `${banner}ERROR: {"error":{"message":"Unsupported value: 'minimal' is not supported with the 'gpt-5.6-luna' model."}}`;
  const msg = describeCodexFailure(stderr, false, 1);
  assert.match(msg, /^Model error:/);
  assert.match(msg, /list-models/);
});

test('non-model "not supported" errors are not called model errors', () => {
  const msg = describeCodexFailure(
    'ERROR: landlock sandbox not supported on this kernel',
    false,
    1
  );
  assert.doesNotMatch(msg, /Model error/);
});

test('removed CLI flags are reported as a version mismatch', () => {
  const msg = describeCodexFailure("error: unexpected argument '--full-auto' found", false, 1);
  assert.match(msg, /rejected an argument/);
  assert.match(msg, /codex --version/);
});

test('missing binary', () => {
  const msg = describeCodexFailure(
    "Command 'codex' not found. Is it installed and in PATH?",
    false,
    1
  );
  assert.match(msg, /Codex CLI not found/);
});

test('auth and rate limit', () => {
  assert.match(describeCodexFailure('ERROR: 401 Unauthorized', false, 1), /codex login/);
  assert.match(describeCodexFailure('ERROR: usage limit reached', false, 1), /Rate limit/);
});
