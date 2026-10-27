# Screenshot cheat-sheet (agent-browser)

Sections 1–2 name the net-worth-estimator fixture stack. Other repos use their own cheat-sheet (e.g. `frontend/scripts/shot.md`); section 3 applies everywhere.

Ad-hoc UI shots use the fixture harness, never the Compose/Casdoor dev stack.
Playwright config (`frontend/playwright.config.ts`) owns the canonical setup:
`fixtureapi` on 8799 seeded from `frontend/tests/fixtures/`, Vite pointed at it.

## 1. Servers

If `test:browser` is not already running them, start both manually.
Use port 5179 so shots never attach to a dev frontend on 5178:

```bash
PORT=8799 NET_WORTH_ESTIMATOR_DB=/tmp/waypoint-browser-fixture.db \
  NET_WORTH_ESTIMATOR_MODEL_PATH=../frontend/tests/fixtures/model \
  CGO_ENABLED=0 go -C backend run ./cmd/fixtureapi &
NET_WORTH_ESTIMATOR_BACKEND=http://127.0.0.1:8799 \
  npm --prefix frontend run dev -- --port 5179 &
```

Reset between shots:

```bash
curl -X POST http://127.0.0.1:8799/__fixture/reset -d '{"readOnly":false}'
```

## 2. Shot loop

```bash
export AGENT_BROWSER_SESSION="$(npx -y agent-browser session id --scope worktree --prefix shot)"
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" open http://127.0.0.1:5179/#sources
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" wait --text "Bank sync"
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" snapshot -i
# Click/fill using refs from the snapshot. Re-snapshot after each page change.
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" click @eX
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" screenshot --annotate ~/tmp-shots/<name>.png
npx -y agent-browser --session "$AGENT_BROWSER_SESSION" close
```

First run in a fresh shell: `npx -y agent-browser skills get core`.

No Playwright Chromium download needed while
`~/.cache/ms-playwright/chromium-1243` exists:

```bash
npx -y agent-browser --executable-path ~/.cache/ms-playwright/chromium-1243/chrome-linux/chrome open http://127.0.0.1:5179
```

## 3. Rules

- Named session per worktree. The default session is shared machine-wide.
- `wait --text` / `wait --url` / `wait --fn`. Never `wait --load networkidle`:
  stochastic SSE keeps the network alive and the wait times out on a ready UI.
- Drive modals with real clicks. Never add temporary auto-open hacks to components.
- Seed connected bank state through the fixture API
  (`POST /v1/sync/simplefin/credential`, card/link PUTs), not code edits.
- `read` the PNG and judge overflow/overlap/cut text yourself before reporting.
- Embed each shot in the same reply with one markdown line using the absolute path: `![label](/home/simho/tmp-shots/<name>.png)`.
  Never reply with bare file paths and wait for the user to ask for markdown. Never use `file://` URLs or relative paths.
  Re-opening the file does not attach it. Keep surrounding text minimal.
- Output to `~/tmp-shots/` (`/home/simho/tmp-shots/`) only. Never write to `/tmp/opencode`. Never commit shots.
- `console`, `errors`, `network requests`, `a11y` cover console/network/audit
  checks without extra harnesses.
