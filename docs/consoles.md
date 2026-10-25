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

## Related: Maestro (workflow plugin, not a console)

https://github.com/josstei/maestro-orchestrate — reviewed 2026-10-25 (v1.6.4, Apache-2.0, ~480 stars, actively maintained).

- Installs separately into Claude Code, Codex, Antigravity and Qwen Code. Adds 39 specialist subagents, an Express path and a 4-phase Design → Plan → Execute → Complete workflow with approval gates, and session state in `docs/maestro/`.
- **Does not dispatch across runtimes.** Maestro in Claude uses Claude subagents and Maestro in Codex uses Codex agents. Its code has no calls to `codex exec` or `agy -p`. It complements this kit and does not replace it: the kit is what routes work between Claude, Codex and Gemini.
- **Claude Code: skip.** superpowers already covers the same plan → execute → review loop, and two workflow systems would compete. It also adds 39 agents to every session, and its `/status` may collide with the built-in one.
- **Codex / Antigravity: worth a trial.** It gives them a structured workflow when run on their own: `codex plugin marketplace add josstei/maestro-orchestrate`, and `agy plugin install https://github.com/josstei/maestro-orchestrate/tree/main/antigravity`.
- Marketplace installs track latest. Pin a release tag or read the diff before upgrading.
