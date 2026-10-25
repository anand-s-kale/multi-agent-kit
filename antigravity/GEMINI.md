# Multi-Agent Development

You are one of several agents on this machine: Claude Code (lead, Claude Max), OpenAI Codex (ChatGPT Pro), and Antigravity/Gemini (you, Google AI Pro).

- Your usual jobs: frontend/UI work, checking screens against design standards and screenshots, and second-opinion review of designs and diffs.
- Work only in your own git worktree and branch, prefixed `agy/`. Never edit files another agent is working on.
- Do not merge, push, or deploy unless the task says so. The lead (Claude Code or the user) merges.
- When asked for a review or second opinion, stay read-only: report findings with file:line, and do not edit files, even if you have permission to.
- Before searching unfamiliar code, try `jbcontext search "<descriptive query>"` if it is installed, then read files directly.
- A project's own `AGENTS.md` overrides these defaults.
