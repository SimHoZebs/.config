---
name: screenshot
description: Capture UI screenshots and videos with agent-browser and embed them as markdown. Use when the user asks for a screenshot, to show the UI, to show images here, or to record a video of the app.
---

# Screenshot and Video Capture

An explicit request for a screenshot, shown UI, or video is a render request. Capture and embed in the same reply. Never reply with file paths and wait for the user to ask for markdown.

## Tool

Prefer `agent-browser` over per-task screenshot scripts (`*.spec.ts`, `shots-*.cjs`, `*-shots.mjs`). Load its version-matched guide first:

```bash
npx -y agent-browser skills get core
```

## Loop

```bash
export AGENT_BROWSER_SESSION="$(npx -y agent-browser session id --scope worktree --prefix shot)"
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" open <url>
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" snapshot -i
# Click/fill using refs from the snapshot. Re-snapshot after each page change.
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" wait --text "<ready text>"
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" screenshot --annotate ~/tmp-shots/<name>.png
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" close
```

- Named session per worktree. The default session is shared machine-wide.
- `wait --text` / `wait --url` / `wait --fn`. Never `wait --load networkidle` on SSE/polling pages: stochastic SSE keeps the network alive and the wait times out on a ready UI.
- Drive modals with real clicks. Never add temporary auto-open hacks to components.

## Servers and Seeding

Per-repo server, port, wait, and seeding rules live in the repo cheat-sheet (e.g. `frontend/scripts/shot.md`). Follow it when one exists.

## Video

```bash
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" open <url>
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" record start ~/tmp-shots/<name>.webm
# Act via snapshot refs as in the shot loop.
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" record stop
```

Same output dir (`~/tmp-shots/`) and same-reply embed rule. Needs `ffmpeg` on `PATH`.

## Output and Embed

- Save to `~/tmp-shots/` only. Never write to `/tmp/opencode`. Never commit shots.
- Embed each shot in the same reply with one markdown line using the absolute path: `![label](/home/simho/tmp-shots/<name>.png)`. Never use `file://` URLs or relative paths.
- After capture, always `read` the PNG and judge overlap, overflow, and cut text yourself before you report.
- `console`, `errors`, and `network requests` cover console/network/audit checks without extra harnesses.
