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

### 5. Report

Report what was tested, what passed, what failed, and any errors found.
