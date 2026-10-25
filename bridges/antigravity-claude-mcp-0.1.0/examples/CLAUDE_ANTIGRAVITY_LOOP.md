# Claude + Antigravity Collaborative Loop

A drop-in working agreement: paste this into your project (or your `CLAUDE.md`)
so every task is reviewed by **two independent models** *and* you before it's
considered done.

The second model is **Antigravity**, reached through the `ask_antigravity` MCP
tool (this package). It defaults to **Gemini 3.1 Pro (High)** — deliberately a
**different model family from Claude**, so the review is a real cross-check, not
Claude checking Claude.

---

## The Loop

```
 1. USER PROMPT
        │
        ▼
 2. CLAUDE VALIDATES PROMPT
    - Restate the goal, list assumptions, flag missing info.
    - If unclear → ask the user before going further.
        │
        ▼
 3. ASK ANTIGRAVITY  (ask_antigravity)
    - Send the validated prompt + Claude's proposed approach.
    - Pass the relevant file(s)/folder via `paths` for full context.
    - Antigravity replies with its own approach, risks, alternatives.
        │
        ▼
 4. DISCUSS → DECIDE
    - Compare the two approaches. Resolve disagreements with reasons.
    - Agree on ONE plan. Write it down before any code.
        │
        ▼
 5. CLAUDE WRITES THE CODE
        │
        ▼
 6. ANTIGRAVITY REVIEWS  (ask_antigravity, passing the changed paths)
    - Correctness, edge cases, bugs, style.
    - Claude fixes findings or pushes back with a reason. Repeat 5–6 until clean.
        │
        ▼
 7. USER CHECKS (the gate)
    - Approve → DONE ✅   |   Request changes → loop from step 2/4.
```

---

## Rules

- **Two-model rule:** nothing is "done" until both Claude agreed it *and* Antigravity validated it.
- **Different families:** keep the reviewer non-Claude (Gemini by default) — independence is the point.
- **Full context, not snippets:** always pass the whole relevant file/folder via `paths`.
- **No silent guesses:** if the prompt is unclear, ask.
- **Reasons over opinions:** every decision in the discuss step has a stated reason.
- **User is the final gate.**

---

## Roles

| Actor       | Job |
|-------------|-----|
| User        | Gives the prompt, checks output, approves or requests changes. |
| Claude      | Validates, proposes, discusses, writes code, applies fixes. |
| Antigravity | Independent approach (Gemini 3 Pro), then reviews Claude's code. |
