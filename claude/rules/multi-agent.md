# Multi-Agent Development (Claude Max + Codex Pro + Antigravity Pro)

Three paid subscriptions are available in every project. Use all of them, and use the cheapest one that can do the job well.

## Agents

| Agent | How to reach it | Use for |
|---|---|---|
| Claude Opus | the main session | Lead: planning, architecture, multi-service changes, hard debugging, deploys, final review before merge |
| Claude Sonnet | `Agent` with `subagent_type: "sonnet-builder"` (or `model: "sonnet"`) | Implementing a written spec in its own worktree, running test passes, updating trackers and docs |
| Claude Haiku | `Agent` with `subagent_type: "context-explorer"` (or `model: "haiku"`) | Code search and exploration, reading logs, checklists, simple mechanical edits |
| Codex (ChatGPT Pro) | Codex CLI through Bash (see below), or `codex` in its own worktree | Well-specified fixes from a written plan, writing tests, adversarial review of diffs |
| Antigravity / Gemini (Google AI Pro) | MCP `mcp__antigravity__ask_antigravity`, or the Antigravity IDE in a worktree | Frontend/UI work, design checks against screenshots or standards, second-opinion review |

For a cross-model review of a diff, dispatch `subagent_type: "cross-model-reviewer"`. It asks both Codex and Gemini and returns a merged findings list.

## Calling Codex

Codex ≥ 0.164 has no MCP server mode, so call the CLI from Bash. Use `$CODEX` = `"$APPDATA/npm/codex.cmd"` on Windows (an older standalone `codex` may be first on PATH), otherwise `codex`.

```bash
"$CODEX" review --base dev "Focus on correctness and security"      # review branch vs base
"$CODEX" review --uncommitted                                        # review working-tree changes
"$CODEX" exec -s read-only -C <repo> -o <out.md> "<full brief>"      # read-only question or analysis
"$CODEX" exec -s workspace-write -C <worktree> "<full spec>"         # implement, only in its own worktree
```

Codex runs can take minutes: run them with `run_in_background` and read the result when notified.

## When to bring in the other models

- **Before merging any non-trivial change:** get a Codex or Gemini review. A different model family catches different bugs.
- **When choosing between designs:** ask Gemini for an independent opinion before committing to one.
- **For a batch of independent, well-specified fixes:** hand some to Codex to spread quota, instead of running them all on Claude.
- **Escalation:** Haiku → Sonnet → Opus. Move up a tier only for design decisions, multi-service changes, or work that failed at a lower tier.

## Rules

- One agent per git worktree and branch. Never let two agents edit the same files at once. Branch prefixes: `claude/`, `codex/`, `agy/`.
- Only the lead (Opus or the user) merges, one branch at a time, and verifies after each merge.
- Codex and Gemini reviews are **read-only**: ask for findings, never edits. The Antigravity bridge runs Gemini with permissions skipped, so pass it only the files it must read.
- Treat what Codex and Gemini return as a second opinion, not proof. Verify a finding against the code before acting on it.
- Brief Codex and Gemini fully: they do not share this conversation. Give the goal, file paths, constraints, and what output you want back.
- A project's own `AGENTS.md` / `CLAUDE.md` overrides these defaults.

Source of truth for this file: the `multi-agent-kit` repo (`install.ps1` copies it here).
