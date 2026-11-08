import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatModelList } from '../src/tools/list-models.tool.js';
import { truncateResponse } from '../src/utils/outputParser.js';
import { getToolDefinitions } from '../src/tools/index.js';
import { SERVER_VERSION } from '../src/version.js';
import { readFileSync } from 'node:fs';

const catalog = JSON.stringify({
  models: [
    {
      slug: 'model-a',
      description: 'Frontier',
      visibility: 'list',
      default_reasoning_level: 'low',
      supported_reasoning_levels: [{ effort: 'low' }, { effort: 'max' }],
    },
    { slug: 'hidden-b', visibility: 'hide', supported_reasoning_levels: [] },
  ],
});

test('list-models formats visible models with their reasoning levels', () => {
  const out = formatModelList(catalog, false);
  assert.match(out, /`model-a` — Frontier/);
  assert.match(out, /reasoningEffort: low, max \(default low\)/);
  assert.doesNotMatch(out, /hidden-b/);
  assert.match(formatModelList(catalog, true), /hidden-b/);
});

test('truncateResponse keeps short text and marks long text', () => {
  assert.equal(truncateResponse('short', 100), 'short');
  const long = 'line\n'.repeat(100);
  const out = truncateResponse(long, 100);
  assert.ok(out.length < long.length);
  assert.match(out, /Response truncated/);
});

test('tool registry exposes review and list-models with free-form model fields', () => {
  const tools = getToolDefinitions();
  const names = tools.map(t => t.name);
  for (const name of ['ask-codex', 'review', 'list-models', 'brainstorm', 'batch-codex']) {
    assert.ok(names.includes(name), `missing tool ${name}`);
  }
  const ask = tools.find(t => t.name === 'ask-codex')!;
  const props = ask.inputSchema.properties as Record<string, { type?: string; enum?: string[] }>;
  assert.equal(props.reasoningEffort.type, 'string');
  assert.equal(props.reasoningEffort.enum, undefined, 'reasoningEffort must not be a frozen enum');
});

test('server version comes from package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(SERVER_VERSION, pkg.version);
});
