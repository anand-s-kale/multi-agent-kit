# Multi-Agent Development: use every subscription on this machine

The user pays for several AI coding subscriptions. Each one's quota resets on a schedule whether it is used or not. You (Claude Code) are the lead: plan the work, then spread it across the agents so that quota which would otherwise expire gets used, and Claude's own quota is kept for the work only Claude should do.

## Step 1: check what is available

Before delegating, or when the user asks what is available:

```bash
node ~/.multi-agent-kit/bin/mak.mjs status          # one line per agent
node ~/.multi-agent-kit/bin/mak.mjs status --json   # full detail incl. run commands
```

For each agent it shows: installed or not, version, sign-in, and usage windows (percent used + reset time) where the CLI exposes them. Claude and Codex report real numbers. Others show "not exposed": treat them as available until a run fails with a quota or rate-limit error, then avoid that agent until later.

## Step 2: decide

There is no fixed routing table. Weigh these in order:
1. **Fit:** can this agent do the task well? See `strengths` in the status JSON and the roles below.
2. **Expiring quota:** prefer an agent with plenty of quota left that **resets soon**, since that quota is lost otherwise.
3. **Claude's headroom:** if Claude's 5h or 7d window is high, delegate more; keep Opus for design, cross-cutting changes, and final review.
4. **Cost of being wrong:** risky or multi-service work stays with Claude, or gets a cross-model review.

Say in one line which agent you picked and why, for example "Codex: 5h window 10% used and resets in 2h, test writing fits it."

## Default roles

| Agent | Reach it through | Good for |
|---|---|---|
| Claude Opus | the main session | Lead: planning, architecture, multi-service changes, hard debugging, final review |
| Claude Sonnet | `Agent` with `subagent_type: "sonnet-builder"` | Implementing a written spec, test passes, docs and tracker updates |
| Claude Haiku | `Agent` with `subagent_type: "context-explorer"` (or `model: "haiku"`) | Code search, reading logs, mechanical edits |
| Codex | CLI via Bash, `run` commands in `status --json` | Spec'd fixes, tests, adversarial review |
| Antigravity / Gemini | MCP `mcp__antigravity__ask_antigravity`, or `agy -p` | UI work, design checks, second opinions |
| Kimi, Qwen, Cursor, Grok, GLM | CLI via Bash, `run` commands in `status --json` | Extra capacity for spec'd tasks and reviews when installed |

For a cross-model review before merging, dispatch `subagent_type: "cross-model-reviewer"`.

## Calling a CLI agent

- Take the command from `run.read` / `run.write` / `run.review` in `status --json`, using the `path` it reports. On Windows the bare `codex` may be an old copy; `path` is the right one.
- Fill `{prompt}`, `{cwd}`, `{model}`, `{base}`. Write the prompt as a complete brief: goal, files, constraints, expected output. The other agent has none of this conversation.
- Runs take minutes: use `run_in_background` and read the result when notified.
- Adapters marked `untested` may need flag fixes. If one fails, read `<cli> --help`, fix the command, and tell the user so the adapter can be corrected.

## Rules

- One agent per git worktree and branch; never two agents on the same files. Branch prefixes: `claude/`, `codex/`, `agy/`, `<agent-id>/`.
- Only the lead (you or the user) merges, one branch at a time, and verifies after each merge.
- Reviews by other agents are read-only: ask for findings, never edits. The Antigravity bridge runs Gemini with permissions skipped, so pass it only the files it must read.
- Treat other agents' output as a second opinion, not proof. Verify against the code before acting on it.
- Only drive each vendor's own CLI with the user's own login or key. Never share, proxy or extract credentials.
- A project's own `AGENTS.md` / `CLAUDE.md` overrides these defaults.

Source: the multi-agent-kit repo. `install.ps1` copies this file here.
