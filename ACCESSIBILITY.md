# Accessibility

multi-agent-kit is a command-line tool plus instruction files for AI coding agents. It has no graphical interface of its own.

## What we do

- `mak status` and `mak log` print plain text: no colour-only meaning, no animation, no box-drawing, so they read well in screen readers and in any terminal. `--json` gives the same data for other tools.
- Errors are written in plain words to stderr with a non-zero exit code.
- Images and the demo GIF in the README have text descriptions, and every number shown in them is also in the text.

## Known limitations

- The demo GIF and MP4 have no captions track or audio description; the README text and `docs/HANDOFF.md` describe the same run.
- The installer is PowerShell only for now (Windows).

## Report a barrier

If something in the CLI output, docs or install steps is hard to use with your setup, please [open an issue](https://github.com/anand-s-kale/multi-agent-kit/issues/new/choose) and describe your environment (terminal, screen reader, OS).
