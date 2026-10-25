# Consoles for managing many agents

Researched 2026-10-24. Windows is the constraint. None of these has been installed yet.

| Tool | Platforms | Agents | Notes |
|---|---|---|---|
| Claude desktop app (Code tab) | Win / Mac | Claude Code | Already in use. Parallel sessions, each in its own worktree, side by side. |
| **Vibe Kanban** | Win / Mac / Linux | Claude Code, Codex, Gemini CLI, OpenCode | **Recommended to try.** Open source. Kanban cards each run an agent in its own worktree, with diff review. Start with `npx vibe-kanban`. Antigravity not listed. Runs agents with permission prompts off by default, so review every diff. |
| Conductor | Mac only | Claude Code, Codex | The most cited, but not usable here. |
| Claude Squad | needs tmux (WSL) | Claude Code, Codex, others | Terminal UI with a worktree per task. |
| dmux, ccmanager | needs tmux (WSL) | several | Terminal tools with worktree support. |
| Superset | desktop | Claude Code, Codex, OpenCode | IDE-style dashboard. Not checked on Windows. |

Sources:
- https://www.vibekanban.com/docs/getting-started
- https://dev.to/stravukarl/best-tools-for-managing-parallel-ai-coding-agents-in-2026-14l8
- https://nimbalyst.com/blog/best-tools-for-running-parallel-ai-coding-agents/
- https://www.tembo.io/blog/ai-agent-orchestration-tools
- https://superset.sh/compare/best-ai-coding-agents-2026
