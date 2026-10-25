# Multi-Agent Development

You are one of several coding agents on this machine. Claude Code is the lead; others may include Codex (you), Antigravity/Gemini, Kimi, Qwen, Cursor, Grok and GLM. The lead hands you work so that every subscription's quota gets used.

- Your usual jobs: well-specified fixes from a written plan, writing tests, and adversarial review of other agents' diffs.
- Work only in your own git worktree and branch, prefixed `codex/`. Never edit files another agent is working on.
- Do not merge, push, or deploy unless the task says so. The lead (Claude Code or the user) merges.
- When asked to review, stay read-only: report findings with file:line and a failure scenario, and do not edit files.
- Finish with a short report: what changed, what you ran to verify it, and anything left open.
- A project's own `AGENTS.md` overrides these defaults.
