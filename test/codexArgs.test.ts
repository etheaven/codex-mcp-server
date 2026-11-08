import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecInvocation,
  buildReviewInvocation,
  configArgs,
  safetyArgs,
  CONCISE_PREFIX,
} from '../src/utils/codexArgs.js';

test('exec: prompt goes via stdin and ends with exec --skip-git-repo-check -', () => {
  const inv = buildExecInvocation('explain @src', {});
  assert.deepEqual(inv.args, ['exec', '--skip-git-repo-check', '-']);
  assert.equal(inv.stdin, `${CONCISE_PREFIX}explain @src`);
});

test('exec: never emits the removed --full-auto flag', () => {
  const inv = buildExecInvocation('x', { fullAuto: true });
  assert.ok(!inv.args.includes('--full-auto'));
  assert.deepEqual(inv.args.slice(0, 2), ['--sandbox', 'workspace-write']);
});

test('exec: explicit sandboxMode wins over fullAuto default', () => {
  assert.deepEqual(safetyArgs({ fullAuto: true, sandboxMode: 'read-only' }), [
    '--sandbox',
    'read-only',
  ]);
});

test('exec: approval without sandbox defaults to workspace-write', () => {
  assert.deepEqual(safetyArgs({ approvalPolicy: 'never' }), [
    '--ask-for-approval',
    'never',
    '--sandbox',
    'workspace-write',
  ]);
});

test('exec: search uses top-level --search, not the deprecated feature flag', () => {
  const inv = buildExecInvocation('x', { search: true });
  assert.ok(inv.args.includes('--search'));
  assert.ok(!inv.args.includes('web_search_request'));
  assert.ok(!inv.args.includes('--sandbox'), 'search must not force a writable sandbox');
  assert.ok(inv.args.indexOf('--search') < inv.args.indexOf('exec'), '--search is a global flag');
});

test('exec: yolo excludes sandbox and approval', () => {
  assert.deepEqual(safetyArgs({ yolo: true }), ['--dangerously-bypass-approvals-and-sandbox']);
  assert.throws(() => safetyArgs({ yolo: true, sandboxMode: 'read-only' }), /yolo/);
  assert.throws(() => safetyArgs({ yolo: true, approval: 'never' }), /yolo/);
});

test('exec: model, reasoning effort, cwd, images and features', () => {
  const inv = buildExecInvocation('x', {
    model: 'gpt-5.6-terra',
    reasoningEffort: 'max',
    workingDir: '/repo',
    image: ['a.png', 'b.png'],
    enableFeatures: ['f1'],
    disableFeatures: ['f2'],
  });
  const a = inv.args;
  assert.deepEqual(a.slice(a.indexOf('-m'), a.indexOf('-m') + 2), ['-m', 'gpt-5.6-terra']);
  assert.ok(a.includes('model_reasoning_effort="max"'));
  assert.deepEqual(a.slice(a.indexOf('--cd'), a.indexOf('--cd') + 2), ['--cd', '/repo']);
  assert.equal(a.filter(x => x === '-i').length, 2);
  assert.ok(a.indexOf('-i') > a.indexOf('exec'), 'greedy -i must come after exec');
  assert.ok(a.includes('f1') && a.includes('f2'));
  assert.ok(a.indexOf('-m') < a.indexOf('exec'));
});

test('exec: images go after exec and never directly before exec or -', () => {
  const a = buildExecInvocation('x', { image: '/tmp/a.png' }).args;
  assert.deepEqual(a, ['exec', '-i', '/tmp/a.png', '--skip-git-repo-check', '-']);
});

test('config object becomes one -c per key with TOML values', () => {
  assert.deepEqual(configArgs({ model_verbosity: 'low', 'tools.view_image': true, n: 3 }), [
    '-c',
    'model_verbosity="low"',
    '-c',
    'tools.view_image=true',
    '-c',
    'n=3',
  ]);
  assert.deepEqual(configArgs('a=b'), ['-c', 'a=b']);
  assert.deepEqual(configArgs(undefined), []);
});

test('review: target flags, no prompt', () => {
  const inv = buildReviewInvocation({ uncommitted: true }, { workingDir: '/repo' });
  assert.deepEqual(inv.args, ['--cd', '/repo', 'review', '--uncommitted']);
  assert.equal(inv.stdin, '');
  assert.deepEqual(buildReviewInvocation({ base: 'main', title: 'T' }).args, [
    'review',
    '--base',
    'main',
    '--title',
    'T',
  ]);
});

test('review: prompt-only goes via stdin', () => {
  const inv = buildReviewInvocation({ prompt: 'check auth code' });
  assert.deepEqual(inv.args, ['review', '-']);
  assert.equal(inv.stdin, 'check auth code');
});

test('review: rejects combinations Codex CLI rejects', () => {
  assert.throws(() => buildReviewInvocation({ uncommitted: true, prompt: 'x' }), /together/);
  assert.throws(() => buildReviewInvocation({ base: 'main', commit: 'abc' }), /one review target/);
  assert.throws(() => buildReviewInvocation({}), /Nothing to review/);
});
