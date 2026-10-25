import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const usage = 'Usage: mak log add --agent <id> --task "<text>" [--model <name>]';

function fixture(t) {
  const home = fs.mkdtempSync(join(tmpdir(), 'mak-log-test-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const run = (...args) => {
    const result = spawnSync(process.execPath, ['bin/mak.mjs', 'log', ...args], {
      cwd, env: { ...process.env, MAK_HOME: home }, encoding: 'utf8',
      timeout: 15000, windowsHide: true,
    });
    assert.ifError(result.error);
    assert.equal(result.signal, null);
    return result;
  };
  const write = (name, contents) => {
    fs.mkdirSync(join(home, 'usage'), { recursive: true });
    fs.writeFileSync(join(home, 'usage', name), contents);
  };
  const json = (...args) => {
    const result = run('--json', ...args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const entries = JSON.parse(result.stdout);
    assert.equal(result.stdout.trimEnd(), JSON.stringify(entries, null, 2));
    return entries;
  };
  const add = (task, ...args) => {
    const result = run('add', '--agent', 'qwen', '--task', task, ...args);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(result.stderr, '');
    return result;
  };
  return { home, run, write, json, add };
}

test('missing ledger prints the exact empty log message', (t) => {
  const { run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trimEnd(), 'No delegations logged yet.');
  assert.equal(result.stderr, '');
});

test('empty ledger prints the exact empty log message', (t) => {
  const { run, write } = fixture(t);
  write('ledger.jsonl', '');
  const result = run();
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trimEnd(), 'No delegations logged yet.');
  assert.equal(result.stderr, '');
});

test('add acknowledges success and lists agent and task in a table', (t) => {
  const { add, run } = fixture(t);
  assert.equal(add('write ledger tests').stdout.trimEnd(), 'logged #1: qwen - write ledger tests');
  const result = run();
  assert.equal(result.status, 0);
  const lines = result.stdout.trimEnd().split(/\r?\n/);
  assert.equal(lines[0].replace(/ +/g, ' '), '# time (UTC) agent model quota at dispatch task');
  assert.match(lines[1], /^1 +\d{4}-\d{2}-\d{2} \d{2}:\d{2} +qwen +- +- +write ledger tests$/);
});

test('entry numbers increment and persist as JSONL', (t) => {
  const { home, add } = fixture(t);
  add('first');
  assert.equal(add('second').stdout.trimEnd(), 'logged #2: qwen - second');
  const entries = fs.readFileSync(join(home, 'usage', 'ledger.jsonl'), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  assert.deepEqual(entries.map(({ n, task }) => ({ n, task })), [{ n: 1, task: 'first' }, { n: 2, task: 'second' }]);
});

test('--json returns pretty printed entries with all ledger fields and optional model', (t) => {
  const { add, json } = fixture(t);
  const before = Date.now();
  add('task with spaces');
  add('model task', '--model', 'example-model');
  const entries = json();
  assert.equal(entries.length, 2);
  assert.deepEqual(Object.keys(entries[0]).sort(), ['agent', 'at', 'model', 'n', 'quota', 'task']);
  assert.equal(entries[0].n, 1);
  assert.equal(entries[0].agent, 'qwen');
  assert.equal(entries[0].task, 'task with spaces');
  assert.equal(entries[0].model, null);
  assert.deepEqual(entries[0].quota, []);
  assert.equal(new Date(entries[0].at).toISOString(), entries[0].at);
  assert.ok(Date.parse(entries[0].at) >= before && Date.parse(entries[0].at) <= Date.now());
  assert.equal(entries[1].model, 'example-model');
});

test('default selects the last 20 entries and --limit selects the newest N oldest first', (t) => {
  const { write, json, run } = fixture(t);
  const entries = Array.from({ length: 23 }, (_, i) => ({
    n: i + 1, at: '2026-10-25T18:10:00.000Z', agent: 'qwen', model: null, quota: [], task: `task ${i + 1}`,
  }));
  write('ledger.jsonl', entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
  assert.deepEqual(json().map((entry) => entry.n), entries.slice(-20).map((entry) => entry.n));
  assert.deepEqual(json('--limit', '2'), entries.slice(-2));
  const result = run('--limit', '2');
  assert.equal(result.status, 0);
  assert.deepEqual(result.stdout.trimEnd().split(/\r?\n/).slice(1).map((line) => Number(line.match(/^\d+/)[0])), [22, 23]);
});

test('table formats UTC time, model, quota windows and truncates long tasks', (t) => {
  const { write, run } = fixture(t);
  write('ledger.jsonl', JSON.stringify({
    n: 1, at: '2026-10-25T18:10:00.000Z', agent: 'claude', model: 'example-model',
    quota: [{ label: '5h', usedPercent: 12, resetsAt: null }, { label: '7d', usedPercent: 64, resetsAt: null }],
    task: 'x'.repeat(80),
  }) + '\n');
  const result = run();
  assert.equal(result.status, 0);
  const row = result.stdout.trimEnd().split(/\r?\n/)[1];
  assert.match(row, /^1 +2026-10-25 18:10 +claude +example-model +5h 12% \| 7d 64% +x+…$/);
  const displayedTask = row.match(/(x+…)$/)[1];
  assert.ok(displayedTask.length >= 60 && displayedTask.length <= 61);
});

test('unknown agent exits 1 with the exact error', (t) => {
  const { run } = fixture(t);
  const result = run('add', '--agent', 'not-an-adapter', '--task', 'test');
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trimEnd(), 'unknown agent: not-an-adapter');
});

test('missing --task exits 1 with the exact usage', (t) => {
  const { run } = fixture(t);
  const result = run('add', '--agent', 'qwen');
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trimEnd(), usage);
});

test('missing --agent exits 1 with the exact usage', (t) => {
  const { run } = fixture(t);
  const result = run('add', '--task', 'test');
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trimEnd(), usage);
});

test('claude quota snapshots MAK_HOME cache at dispatch time', (t) => {
  const { write, run, json } = fixture(t);
  const reset = Math.floor(Date.now() / 1000) + 86400;
  const cache = (five, seven) => JSON.stringify({
    saved_at: new Date().toISOString(), rate_limits: {
      five_hour: { used_percentage: five, resets_at: reset },
      seven_day: { used_percentage: seven, resets_at: reset + 604800 },
    },
  });
  write('claude.json', cache(12, 64));
  const result = run('add', '--agent', 'claude', '--task', 'snapshot');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  write('claude.json', cache(99, 99));
  assert.deepEqual(json()[0].quota, [
    { label: '5h', usedPercent: 12, resetsAt: new Date(reset * 1000).toISOString() },
    { label: '7d', usedPercent: 64, resetsAt: new Date((reset + 604800) * 1000).toISOString() },
  ]);
});

test('antigravity without a cache logs empty quota without probing', (t) => {
  const { run, json } = fixture(t);
  const result = run('add', '--agent', 'antigravity', '--task', 'cached only');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(json()[0].quota, []);
});
