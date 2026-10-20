# Documentation audit reference

Procedure for trimming and deduplicating project docs. Run phases in order;
re-read every touched file at the end.

## 0. Inventory

- List all `*.md` (exclude node_modules/dist/build output).
- Record each file's main responsibility — its reason to exist.
- Record machine-checked contracts that constrain edits (sync scripts,
  generated specs, required strings/anchors). These must survive verbatim.

## 1. Trim verbosity, remove editorial

- Delete: opinions, justifications, backstory, adjectives, restatements.
- Keep: factual contracts (routes, shapes, error codes, limits, log signals,
  commands, config tables).
- Preserve heading anchors other docs link to. If a heading goes, update its
  inbound links.

## 2. Deduplicate by ownership

- Build an ownership map: each fact lives in exactly one file.
- Typical split: glossary owns terms; API doc owns route contracts; area
  READMEs own local mechanics; observability doc owns log semantics;
  decision logs own history.
- Remove duplicates from non-owners. Sanctioned exceptions, kept in both:
  contract-vs-index (per-route numbers + central limits table),
  contract-vs-signal (wire header + log table).
- Fix false attribution ("doc A defines X" when it doesn't).

## 3. Dissolve pointer-only sections

- If a section's sole content is "X lives in file Y", delete the section.
- Relocate owned facts buried in it to their owner section; delete the rest.
- Keep: inline contextual links inside otherwise-owned sections, and one-line
  safety-critical navigation (verification entry points, config locations).

## 4. Audit leftovers

- Re-read every touched file in full. Look for: orphaned words from
  deletions, ungrammatical fragments, dangling anchors, false claims the
  removals exposed, numbers repeated in prose.
- Grep repeated terms/numbers across docs to confirm single ownership.
- Confirm no pointer-only sections or paragraphs remain.

## 5. Format and verify

- Check what the repo formatter covers (e.g. oxfmt ignores `**/*.md`).
  For markdown with no configured formatter, use Prettier defaults
  (`proseWrap: preserve` — structural normalization only, no prose reflow).
- Run the formatter check and all project contract checks.
