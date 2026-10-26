# Security Policy

multi-agent-kit drives coding CLIs (Claude Code, Codex, Antigravity and others) on your machine with your own logins. A bug here could run a command you did not intend, leak a prompt or file to the wrong agent, or expose credentials, so security reports are very welcome.

## Supported versions

Only the latest commit on `main` is supported. Please re-run `install.ps1` after pulling before you report.

## Reporting a vulnerability

**Please do not open a public issue.** Use GitHub's private reporting instead: go to the repository's **Security** tab and click **Report a vulnerability**.

Include what you ran, what happened, and what you expected. Never include real API keys, tokens or account files; redact them.

You can expect an acknowledgement within 7 days. This is a one-maintainer project, so fixes are best effort, but security reports are handled first.

## In scope

- `bin/` (status, log, usage readers, status line) and `install.ps1`
- Adapter `run` templates in `adapters/` that could edit files in a read-only mode, or pass prompts unsafely to a shell
- The rules and agent files in `claude/`, `codex/`, `antigravity/` if they lead an agent to leak files or credentials

## Out of scope

- Bugs in the vendors' own CLIs (Claude Code, Codex, Antigravity, Kimi, Qwen, Cursor, Grok, GLM): report those to the vendor.
- The vendored bridge in `bridges/` is pinned third-party code. Report it upstream as well; we will update the pin.
