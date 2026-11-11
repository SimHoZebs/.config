---
name: visualization
description: Create architecture visualizations with ERDs and sequence diagrams as HTML plus PNG pasted in chat. Use when the user asks for a visualization, diagram, ERD, sequence, flowchart, architecture map, before and after comparison, or HTML visualization.
---

# Visualization

Build diagrams the way the user already expects so no repeat briefing is needed. The output is always renderable art rather than source text alone.

## Renderer

Mermaid is the source language. Pele is the renderer.

- Write each diagram as `.mmd` first.
- Render with `@simhozebs/pele-cli` to SVG for HTML pages.
- Render to PNG for chat embeds.
- Never hand-roll SVG and never use Mermaid JS in the browser when Pele can render at build time.

```bash
npx -y @simhozebs/pele-cli@0.1.1 input.mmd -o output.svg
npx -y @simhozebs/pele-cli@0.1.1 input.mmd -o output.png
```

Single diagrams can also pipe through stdin with `-` as the input.

## Delivery

Every visualization ships three ways in the same reply.

1. An HTML page that inlines or references the generated SVGs plus the `.mmd` source.
2. The rendered PNG pasted in chat with Markdown image syntax using an absolute path.
3. A tailnet link to the served page. Never substitute a LAN address or a localhost URL.

After capture always read the PNG yourself and judge overlap and overflow and cut text before reporting.

## Serving with a tailnet link

Bind to all interfaces and share the tailnet address. Never use `tailscale serve` and never change existing serve routes.

```bash
python3 -m http.server <port> --bind 0.0.0.0 --directory <viz-dir>
```

Resolve the tailnet IP first:

```bash
tailscale ip -4
```

Share as `http://<tailnet-ip>:<port>/<page>.html`. Use an isolated port and never stop the canonical stack or steal its ports to free your own. Never run sudo commands for serving.

## Before and after rule

Before and after comparisons keep identical layout and use color as the only diff signal.

- Keep the same node set in the same positions on both sides.
- Keep inputs identical on both sides unless the input change is the point of the comparison.
- Color kept or modified paths amber `#ffb300`.
- Color added storage or paths blue `#42a5f5`.
- Color shared anchors green `#4caf50`.
- State what is identical and what the color means in the reply.

## Layout

- Show one diagram per row at full width so sequence text and ERD attributes stay readable at zoom.
- Use a single-column layout rather than a side-by-side grid.
- Keep the page header static so it scrolls with the page. Never use sticky positioning.
- Keep text to the absolute minimum. The user wants visualization rather than text in colored boxes.
- Include ERDs plus sequences plus flow where the change needs all three. A single flowchart alone is not a substitute when storage shape matters.

## Genre correctness

- Keep schema diagrams as entity diagrams with exact tables and columns.
- Never merge nested payload or document fields into tables. Show document contents as marked document objects beside the tables.
- Use sequence diagrams with real participants only. A method call is a message on a lifeline rather than a lifeline itself.
- Use class diagrams for structure and sequence diagrams for interaction and flowcharts for control flow and state diagrams for lifecycles.
- Use `erDiagram` for schemas and `sequenceDiagram` for call order. Do not mix genres in one diagram.

## Language

- Use established project terminology rather than inventing synonyms.
- Prefer full sentences in explanations and captions.
- Explain diagram notation in plain words when asked rather than repeating method names literally.
- Do not state file names or line numbers unless the idea cannot be communicated without them.

## Captures

- Save page captures under `viz/captures/<area>/` with descriptive names.
- Treat `viz/` as gitignored scratch space and never commit it unless the repo explicitly commits diagrams elsewhere such as `docs/diagrams/`.
- Display captures in chat through Markdown formatting in the same reply.
