// antigravity-claude-mcp — MCP server
// ------------------------------------
// Exposes Google Antigravity's CLI (`agy`) to Claude Code (and any MCP client)
// as a single tool, `ask_antigravity`, so Claude can get an INDEPENDENT second
// opinion or code review from a different model family (default: Gemini 3 Pro).
//
// Zero runtime dependencies. Speaks MCP over newline-delimited JSON-RPC 2.0 on stdio.
//
// Environment overrides (all optional):
//   AGY_BIN      absolute path to the agy binary (otherwise auto-detected)
//   AGY_MODEL    model name as shown by `agy models`  (default: Gemini 3.1 Pro (High))
//   AGY_TIMEOUT  agy print-mode timeout               (default: 5m)

import { spawn } from 'node:child_process';
import { statSync, realpathSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const DEFAULT_MODEL = process.env.AGY_MODEL || 'Gemini 3.1 Pro (High)';
const PRINT_TIMEOUT = process.env.AGY_TIMEOUT || '5m';

// ---------------------------------------------------------------------------
// Locate the REAL Antigravity CLI. Note: on machines with the Antigravity IDE
// installed, plain `agy` on PATH is often a symlink into Antigravity.app (the
// Electron editor), which is NOT the CLI. We skip those and prefer the binary
// the official installer drops at ~/.local/bin/agy.
// ---------------------------------------------------------------------------
export function detectAgy() {
  if (process.env.AGY_BIN) return process.env.AGY_BIN;
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const candidates = [];
  if (home) candidates.push(join(home, '.local', 'bin', 'agy'));
  for (const dir of (process.env.PATH || '').split(':')) {
    if (dir) candidates.push(join(dir, 'agy'));
  }
  for (const c of candidates) {
    try {
      statSync(c); // must exist & be accessible
      let real = c;
      try { real = realpathSync(c); } catch { /* keep c */ }
      if (real.includes('Antigravity.app')) continue; // that's the IDE, not the CLI
      return c;
    } catch { /* not here, keep looking */ }
  }
  return null;
}

const AGY = detectAgy();

function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
function ok(id, result) { send({ jsonrpc: '2.0', id, result }); }
function fail(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

const TOOLS = [
  {
    name: 'ask_antigravity',
    description:
      'Get an INDEPENDENT second opinion or code review from Google Antigravity ' +
      '(default model: Gemini 3.1 Pro High) — a different model family than Claude, ' +
      'so it is a real cross-check, not Claude reviewing Claude. Provide a `prompt`; ' +
      'optionally pass `paths` (absolute file or folder paths) and Antigravity will read ' +
      'the ENTIRE file/folder as context before answering. Use it to validate an approach ' +
      'before coding, get an alternative design, or review code for bugs / edge cases / style.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'The question, proposed approach, or code-review request.' },
        paths: { type: 'array', items: { type: 'string' }, description: 'Optional absolute paths to files or folders to give Antigravity as full context.' },
        model: { type: 'string', description: 'Optional model override (e.g. "Claude Opus 4.6 (Thinking)", "GPT-OSS 120B (Medium)"). Default: Gemini 3.1 Pro (High).' },
      },
      required: ['prompt'],
    },
  },
];

function runAgy({ prompt, paths = [], model }) {
  return new Promise((resolve) => {
    if (!AGY) {
      return resolve({
        success: false,
        text:
          'Antigravity CLI (`agy`) not found. Install it with:\n' +
          '  curl -fsSL https://antigravity.google/cli/install.sh | bash\n' +
          'then sign in once with:  ~/.local/bin/agy -p "ping" --print-timeout 5m\n' +
          '(or set AGY_BIN to its absolute path).',
      });
    }
    const dirs = new Set();
    for (const p of paths) {
      try { dirs.add(statSync(p).isDirectory() ? p : dirname(p)); } catch { /* unreadable: skip */ }
    }
    const fullPrompt = paths.length
      ? `Context files/folders to read and consider in full:\n${paths.map((p) => `- ${p}`).join('\n')}\n\n${prompt}`
      : prompt;

    const args = ['-p', fullPrompt, '--model', model || DEFAULT_MODEL, '--print-timeout', PRINT_TIMEOUT, '--dangerously-skip-permissions'];
    for (const d of dirs) args.push('--add-dir', d);

    const child = spawn(AGY, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => resolve({ success: false, text: `Failed to launch agy (${AGY}): ${e.message}` }));
    child.on('close', (code) => {
      const text = out.trim() || err.trim() || `(agy produced no output; exit code ${code})`;
      resolve({ success: code === 0, text });
    });
  });
}

export function startServer() {
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', async (line) => {
    line = line.trim();
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    const { id, method, params } = msg;

    // Notifications carry no id and expect no reply.
    if (method === 'notifications/initialized' || method === 'initialized') return;

    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: params?.protocolVersion || '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'antigravity', version: pkg.version },
        });
      case 'ping':
        return ok(id, {});
      case 'tools/list':
        return ok(id, { tools: TOOLS });
      case 'tools/call': {
        const name = params?.name;
        const args = params?.arguments || {};
        if (name !== 'ask_antigravity') return fail(id, -32602, `Unknown tool: ${name}`);
        if (!args.prompt) return fail(id, -32602, 'Missing required argument: prompt');
        const { success, text } = await runAgy(args);
        return ok(id, { content: [{ type: 'text', text }], isError: !success });
      }
      default:
        if (id !== undefined) fail(id, -32601, `Method not found: ${method}`);
    }
  });
}
