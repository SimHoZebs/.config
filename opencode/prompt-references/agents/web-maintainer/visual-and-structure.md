# Visual ownership and project structure

Inspect repeated badges, controls, surfaces, links, stacks, spacing, focus states,
and responsive rules. One stable visual contract should have one presentational
owner, while feature components retain domain semantics. Parents own sibling gap,
alignment, wrapping, order, and separators; children own internal composition.
Preserve native link, button, and disclosure semantics even when styling is shared.

Do not consolidate components that only look similar but have different interaction
or lifecycle behavior. Prefer named variants over many unrelated flags.

For structure, look for:

- domain or parsing logic under component directories;
- worker contracts far from their consumers;
- mixed-purpose domain folders that obscure ownership;
- tests, fixtures, or adapters separated from the subsystem they exercise;
- stale barrels, aliases, imports, and empty placeholder directories; and
- screenshots, logs, snapshots, or debug files outside an intentional artifact
  location.

Recommend moves only when they improve ownership or navigation. Preserve public
barrels where consumers rely on them. Verification should search old paths and
classes, typecheck imports, test semantics and accessibility, and inspect both
desktop and responsive layout where visual ownership changes.
