# Session Handoff — multi-agent-kit

**Last session:** 2026-10-24 → 2026-10-25. Started inside the QuickComm repo, moved here.
**Owner:** Anand S Kale (GitHub `anand-s-kale`, formerly `MrAk47Anand007`). Windows 11, PowerShell 7, Node 24.
**Continue from:** this folder, in a new Claude Code session. Not from QuickComm.

## The idea (in Anand's words, summarised)

Developers pay for several AI coding subscriptions, often cheaper tiers mixed together: Claude Max $100, Codex (ChatGPT Plus/Pro), Antigravity (Google AI Pro, Anand's via a Jio offer: Gemini Flash models), and others pay for Kimi, Qwen, Cursor, Grok or GLM. Every plan has daily/5-hour and weekly quota that expires unused, so the money is wasted daily. Existing tools hand work between agents, but **none decides by quota across all of them**.

multi-agent-kit makes Claude Code the lead. It reads every agent's limits, including Claude's own, and decides who does what, so all paid quota gets used. **No routing engine:** Claude already has the intelligence; the kit only gives it facts (the status report) and rules.

Plan: publish publicly, post the story on LinkedIn, and invite people with other subscriptions to contribute and test adapters. Start with 3 verified agents (Claude, Codex, Antigravity), with more as untested adapters. The repo stays useful to Anand even if nobody else uses it.

## Decisions made

| Decision | Why |
|---|---|
| Claude Code is the lead; the kit has no routing logic | "We have the intelligence already present". Claude weighs fit, expiring quota, and its own headroom. |
| Public repo, MIT license | Anand: "if public use it, that's okay"; useful to him regardless |
| Adapter = one JSON file per agent in `adapters/` | Easy for the community to add Kimi, GLM, Qwen and others |
| Codex via CLI, not MCP | Codex 0.164 removed `codex mcp-server`; claude-delegator died from this |
| Antigravity via a pinned, vendored copy of antigravity-claude-mcp 0.1.0 | Reviewed source; no unreviewed `npx` updates |
| Don't ship it as "yet another delegation plugin" | openai/codex-plugin-cc (34.5k★), PAL MCP (11.8k★) and Maestro already cover hand-off. The quota-aware decision is the gap. |
| Skip Maestro in Claude Code | superpowers already covers that workflow; Maestro doesn't route between runtimes |
| Don't install untested CLIs on Anand's machine | No subscriptions for Kimi, GLM, Cursor or Grok; adapters are written from vendor docs and marked `untested` |
| Only official CLIs with the user's own login or key | Vendor terms; never proxy or share credentials |

## Built and verified (2026-10-25)

- `bin/mak.mjs status [--json] [--deep]`: detects all 8 adapters in ~4 s. On this machine: antigravity 1.4.7 signed in; claude 2.1.220 signed in; codex 0.164.0 signed in with **real 5h/weekly usage + reset times** from `~/.codex/sessions`; qwen 0.20.0 found installed; glm (needs `ZAI_API_KEY`); cursor, grok and kimi not installed.
- `bin/statusline.mjs`: saves Claude's `rate_limits` (5h/7d) from the status line payload to `~/.multi-agent-kit/usage/claude.json`. Tested with a sample payload; **not yet seen with a real session**.
- `install.ps1` ran clean. It installs `~/.multi-agent-kit`, sets the Claude status line (there was none), copies the rules and agents, writes the Codex/Gemini blocks (idempotent: checked by counting blocks), and registers the `antigravity` MCP via `add-json` with `AGY_BIN` + `AGY_MODEL=gemini-3.8-flash-high`. Status: Connected.
- Codex upgraded to 0.164.0 (npm). The old standalone 0.139 on PATH rejected all current models and its `codex update` failed.
- Bugs found and fixed: the bridge's default model "Gemini 3.1 Pro (High)" doesn't exist on this account; PowerShell drops `--` so `claude mcp add -e … -- node` broke; the bridge's agy detection doesn't work on Windows.

## Update — Antigravity quota (2026-10-25, later)

- `agy` has no scriptable quota command. `agy -p "/usage"` sends it to the model; its local `GetUserStatus` server answers 401 without a token, which the CLI doesn't expose (works for the Antigravity IDE, which passes `--csrf_token`); no quota is cached on disk. The Python SDK (`google-antigravity`) uses API keys or Vertex and has no remaining-quota call.
- **Working method:** `bin/agy-usage.mjs` runs `agy` in a pseudo-terminal (`@lydell/node-pty` 1.2.0-beta.10, installed into `~/.multi-agent-kit` by `install.ps1`), confirms trust for an empty `~/.multi-agent-kit/agy-probe` folder, types `/usage` and parses the screen. ~9 s, no model call, cached 15 min in `usage/antigravity.json`, `mak status --refresh` forces a re-read.
- Gives weekly + 5h per group: `gemini` (Gemini Flash/Pro) and `claude+gpt` (Claude Opus/Sonnet, GPT-OSS). The latter is extra Claude capacity outside Claude Code's quota.
- First full real report: Claude 7d **64%** used, Codex 0%, Antigravity ~0%. Claude limits now record via the status line (verified).
- The parser depends on the `/usage` screen layout; a CLI update could break it. If it does, `mak status` keeps the last cached reading and says why.

## Update — first real delegation round + demo GIF (2026-10-25, evening)

- Built `mak log` (delegation ledger, `~/.multi-agent-kit/usage/ledger.jsonl`, `MAK_HOME` override, cache-only Antigravity read) as a real multi-agent run: Sonnet subagent wrote the code, Codex wrote 12 tests in its own worktree, Gemini (`ask_antigravity`, **now verified from inside Claude**) reviewed the design and drafted the README section, `cross-model-reviewer` (**now verified on a real diff**) found 4 issues, all fixed. 15/15 tests pass (`npm test`). `install.ps1` re-run.
- `docs/images/mak-demo.gif` is at the top of the README: real screen captures of the Claude app plus real `mak status` / `npm test` / `mak log` output, captioned. Built with a throwaway Pillow script (not in the repo).
- Found on the way: (1) Codex 0.164 on Windows: `-s workspace-write` denies access to the `-C` folder itself; used `-s danger-full-access` in a dedicated worktree (noted in `adapters/codex.json`). (2) `codex review --base X "prompt"` is rejected; adapter now has no prompt. (3) `node --test test/` fails on Node 24; script names the file. (4) Gemini's review inside `cross-model-reviewer` timed out at 5 min. (5) The Claude desktop app does not run the status line, so `usage/claude.json` goes stale there (last reading 16:55Z during this run); only the CLI updates it.
- Deferred ideas from Gemini's design review: `n` can duplicate under concurrent `log add`; no outcome/status per entry; no `--agent` filter.

## Not verified yet

- The Qwen adapter: Qwen is installed, but its sign-in and `--approval-mode plan` are unchecked. Easiest next adapter to verify.
- Whether Antigravity reads `~/.gemini/GEMINI.md` as global rules.
- Kimi, Cursor, Grok and GLM adapters: need people with those plans.

## Next steps (suggested order)

1. New Claude Code session in this folder. Run `node bin/mak.mjs status` and confirm the Claude numbers appear after the first reply.
2. Verify the Qwen adapter (installed already), then mark it `verified`.
3. Do a real delegation round on a QuickComm task: Claude reads status, splits work between Codex, Gemini and Sonnet, and the cross-model review runs before merge.
4. Add usage readers where possible: research whether agy, Qwen and Kimi log quota anywhere. A kit-side ledger (count runs per agent) is the fallback for CLIs that expose nothing.
5. `install.sh` for macOS/Linux.
6. Write the LinkedIn post: the problem (3 paid plans, using 1), what was built, what broke along the way, a call for adapter testers. Credit the related projects.
7. Optional: OpenAI's official codex-plugin-cc as an alternative Codex route; Vibe Kanban as a board.

## Related state outside this repo

- QuickComm repo (`...\GitHub\QuickComm---Hyperlocal-Quick-Commerce-Platform`): its `AGENTS.md` "Multi-Agent Roles" is committed as `266c00bb0` (not pushed). `docs/MULTI-AGENT-SETUP-HANDOFF.md` there is uncommitted and stale (it still says Codex MCP); superseded by this file.
- Claude memory for the QuickComm project has a pointer to this kit.

## Key paths (Windows)

| Thing | Path |
|---|---|
| Kit install | `~/.multi-agent-kit` (bin, adapters, usage/claude.json) |
| Codex CLI (good) | `%APPDATA%\npm\codex.cmd` 0.164.0 |
| Codex CLI (old, broken) | `%LOCALAPPDATA%\Programs\OpenAI\Codex\bin` → `~/.codex/packages/standalone` 0.139 |
| agy CLI | `%LOCALAPPDATA%\agy\bin\agy.exe` 1.4.7 |
| Bridge | `~/.claude/mcp/antigravity-claude-mcp-0.1.0` |
| MCP registrations | `~/.claude.json` (user scope) |
| Claude status line | `~/.claude/settings.json` → `statusLine` |
