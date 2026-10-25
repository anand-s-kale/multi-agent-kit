#!/usr/bin/env node
// Claude Code status line for multi-agent-kit.
// Claude Code sends session JSON on stdin; for Pro/Max accounts it includes
// rate_limits.five_hour / seven_day. We save that for `mak status` and print
// a one-line summary. With --save-only, nothing is printed (for chaining
// behind another status line).

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const usageFile = join(homedir(), '.multi-agent-kit', 'usage', 'claude.json');
const saveOnly = process.argv.includes('--save-only');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  let data = {};
  try { data = JSON.parse(input); } catch { /* not JSON: print nothing useful */ }

  const incoming = data.rate_limits;
  if (incoming && (incoming.five_hour || incoming.seven_day)) {
    // A window can be missing from one payload; keep the last known value for it.
    let previous = {};
    try { if (existsSync(usageFile)) previous = JSON.parse(readFileSync(usageFile, 'utf8')).rate_limits ?? {}; } catch { /* start fresh */ }
    const rate_limits = { ...previous, ...incoming };
    mkdirSync(dirname(usageFile), { recursive: true });
    writeFileSync(usageFile, JSON.stringify({ saved_at: new Date().toISOString(), rate_limits }, null, 2));
  }

  if (saveOnly) return;
  const model = data.model?.display_name ?? 'Claude';
  const pct = (w) => (w?.used_percentage != null ? `${Math.round(w.used_percentage)}%` : '–');
  const rl = incoming ?? {};
  process.stdout.write(`[${model}] 5h ${pct(rl.five_hour)} · 7d ${pct(rl.seven_day)}`);
});
