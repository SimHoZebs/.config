---
name: webapp-testing
description: Toolkit for interacting with and testing local web applications using Playwright browser tools. Supports verifying frontend functionality, debugging UI behavior, capturing screenshots, viewing browser console and network logs, and inspecting rendered DOM state.
---

# Web Application Testing

Use the available browser tools (navigate, click, snapshot, screenshot, evaluate, console_messages, network_requests) to interact with and test local web applications.

## Setup

The dev server must be running before testing. If not already started:
1. Start the dev server in a terminal (e.g., `npm run dev`, `python manage.py runserver`)
2. Note the URL (typically `http://localhost:5173`, `http://localhost:3000`, etc.)
3. Navigate to the URL using the browser tool

## Testing Workflow

### 1. Reconnaissance

Navigate to the app and take a snapshot to understand the rendered state:
- Use `browser_snapshot` to get the accessibility tree
- Use `browser_take_screenshot` to capture the visual state
- Use `browser_console_messages` to check for errors in the console
- Use `browser_network_requests` to inspect API calls

### 2. Identify Selectors

From the snapshot and screenshot, identify the elements to interact with — buttons, inputs, links, etc.

### 3. Execute Actions

Use the browser tools to interact with the app:
- `browser_fill_form` for filling multiple fields
- `browser_type` for typing into editable elements
- `browser_click` for clicking buttons, links
- `browser_select_option` for dropdowns

### 4. Verify Behavior

After each action, verify the expected behavior:
- Snapshot or screenshot to see the result
- Check console for errors
- Check network requests for API calls

### Selective Verification — Check Render Only When Needed

Verify rendered output only when the edit changes visual result or user flow. Such edits include structure, layout, conditional render, state-driven UI, navigation, forms, or data-empty states.

Skip render check when the diff proves no visual change. Such edits include copy-only text, comments, type renames, isolated utils, prop renames with same output, or backend-only logic. State reason in report.

### Explicit Screenshot Requests Override Selectivity

If the user asks for a screenshot, capture and embed it in the same reply. The selectivity rule above never applies to an explicit request. Never reply with file paths and wait for the user to ask for markdown.

### Prefer DOM and Hierarchy Over Screenshots

Prefer `browser_snapshot`, evaluated DOM, and rendered HTML over `browser_take_screenshot`. Screenshots need vision and hide structure. DOM shows hierarchy, props, and missing data.

Follow this order:
1. Read component split and hierarchy from code.
2. Use snapshot or DOM to confirm structure, states, and empty data.
3. Use console and network for errors and API shape.
4. Use screenshot only when risk is visual: spacing, overlap, responsive break, theme, animation, or brand style. State why screenshot was needed.

- After screenshot, always `read` the image and judge overflow/overlap/cut text yourself.
- Prefer `agent-browser` over per-task screenshot scripts (`*.spec.ts`, `shots-*.cjs`, `*-shots.mjs`).
  Load its version-matched guide first: `npx -y agent-browser skills get core`.
  Per-repo server, port, wait, seeding, and attach rules live in the repo cheat-sheet
  (e.g. `~/.config/opencode/shot.md` globally, or `frontend/scripts/shot.md` when the repo owns one); follow it when one exists.
  Core loop: named session per worktree, `open`, `snapshot -i`, `click`/`fill` by ref,
  `wait --text` (never `networkidle` on SSE/polling pages), `screenshot --annotate`.
- Output to `~/tmp-shots/` only. Never `mkdir /tmp/opencode`. Never commit shots.
- Embed each shot in the same reply with one markdown line using the absolute path: `![label](/home/simho/tmp-shots/<name>.png)`. Never use `file://` URLs. Never reply with bare paths and wait for the user to ask for markdown.

### 5. Report

Report what was tested, what passed, what failed, and any errors found.
