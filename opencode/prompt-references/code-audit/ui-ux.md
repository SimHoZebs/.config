# UI/UX and design-system audit

Scope: design vocabulary, visual ownership, component composition, layout,
responsive behavior, interaction, and accessibility. The invoking workflow defines
the area to examine. These checks apply to existing systems and proposed changes.

## Design vocabulary

Read the project's style guide, token owners, recipes, and primitives. Project
requirements define the approved choices; this reference does not define another
palette, spacing scale, component library, or visual style.

- Do spacing, dimensions, radii, typography, colors, shadows, and breakpoints use
  the approved vocabulary? Valid Tailwind syntax alone does not justify a choice.
- Does each custom value, token, alias, recipe variant, or custom responsive/state
  variant serve a concrete need? Which existing option or composition is inadequate?
  Standard framework variants and necessary distinct states remain useful.
- Do pixel literals express necessary hairlines, geometry, or another demonstrated
  constraint? Prefer approved utilities, named containers, and intrinsic layout.
  Unit conversions alone do not reduce independent design choices.
- Are runtime variables genuinely data-dependent? Fixed bespoke values hidden in
  variables, calculations, helper props, or token aliases still need justification.
- Do semantic tokens and theme roles have one owner? Keep palette and font choices
  in that owner rather than component-local overrides.

Preserve justified runtime values, SVG geometry, intrinsic constraints, and useful
variation. Identify the concrete constraint behind an exception. Missing project
guidance is a context gap, not permission to invent restrictions or new tokens.

## Composition and visual ownership

- Do repeated badges, controls, surfaces, tables, toolbars, skeletons, or transitions
  share a visual contract that can drift? Identify the appropriate existing owner.
  Similar syntax alone does not require an abstraction.
- Do tokens, recipes, and components retain the project's responsibility boundaries?
  Keep recipes independent where the architecture requires it. Components should
  earn their structure or behavior rather than merely conceal utility classes.
- Does composition use direct flex/grid layout and intrinsic constraints instead
  of brittle width arithmetic, private child selectors, or fixed clearance guesses?
  Parents own sibling spacing and order; children own internal composition.
- Are styles, selectors, and visual markers still used? Check consumers before
  recommending removal of orphan CSS or obsolete styling APIs.
- Do props and variants express coherent concepts? A high prop count is a lead,
  not a defect. Preserve components with distinct interactions or lifecycles.

## Interaction and accessibility

- Are controls usable by keyboard, pointer, and touch? Check accessible names,
  semantics, focus visibility, focus restoration, and modal/scroll behavior.
- Do controls preserve native submission, external form ownership, refs, controlled
  values, and disabled behavior where those contracts apply?
- Do layouts remain usable across relevant viewport/container sizes and themes,
  with readable content, reachable actions, and no unintended clipping or overlap?
- Do loading, empty, error, and read-only states communicate the next useful action?
  Check contrast and reduced-motion behavior where relevant.

## Evidence

Inspect each relevant entry point and its rendered result. Use browser DOM and
interaction checks for behavior, and screenshots or measurements for visual claims.
Compare repeated presentations side by side when their consistency is at issue.
Report unavailable checks as evidence gaps rather than assuming a visual result.

Return concise findings using `reporting.md`. Cite the controlling project rule,
concrete UX failure, or maintenance cost, plus the smallest correction and its
verification. Summarize design-vocabulary and variant exceptions with their
justification or finding; state when none exist. Do not replace project policy
with personal aesthetic preferences or propose a parallel styling system.
