# Handoff — multi-agent-kit

**Started:** 2026-10-24 in a QuickComm session. **Moved here:** 2026-10-25.
**Owner:** Anand. Windows 11.

Paste this into any Claude or other agent to continue the work.

## Why this exists
Anand pays for Claude Max, ChatGPT Pro (Codex) and Google AI Pro (Antigravity), but was only using Claude. The setup was first built inside the QuickComm repo. It belongs to every project, so it moved into this repo.

## Done and verified
- **Codex CLI** upgraded to **0.164.0** with `npm install -g @openai/codex@0.164.0`. Signed in with ChatGPT. `codex exec` returned `CODEX OK`.
  - The old standalone 0.139 rejected every current model ("not supported with a ChatGPT account" / "requires a newer version"). Its `codex update` failed with a bad package archive.
  - 0.164 removed `codex mcp-server`, so the Codex MCP registration was **removed**. Claude now calls Codex through the CLI (`codex review`, `codex exec`).
- **Antigravity `agy` CLI** installed from Google's official script and signed in. Bridge `doctor` passed: *Authenticated and responding*.
- **Antigravity bridge** `antigravity-claude-mcp@0.1.0`: source reviewed, pinned copy in `bridges/`, registered as user-scope MCP `antigravity` with `AGY_BIN`. Status: Connected. Tool: `ask_antigravity`.
- **Global Claude config**:
  - `~/.claude/rules/multi-agent.md` (roles, how to call Codex, rules)
  - `~/.claude/agents/sonnet-builder.md` (Sonnet implementer)
  - `~/.claude/agents/cross-model-reviewer.md` (Codex CLI + Gemini review, findings verified)
  - The existing `~/.claude/agents/context-explorer.md` (Haiku) covers the Haiku tier.
- **Global Codex and Antigravity rules**: managed blocks in `~/.codex/AGENTS.md` and `~/.gemini/GEMINI.md`.
- **QuickComm**: the `AGENTS.md` "Multi-Agent Roles" section is committed there as `266c00bb0`, not pushed. A QuickComm-specific handoff is in that repo at `docs/MULTI-AGENT-SETUP-HANDOFF.md`, not committed. It predates the Codex MCP removal.

## Not yet verified
- `install.ps1` re-run end to end in a fresh shell.
- `cross-model-reviewer` used on a real diff.
- `ask_antigravity` called from inside a Claude session. Only `doctor` was run.
- Whether Antigravity reads `~/.gemini/GEMINI.md` as global rules. Check in the IDE's rules panel.

## Next steps
1. Open a new Claude Code session in this repo and run the checks in `README.md` → "Check it works".
2. Try `cross-model-reviewer` on a QuickComm branch.
3. Decide whether to push this repo to GitHub (private).
4. Optional: remove the standalone Codex 0.139 so plain `codex` resolves to 0.164.
5. Optional: try Vibe Kanban (`npx vibe-kanban`), see `docs/consoles.md`.
6. Optional: patch the bridge to drop `--dangerously-skip-permissions` and check whether read-only review still works.
7. Update QuickComm's `docs/MULTI-AGENT-SETUP-HANDOFF.md` to say Codex is now called through the CLI, not MCP, or point it at this repo.

## Paths
| Thing | Path |
|---|---|
| This repo | `C:\Users\Anand\OneDrive - Xalta Technology Services Pvt Ltd\Documents\GitHub\multi-agent-kit` |
| Codex CLI (use this) | `%APPDATA%\npm\codex.cmd` (0.164.0) |
| Old Codex (broken) | `%LOCALAPPDATA%\Programs\OpenAI\Codex\bin` → `~/.codex/packages/standalone` (0.139) |
| agy CLI | `%LOCALAPPDATA%\agy\bin\agy.exe` |
| Bridge (installed) | `~/.claude/mcp/antigravity-claude-mcp-0.1.0` |
| MCP registrations | `~/.claude.json`, user scope |
