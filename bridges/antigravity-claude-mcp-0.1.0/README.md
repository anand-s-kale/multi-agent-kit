# antigravity-claude-mcp

> **Give Claude Code a second brain.** Ask Google Antigravity — Gemini 3 Pro, Claude, or GPT-OSS — for an independent code review or second opinion, right from inside Claude Code. One command. Zero dependencies.

[![npm](https://img.shields.io/npm/v/antigravity-claude-mcp.svg)](https://www.npmjs.com/package/antigravity-claude-mcp)
[![node](https://img.shields.io/node/v/antigravity-claude-mcp.svg)](https://nodejs.org)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

```bash
claude mcp add antigravity -- npx -y antigravity-claude-mcp
```

That's it. Restart Claude Code, and Claude can now call **`ask_antigravity`** to get a second model's take on any plan or diff.

---

## Why

Claude reviewing its own code is Claude reviewing its own code. You don't catch your own blind spots by thinking harder — you catch them with a **different mind**.

This bridges [Claude Code](https://docs.anthropic.com/en/docs/claude-code) to [Google Antigravity's CLI](https://antigravity.google) (`agy`), so Claude can hand a plan or a diff to a **different model family** (Gemini 3 Pro by default) and get an independent verdict — *before* you do. Two models check the work; you make the call.

It's the wiring behind a simple loop:

```
You ── prompt ──▶ Claude validates ──▶ asks Antigravity (Gemini) ──▶ they agree on ONE plan
                                                                          │
        you approve ◀── Antigravity reviews the diff ◀── Claude writes the code
```

See [`examples/CLAUDE_ANTIGRAVITY_LOOP.md`](./examples/CLAUDE_ANTIGRAVITY_LOOP.md) for the full working agreement you can drop into any project.

---

## Quickstart (2 minutes)

**1. Install the Antigravity CLI** (if you don't have it) and sign in once:

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
~/.local/bin/agy -p "ping" --print-timeout 5m   # opens a Google login the first time
```

**2. Add the MCP server to Claude Code:**

```bash
claude mcp add antigravity -- npx -y antigravity-claude-mcp
```

**3. Check it's healthy** (optional):

```bash
npx antigravity-claude-mcp doctor
```

**4. Restart Claude Code**, run `/mcp` to approve the tool, and ask:

> "Use ask_antigravity to review my changes in `src/auth.ts` for edge cases."

---

## How it works

```
┌────────────┐   MCP (stdio,    ┌─────────────────────────┐   agy -p     ┌──────────────────┐
│ Claude Code│   JSON-RPC 2.0)  │ antigravity-claude-mcp   │  --model …   │ Antigravity CLI  │
│  (Claude)  │ ───────────────▶ │  ask_antigravity tool    │ ───────────▶ │ Gemini 3 Pro /   │
│            │ ◀─────────────── │  (this package)          │ ◀─────────── │ Claude / GPT-OSS │
└────────────┘   tool result    └─────────────────────────┘   stdout     └──────────────────┘
```

The package is a tiny stdio MCP server that shells out to `agy -p` (Antigravity's headless print mode), optionally adding files/folders as context with `--add-dir`, and returns the model's text back to Claude.

### The `ask_antigravity` tool

| Param   | Type       | Required | Description |
|---------|------------|----------|-------------|
| `prompt`| string     | ✅        | The question, proposed approach, or review request. |
| `paths` | string[]   |          | Absolute file/folder paths. Antigravity reads them **in full** as context. |
| `model` | string     |          | Override the model (see below). Default: `Gemini 3.1 Pro (High)`. |

---

## Models

Whatever your Antigravity account exposes via `agy models`, for example:

- `Gemini 3.1 Pro (High)` ← **default** (strong, and a different family from Claude)
- `Gemini 3.5 Flash (Low|Medium|High)` (fast/cheap)
- `Claude Sonnet 4.6 (Thinking)`, `Claude Opus 4.6 (Thinking)`
- `GPT-OSS 120B (Medium)`

> **Why default to Gemini, not Claude?** The whole point is an *independent* reviewer. Using a Claude model to review Claude's work defeats the cross-check. Override per call with `model` if you want a specific one.

---

## Configuration

Set as environment variables on the MCP server (e.g. via `claude mcp add ... -e KEY=VAL`):

| Variable      | Default                 | Purpose |
|---------------|-------------------------|---------|
| `AGY_BIN`     | auto-detected           | Absolute path to the `agy` binary. |
| `AGY_MODEL`   | `Gemini 3.1 Pro (High)` | Default model for every call. |
| `AGY_TIMEOUT` | `5m`                    | Headless print timeout. |

---

## Troubleshooting

**`agy` runs but prints "passed to Electron/Chromium" warnings.**
You have the Antigravity **IDE** installed, and plain `agy` on your `PATH` is a symlink into `Antigravity.app` — that's the editor, not the CLI. This package auto-detects and skips it, preferring the real CLI at `~/.local/bin/agy`. If you call `agy` by hand, use the full path or set `AGY_BIN`.

**"Authentication required."**
Sign in once interactively: `~/.local/bin/agy -p "ping" --print-timeout 5m`, open the printed Google link, approve, and paste the code back into that prompt.

**Tool doesn't appear in Claude Code.**
Restart Claude Code after `claude mcp add`, then run `/mcp` and approve `ask_antigravity`. `claude mcp list` should show `antigravity ✔ Connected`.

---

## vs. a proxy

Some projects route Claude Code's *own* traffic through Antigravity via an Anthropic-compatible proxy (i.e. Claude Code is "powered by" Antigravity). This is the opposite and complementary: Claude Code stays Claude, and Antigravity becomes a **tool Claude can consult** — so you get two genuinely different models in one loop instead of swapping one out for the other.

---

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- [Antigravity CLI](https://antigravity.google) (`agy`), signed in
- Node.js ≥ 18

## License

MIT © Arjun Thilak
