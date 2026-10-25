# multi-agent-kit — Agent Instructions

This repo is the source of truth for the multi-agent setup on this machine. Read `README.md` for the layout and `docs/HANDOFF.md` for current state.

- Edit the files in this repo, never the installed copies in `~/.claude`, `~/.codex` or `~/.gemini`. Then run `pwsh -File .\install.ps1`.
- `install.ps1` must stay idempotent: re-running it replaces its own output and never duplicates blocks.
- `bridges/` holds pinned, reviewed third-party code. Do not upgrade it without reading the new source.
- Keep `docs/HANDOFF.md` current after each change: done and verified, not yet verified, next steps.
- Never put credentials, tokens or account files in this repo.
- Do not push unless the user asks.
