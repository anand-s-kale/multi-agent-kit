# multi-agent-kit

One setup that makes **Claude Code (Claude Max)**, **OpenAI Codex (ChatGPT Pro)** and **Google Antigravity / Gemini (Google AI Pro)** work together in every project on this machine, so none of the three subscriptions goes unused.

Claude Code is the lead. It plans, delegates, reviews and merges. Codex and Gemini are workers and second opinions.

## Roles

| Agent | Reached through | Use for |
|---|---|---|
| Claude Opus | main Claude Code session | Lead: planning, architecture, multi-service changes, hard debugging, deploys, final review |
| Claude Sonnet | `sonnet-builder` subagent | Implementing a written spec in its own worktree, test passes, docs and tracker updates |
| Claude Haiku | `context-explorer` subagent | Code search and exploration, log reading, simple mechanical edits |
| Codex | Codex CLI (`codex review`, `codex exec`) | Spec'd fixes, writing tests, adversarial review |
| Gemini (Antigravity) | MCP tool `ask_antigravity`, or the Antigravity IDE | UI work, design checks, second-opinion review |
| Codex + Gemini together | `cross-model-reviewer` subagent | Independent review of a diff by two other model families, merged and verified |

Cheapest tier that can do the job: Haiku → Sonnet → Opus. Bring in Codex or Gemini before merging anything non-trivial.

## What is in the repo

| Path | Installed to | Read by |
|---|---|---|
| `claude/rules/multi-agent.md` | `~/.claude/rules/` | Claude Code, every project |
| `claude/agents/sonnet-builder.md`, `cross-model-reviewer.md` | `~/.claude/agents/` | Claude Code, every project |
| `codex/AGENTS.md` | managed block in `~/.codex/AGENTS.md` | Codex, every project |
| `antigravity/GEMINI.md` | managed block in `~/.gemini/GEMINI.md` | Antigravity, every project |
| `bridges/antigravity-claude-mcp-0.1.0/` | `~/.claude/mcp/` + user-scope MCP `antigravity` | Claude Code |
| `docs/HANDOFF.md` | — | Anyone picking this up |
| `docs/consoles.md` | — | Choosing a dashboard for many agents |

Edit files here, then re-run the installer. The global copies are outputs, not the source.

## Install (Windows)

Prerequisites, once:

```powershell
npm install -g @openai/codex@latest
codex login
irm https://antigravity.google/cli/install.ps1 | iex
& "$env:LOCALAPPDATA\agy\bin\agy.exe" -p "ping" --print-timeout 5m
```

The first two commands install Codex and sign in with ChatGPT. The last two install the `agy` CLI and sign in with Google.

Then, from this folder:

```powershell
pwsh -File .\install.ps1
```

Start a new Claude Code session afterwards. Rules, subagents and MCP tools load when a session starts.

## Check it works

```powershell
claude mcp list
node "$HOME\.claude\mcp\antigravity-claude-mcp-0.1.0\bin\cli.mjs" doctor
& "$env:APPDATA\npm\codex.cmd" exec --skip-git-repo-check -s read-only "Reply with exactly: CODEX OK"
```

The first should list `antigravity` as Connected, and the second should say *Authenticated and responding*.

## Known issues

- **Codex has no MCP server any more.** `codex mcp-server` was removed by 0.164, so Claude calls the Codex CLI through Bash instead.
- **Old Codex on PATH.** A standalone Codex 0.139 (`%LOCALAPPDATA%\Programs\OpenAI\Codex\bin`) sits earlier on PATH and can't use the current ChatGPT models. Its own `codex update` fails. The rules use `%APPDATA%\npm\codex.cmd` explicitly. Removing the standalone copy, or moving `%APPDATA%\npm` earlier in PATH, makes plain `codex` work.
- **Antigravity bridge permissions.** It runs `agy` with `--dangerously-skip-permissions`, so pass it only the files it must read. It is pinned at 0.1.0 and kept here, not pulled with `npx`, so upstream changes can't arrive unreviewed.
- **Bridge on Windows.** Its PATH detection doesn't work on Windows, so `AGY_BIN` is set at registration.
