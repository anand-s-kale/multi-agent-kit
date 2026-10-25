#!/usr/bin/env node
// mak — multi-agent-kit status and setup.
//
//   node mak.mjs status [--json] [--deep]   which coding agents are installed, signed in, and how much quota is left
//   node mak.mjs setup-statusline          point Claude Code's status line at statusline.mjs (only if none is set)
//
// The kit does not route work itself. The lead agent (Claude Code) reads this
// report and decides. Zero dependencies; Node 18+.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const adaptersDir = resolve(here, '..', 'adapters');
export const kitHome = join(homedir(), '.multi-agent-kit');
export const claudeUsageFile = join(kitHome, 'usage', 'claude.json');
const isWin = process.platform === 'win32';

function expand(p) {
  return p
    .replace(/^~(?=[\\/]|$)/, homedir())
    .replace(/%([A-Z_]+)%/gi, (_, v) => process.env[v] ?? `%${v}%`);
}

function run(cmd, args, timeoutMs = 20000) {
  // .cmd shims and bare names need a shell on Windows. Args only ever come
  // from adapter manifests, never from user input, so joining them is safe.
  const shell = isWin && (!/[\\/]/.test(cmd) || /\.cmd$/i.test(cmd));
  const opts = { encoding: 'utf8', timeout: timeoutMs, windowsHide: true };
  const r = shell
    ? spawnSync([`"${cmd}"`, ...args].join(' '), { ...opts, shell: true })
    : spawnSync(cmd, args, opts);
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
}

function resolveCommand(adapter) {
  const candidates = adapter.commands[isWin ? 'win32' : 'default'] ?? adapter.commands.default ?? [];
  for (const c of candidates) {
    const p = expand(c);
    if (/[\\/]/.test(p)) {
      if (existsSync(p)) return p;
    } else {
      const w = run(isWin ? 'where' : 'which', [p], 5000);
      if (w.ok && w.out) return w.out.split(/\r?\n/)[0].trim();
    }
  }
  return null;
}

function versionOf(cmd, adapter) {
  const r = run(cmd, adapter.versionArgs ?? ['--version']);
  return r.out.match(/\d+\.\d+\.\d+/)?.[0] ?? null;
}

function older(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i];
  return false;
}

function checkAuth(cmd, auth, deep) {
  switch (auth?.type) {
    case 'file': {
      try { return auth.key in JSON.parse(readFileSync(expand(auth.path), 'utf8')) ? 'signed in' : 'not signed in'; }
      catch { return 'not signed in'; }
    }
    case 'command': {
      if (auth.deep && !deep) return 'not checked (use --deep)';
      const r = run(cmd, auth.args, 60000);
      return r.out.toLowerCase().includes(auth.expect.toLowerCase()) ? 'signed in' : 'not signed in';
    }
    case 'env':
      return process.env[auth.var] ? `${auth.var} set` : `${auth.var} not set`;
    default:
      return 'unknown';
  }
}

function windowReading(w, label) {
  if (!w || w.used == null) return null;
  const now = Date.now() / 1000;
  if (w.resetsAt && w.resetsAt < now) return { label, usedPercent: 0, resetsAt: null, note: 'reset since last reading' };
  return { label, usedPercent: Math.round(w.used), resetsAt: w.resetsAt ? new Date(w.resetsAt * 1000).toISOString() : null };
}

function claudeUsage() {
  if (!existsSync(claudeUsageFile)) return { source: 'claude-statusline', windows: [], note: 'no reading yet: run `mak setup-statusline`, then use Claude Code once' };
  const saved = JSON.parse(readFileSync(claudeUsageFile, 'utf8'));
  const rl = saved.rate_limits ?? {};
  const windows = [
    windowReading({ used: rl.five_hour?.used_percentage, resetsAt: rl.five_hour?.resets_at }, '5h'),
    windowReading({ used: rl.seven_day?.used_percentage, resetsAt: rl.seven_day?.resets_at }, '7d'),
  ].filter(Boolean);
  return { source: 'claude-statusline', readAt: saved.saved_at, windows };
}

function newestFile(dir) {
  // ~/.codex/sessions/YYYY/MM/DD/rollout-<timestamp>-<id>.jsonl: names sort by date.
  if (!existsSync(dir)) return null;
  const entries = readdirSync(dir).sort().reverse();
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      const f = newestFile(p);
      if (f) return f;
    } else if (e.endsWith('.jsonl')) {
      return p;
    }
  }
  return null;
}

function findKey(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) {
    const found = findKey(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

function codexUsage() {
  const file = newestFile(join(homedir(), '.codex', 'sessions'));
  if (!file) return { source: 'codex-sessions', windows: [], note: 'no Codex session logs yet: run Codex once' };
  const lines = readFileSync(file, 'utf8').trim().split(/\r?\n/).reverse();
  for (const line of lines) {
    if (!line.includes('"rate_limits"')) continue;
    let rl;
    try { rl = findKey(JSON.parse(line), 'rate_limits'); } catch { continue; }
    if (!rl) continue;
    const label = (w) => (w?.window_minutes === 300 ? '5h' : w?.window_minutes === 10080 ? '7d' : `${w?.window_minutes}m`);
    const windows = [rl.primary, rl.secondary]
      .filter(Boolean)
      .map((w) => windowReading({ used: w.used_percent, resetsAt: w.resets_at }, label(w)))
      .filter(Boolean);
    return { source: 'codex-sessions', readAt: statSync(file).mtime.toISOString(), windows };
  }
  return { source: 'codex-sessions', windows: [], note: 'latest Codex session has no rate-limit data' };
}

function usageFor(adapter) {
  switch (adapter.usage?.source) {
    case 'claude-statusline': return claudeUsage();
    case 'codex-sessions': return codexUsage();
    default: return { source: 'none', windows: [], note: 'not exposed by this CLI' };
  }
}

function loadAdapters() {
  return readdirSync(adaptersDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(adaptersDir, f), 'utf8')));
}

function status({ json, deep }) {
  const report = loadAdapters().map((a) => {
    const path = resolveCommand(a);
    if (!path) return { id: a.id, name: a.name, installed: false, adapterStatus: a.status, install: a.install };
    const version = versionOf(path, a);
    const outdated = Boolean(a.minVersion && version && older(version, a.minVersion));
    return {
      id: a.id,
      name: a.name,
      installed: true,
      path,
      version,
      outdated,
      minVersion: a.minVersion,
      auth: checkAuth(path, a.auth, deep),
      usage: usageFor(a),
      adapterStatus: a.status,
      run: a.run,
      strengths: a.strengths,
      notes: a.notes,
    };
  });

  if (json) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), agents: report }, null, 2));
    return;
  }
  for (const r of report) {
    if (!r.installed) {
      console.log(`- ${r.id.padEnd(12)} not installed${r.adapterStatus === 'untested' ? ' (adapter untested)' : ''}`);
      continue;
    }
    const quota = r.usage.windows.length
      ? r.usage.windows.map((w) => `${w.label} ${w.usedPercent}% used${w.resetsAt ? `, resets ${w.resetsAt.slice(0, 16).replace('T', ' ')}Z` : ''}${w.note ? ` (${w.note})` : ''}`).join(' | ')
      : r.usage.note;
    console.log(`+ ${r.id.padEnd(12)} v${r.version ?? '?'}${r.outdated ? ` (OUTDATED, need >= ${r.minVersion})` : ''} | ${r.auth} | ${quota}`);
  }
}

function setupStatusline() {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const settings = existsSync(settingsPath) ? JSON.parse(readFileSync(settingsPath, 'utf8')) : {};
  const command = `node "${join(here, 'statusline.mjs')}"`;
  if (settings.statusLine) {
    console.log(`Claude Code already has a status line: ${JSON.stringify(settings.statusLine)}`);
    console.log(`Left unchanged. To record Claude usage, pipe its input through: ${command} --save-only`);
    return;
  }
  settings.statusLine = { type: 'command', command };
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log(`Status line set in ${settingsPath}`);
}

const [, , cmd, ...rest] = process.argv;
if (cmd === 'status') status({ json: rest.includes('--json'), deep: rest.includes('--deep') });
else if (cmd === 'setup-statusline') setupStatusline();
else {
  console.log('Usage: mak status [--json] [--deep] | mak setup-statusline');
  process.exit(cmd ? 1 : 0);
}
