// Read Antigravity quota by running `agy` in a pseudo-terminal and typing
// /usage. The CLI has no scriptable quota command (print mode sends /usage to
// the model, and its local server needs a token), but the interactive screen
// shows weekly and 5-hour limits per model group. No model call is made.
//
// Needs @lydell/node-pty (installed by install.ps1 into ~/.multi-agent-kit).

import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

const strip = (s) => s
  .replace(/\x1b\[[0-9;?<>=]*[ -\/]*[@-~]/g, '')
  .replace(/\x1b\][^\x07]*\x07/g, '')
  .replace(/\x1b[()][A-Z0-9]/g, '');

// "Refreshes in 133h 2m" / "Refreshes in 45m" -> seconds
function durationSeconds(text) {
  const h = Number(text.match(/(\d+)h/)?.[1] ?? 0);
  const m = Number(text.match(/(\d+)m/)?.[1] ?? 0);
  return h * 3600 + m * 60;
}

export function parseUsageScreen(text, now = Date.now()) {
  const start = text.lastIndexOf('Models & Quota');
  if (start < 0) return null;
  const body = text.slice(start);
  const groups = [];
  const groupRe = /([A-Z][A-Z ]+MODELS)\s+Models within this group:([\s\S]*?)(?=[A-Z][A-Z ]+MODELS\s+Models within|│|$)/g;
  for (const g of body.matchAll(groupRe)) {
    const name = g[1].replace(/\s+MODELS$/, '').trim().toLowerCase().replace(/ and /g, '+').replace(/\s+/g, '-');
    const section = g[2];
    const windows = [];
    const winRe = /(Weekly|Five Hour) Limit Remaining[\s\S]*?([\d.]+)%\s*(Refreshes in [\dhm ]+|Quota available)?/g;
    for (const w of section.matchAll(winRe)) {
      const remaining = Number(w[2]);
      const resets = w[3]?.startsWith('Refreshes') ? new Date(now + durationSeconds(w[3]) * 1000).toISOString() : null;
      windows.push({ label: `${name} ${w[1] === 'Weekly' ? '7d' : '5h'}`, usedPercent: Math.round((100 - remaining) * 10) / 10, resetsAt: resets });
    }
    groups.push({ group: name, models: section.split(/Weekly|Five Hour/)[0].trim(), windows });
  }
  return groups.length ? groups : null;
}

export function readAgyUsage(agyPath, timeoutMs = 45000) {
  let pty;
  try { pty = require('@lydell/node-pty'); }
  catch { return Promise.resolve({ error: 'node-pty not installed: re-run install.ps1' }); }

  // An empty folder used only for this, so agy's one-time trust prompt never covers real code.
  const cwd = join(homedir(), '.multi-agent-kit', 'agy-probe');
  mkdirSync(cwd, { recursive: true });

  return new Promise((resolve) => {
    const term = pty.spawn(agyPath, [], { name: 'xterm-256color', cols: 140, rows: 80, cwd, env: process.env });
    let screen = '';
    let stage = 'start';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      try { term.write('\x1b'); } catch { /* already gone */ }
      setTimeout(() => { try { term.kill(); } catch { /* already gone */ } resolve(result); }, 300);
    };

    term.onData((d) => {
      screen += d;
      const text = strip(screen);
      const tail = text.slice(-600);
      if (stage === 'start' && text.includes('Do you trust the contents')) {
        stage = 'trusted';
        setTimeout(() => term.write('\r'), 300);
      }
      if ((stage === 'start' || stage === 'trusted') && /· (low|medium|high|xhigh|max)/.test(tail) && !tail.includes('Do you trust')) {
        stage = 'typing';
        setTimeout(() => term.write('/usage'), 1500);
        setTimeout(() => { term.write('\r'); stage = 'waiting'; }, 2300);
      }
      if (stage === 'waiting' && /(Refreshes in|Quota available)[\s\S]*Five Hour[\s\S]*(Refreshes in|Quota available)/.test(text.slice(text.lastIndexOf('Models & Quota')))) {
        stage = 'reading';
        setTimeout(() => {
          const groups = parseUsageScreen(strip(screen));
          finish(groups ? { groups } : { error: 'could not parse the /usage screen' });
        }, 1500);
      }
    });

    setTimeout(() => finish({ error: `timed out at stage "${stage}"` }), timeoutMs);
  });
}
