#!/usr/bin/env node
// antigravity-claude-mcp CLI
// --------------------------
// No args (how MCP clients launch it): run the MCP server on stdio.
// `install`   : register this server with Claude Code (claude mcp add).
// `uninstall` : remove it from Claude Code.
// `doctor`    : check that the Antigravity CLI is found and authenticated.

import { spawnSync } from 'node:child_process';
import { startServer, detectAgy } from '../src/server.mjs';

const [, , cmd] = process.argv;

function run(command, args) {
  return spawnSync(command, args, { stdio: 'inherit', encoding: 'utf8' });
}

if (!cmd) {
  // Launched by an MCP client over stdio — be a server, print nothing else.
  startServer();
} else if (cmd === 'install') {
  // npx-based registration: Claude Code will re-launch us via npx on demand.
  const r = run('claude', ['mcp', 'add', 'antigravity', '-s', 'user', '--', 'npx', '-y', 'antigravity-claude-mcp']);
  if (r.status === 0) {
    console.log('\n✅ Registered "antigravity" with Claude Code (user scope).');
    console.log('   Restart Claude Code, then run /mcp to approve the ask_antigravity tool.');
  } else {
    console.error('\n❌ Could not run `claude mcp add`. Is the Claude Code CLI installed and on PATH?');
    process.exit(1);
  }
} else if (cmd === 'uninstall') {
  run('claude', ['mcp', 'remove', 'antigravity', '-s', 'user']);
} else if (cmd === 'doctor') {
  const agy = detectAgy();
  if (!agy) {
    console.error('❌ Antigravity CLI (agy) not found.');
    console.error('   Install:  curl -fsSL https://antigravity.google/cli/install.sh | bash');
    process.exit(1);
  }
  console.log(`✓ Found agy: ${agy}`);
  console.log('… testing headless auth (this calls the model, may take ~30s)');
  const r = spawnSync(agy, ['-p', 'Reply with exactly one word: PONG', '--print-timeout', '90s'], { encoding: 'utf8' });
  const out = (r.stdout || '').trim();
  if (out.includes('PONG')) {
    console.log('✅ Authenticated and responding. You are good to go.');
  } else {
    console.error('⚠️  agy did not return a clean response. Sign in once with:');
    console.error(`     ${agy} -p "ping" --print-timeout 5m`);
    console.error('   then follow the Google login link it prints.');
    if (out) console.error('   --- agy output ---\n' + out);
    process.exit(1);
  }
} else {
  console.error(`Unknown command: ${cmd}`);
  console.error('Usage: antigravity-claude-mcp [install|uninstall|doctor]');
  process.exit(1);
}
