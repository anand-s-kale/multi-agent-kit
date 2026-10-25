# Contributing

The most useful contribution is an **adapter** for a coding CLI you pay for, or a fix to an `untested` one.

## Adapter format

One file per agent in `adapters/<id>.json`:

| Field | Meaning |
|---|---|
| `id`, `name`, `vendor`, `plans` | Identity, and which subscriptions include it |
| `status` | `verified` (tested with a real plan) or `untested` |
| `commands` | Candidate binaries per platform (`win32`, `default`). Paths may use `~` and `%VAR%`. Bare names are looked up on PATH. First match wins. |
| `versionArgs`, `minVersion` | How to get the version; optional minimum that still works |
| `auth` | `{ "type": "file", "path", "key" }`, `{ "type": "command", "args", "expect", "deep" }`, `{ "type": "env", "var" }` or `{ "type": "none" }` |
| `usage` | `{ "source": "claude-statusline" \| "codex-sessions" \| "none" }`. Add a new source in `bin/mak.mjs` if your CLI exposes limits. |
| `models` | A list, a description, or `{ "args": [...] }` to list them |
| `run` | Headless command templates: `read` (no edits), `write`, optionally `review`. Placeholders: `{prompt}`, `{cwd}`, `{model}`, `{base}` |
| `strengths` | What the lead should give this agent |
| `install`, `docs`, `notes` | How to install and sign in, official docs, gotchas |

## Checklist for a new or fixed adapter

1. `node bin/mak.mjs status` shows your agent as installed, with the right version and sign-in state.
2. The `run.read` command really does not edit files. If the CLI has no read-only mode, say so in `notes`.
3. You ran `run.read` and `run.write` once each with a real plan, then set `status` to `verified`.
4. If the CLI exposes usage or limits anywhere (a command, a log file, an API), add a `usage` source in `bin/mak.mjs`. This is the most valuable part.
5. Never commit keys, tokens or account files. Credentials stay in the CLI's own login or in environment variables.

## Other changes

- Rules and roles: `claude/rules/`, `claude/agents/`, `codex/`, `antigravity/`. Keep them short; every agent reads them on every session.
- `install.ps1` must stay idempotent. An `install.sh` for macOS/Linux is welcome.
- `bridges/` holds pinned third-party code. Upgrades need a read of the new source in the PR.
