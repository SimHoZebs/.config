---
name: screenshot
description: Capture UI screenshots and videos with opencode browse and embed them as markdown. Use when the user asks for a screenshot, to show the UI, to show images here, or to record a video of the app.
---

# Screenshot and Video Capture

An explicit request for a screenshot, shown UI, or video is a render request. Capture and embed in the same reply. Never reply with file paths and wait for the user to ask for markdown.

## Tool

Use opencode browse (the `browse` MCP server / CLI from Dax's Browse, `opencode.ai/product/browse`) over per-task screenshot scripts (`*.spec.ts`, `shots-*.cjs`, `*-shots.mjs`).

Browse is a driver, not an agent: it runs deterministic Playwright code in your visible Chromium browser (with your tabs, logins, and extensions). The agent reference is `cli/skills/browse/SKILL.md` (`browse skill` prints it). Run `browse doctor` when setup is unclear. The first operational command starts the relay — do not start `browse serve` first.

Setup if `browse` is missing: `curl -fsSL https://opencode.ai/browse/install | bash` or `npx @opencode/browse install`, plus the Chrome extension from the Chrome Web Store. Request user action for pairing or logins via `handoff()` (see below).

## Loop

Use inspect → act → verify throughout. Inspect before picking locators, act through the narrowest stable control, verify with a URL or fresh read.

```bash
browse session new shot
browse execute --session shot 'await page.goto("<url>"); return await snapshot()'
# Act from the snapshot refs, then verify:
browse execute --session shot 'await ref("e12").click(); await page.getByRole("heading").waitFor(); return { url: page.url() }'
# Save the shot — absolute path under ~/tmp-shots/, must be inside the execute file roots
browse execute --session shot 'await page.screenshot({ path: files.path("/home/simho/tmp-shots/<name>.png") })'
browse session reset shot
```

MCP equivalents: `browse_session_new`, `browse_execute`, `browse_session_reset` / `browse_session_delete`. Omit `session` in MCP for the implicit process session; name it only when one MCP process needs several.

- One named session per worktree or shot. Tabs stay in the background in your session's collapsed group; popups join your session and are read with `page.waitForEvent("popup")`.
- `snapshot()` is the default inspect. `ref("e12")` resolves controls from the latest snapshot. Re-snapshot after navigation or DOM drift. Use `page.getByRole("heading", { name: "Settings" }).waitFor()` and assert the URL — never treat a click as proof.
- Never wait on `networkidle` via a fixed load on SSE/polling pages: stochastic SSE keeps the network alive. Wait for text or a stable element instead (`waitForURL`, `getByText(...).waitFor()`).
- Drive modals with real clicks. Never add temporary auto-open hacks to components. For fill, `ref("e12").fill("text")` or `page.getByLabel("Email").fill(...)`; if a site watches typing, use `pressSequentially`. `fillInput()` is a last resort only.
- Working in a tab the user already has open: ask them to click the browse toolbar button (badge ON) to lend it, then `browse session adopt --tab-id 123 --session shot` (MCP: `session_adopt` with `tabId` or `targetUrl`). Prefer adoption for authenticated state.
- Console and network: `pageConsole.start()` / `pageConsole.stop()` for console during debugging; `browse network start --session shot --url /api/` then `browse network stop --session shot --output ./flow.har` (MCP: `network` tool). See the `browse` skill for HAR-to-CLI flow.

## Servers and Seeding

Per-repo server, port, wait, and seeding rules live in the repo cheat-sheet (e.g. `frontend/scripts/shot.md`). Follow it when one exists.

## Video

```bash
browse recording start /home/simho/tmp-shots/<name>.mp4 --session shot --mode cdp
browse execute --session shot 'return await snapshot()'
# Act via refs as in the shot loop.
browse recording stop --session shot
```

MCP: `recording` tool with `action: "start"` / `"stop"` / `"status"` / `"cancel"`. `--mode auto` uses tab capture for user-owned tabs and CDP for relay-owned tabs; tab capture can include audio, CDP needs `ffmpeg` and has no audio. Add `--cursor` / `cursor: true` only for demo videos that need the ghost cursor. For failures that are hard to reproduce, keep a rolling buffer: `browse flight-recorder start --session shot --retention-ms 60000` then `browse flight-recorder save-last /home/simho/tmp-shots/failure.mp4 --session shot --duration-ms 30000` (MCP: `flight_recorder`).

Same output dir (`~/tmp-shots/`) and same-reply embed rule. Recordings show only the page, no browse UI.

## Handoff

When only a person can proceed (login, 2FA, passkey, payment, interactive CAPTCHA), register `handoff` before triggering the prompt:

```js
await handoff("Complete the security-key prompt, then continue", {
  timeoutMs: 600_000,
  start: () => page.getByRole("button", { name: /passkey|security key|sign in/i }).click({ timeout: 600_000 }),
})
await page.waitForURL((url) => !url.pathname.startsWith("/login"))
return { authenticatedUrl: page.url(), title: await page.title() }
```

Tell the user what is waiting. Human acknowledgment is not verification: assert the URL or stable element after `handoff`. Never solve challenges yourself.

## Output and Embed

- Save to `~/tmp-shots/` only. Never write to `/tmp/opencode`. Never commit shots.
- Embed each shot in the same reply with one markdown line using the absolute path: `![label](/home/simho/tmp-shots/<name>.png)`. Never use `file://` URLs or relative paths. For video, embed the `.mp4` / `.webm` path the same way.
- After capture, always `read` the PNG and judge overlap, overflow, and cut text yourself before you report. For visual evidence, return buffers via MCP when requested; saving a file plus `"ok"` proves only file creation.
