# Tests, dependencies, safety, and build output

## Test Infrastructure

- **Configuration**: Scan test config (vitest/jest config, setup files, global mocks, `tsconfig.test.json`) for unused setup, stale paths, or overly broad global mocks that obscure real coverage gaps.
- **Test structure**: Check whether tests follow a consistent naming convention (`.test.ts`, `.spec.ts`, `__tests__/`), whether e2e/integration/unit tests live in expected directories, and whether barrel files or index imports are used for test exports.
- **Fixtures and helpers**: Look for duplicated test utilities (identical factories, mock builders, render wrappers) across test files. Flag shared helpers buried inside `__tests__/` instead of a `__fixtures__/` or `test-utils/` module.
- **Mock quality**: Search for overly broad module mocks, mocks that drift out of sync with the real module, mock factories that erase meaningful behavior, and `vi.mock` calls at the top of files that disable imports needed by other tests in the same file.
- **Edge-case coverage**: Check that data-loading, empty-state, error, and null-input cases are present alongside happy-path tests. For components, check that both controlled and uncontrolled variants are exercised.
- **Flakiness signals**: Search for `setTimeout`, `waitFor(`, bare `Promise.resolve` without `vi.advanceTimers`, real timers without `vi.useFakeTimers`, tests depending on exact elapsed time, and network calls that are not faked.
- **Performance**: Search for slow test patterns — redundant full-page renders, repeated vi.mock/unmock cycles, tests that re-initialize the same store before every case, and high fixture setup overhead that could use `beforeAll` instead of `beforeEach`.
- **CI wiring**: Verify the project has a CI config (`.github/workflows/`, `.gitlab-ci.yml`, etc.) and that the test/typecheck/lint commands match what `npm run test` etc. actually run. Flag missing CI, missing lint-stage or pre-commit hooks, and test commands that bypass lint or typecheck.

## Dependency Hygiene

Use locally available tooling only.

Smells:

- Lockfile not committed or out of sync with `package.json`.
- Dependencies listed in `package.json` that are never imported in source code.
- Multiple versions of the same package in the lockfile without a concrete reason.
- Packages with known vulnerabilities or major versions behind latest.
- Build-only tools (testing, linting, bundler plugins) in `dependencies` instead of `devDependencies`.
- Unmet peer dependency warnings in `npm ls` output.

Better shapes:

- Lockfile is committed and regenerated after every `package.json` change.
- Run `depcheck` or a dead-import scan periodically; remove unused deps promptly.
- Deduplicate versions with `npm dedupe` / `yarn dedupe` / `pnpm dedupe`.
- Stay current on major versions within a project cycle; flag majors behind by 2+ versions.
- Keep `dependencies` lean; everything else goes in `devDependencies`.
- Check peer dependency warnings during code review or CI.

Verification:

- `npm ls --depth=0` produces no unmet peer warnings.
- CI uses a frozen-install command; do not run install commands during this audit.
- `depcheck` (or equivalent) reports zero obviously unused dependencies.

## Error Handling & Debug Artifacts

Smells:

- Empty `catch {}` blocks that silence failures without logging or user feedback.
- Promise chains without a terminal `.catch()` — rejections become unhandled.
- Top-level React components missing error boundaries — a crash in one section takes down the entire tree.
- `console.log` / `console.debug` in production source code not guarded by environment checks.
- `debugger;` statements committed to source.
- Large blocks of commented-out code without a documented reason or issue link.
- High density of TODOs/FIXMEs without dates or owner references.

Better shapes:

- Every `catch` block logs, reports, or renders fallback UI — never just `catch {}`.
- Every `.then()` chain has a trailing `.catch()`; async functions use try/catch at call sites.
- Route-level and feature-section-level error boundaries wrap async-loaded content.
- Production code uses a logger abstraction or `if (dev)` guard for debug output.
- Remove commented-out code; if it must stay, link to a tracking issue with a target resolution date.
- TODOs have an owner, a date, and/or an issue link.

Verification:

- Grep for `catch {` / `console.log(.*true` (unguarded) — zero hits in source.
- Grep for `debugger;` — zero hits.
- Check that error boundaries exist for each route or async-loaded section.
- No large comment blocks without an associated issue.

## CSS / Styling Hygiene

Smells:

- CSS files no longer imported by any component.
- Static inline `style={{ ... }}` for colors, spacing, typography that should use a class or token.
- Hardcoded color hexes, pixel values, or font sizes outside a design-token system.
- Style objects created inline in the component body (re-created every render).
- Very long Tailwind class strings (10+ utilities) on a single element that could be extracted.
- Success/error/warning indicators using only color without text or icon support.

Better shapes:

- All colors, spacing, and typography values come from CSS custom properties, theme tokens, or a constants file.
- Dynamic styles use inline `style`; static styles use classes or extracted components.
- Style objects are defined outside the component or memoized.
- Long utility chains are either a shared component or an `@apply` class (where project convention allows).
- Styling changes are reviewable in diff (no giant obfuscated class strings).

Verification:

- Grep for hardcoded color hexes in JSX — flag any outside test fixtures.
- Check that CSS-in-JS style objects are not defined inside component render functions.
- Run an approved, side-effect-checked build and verify no dead CSS warnings from the bundler.

## Configuration & Build Sprawl

Smells:

- Config files for tools no longer in `package.json` (e.g., `.babelrc` after SWC migration).
- Duplicated ESLint/Prettier/TypeScript config across packages in a monorepo when a shared config exists.
- Build output directories (`dist/`, `.next/`, `out/`, `build/`) tracked by git or missing from `.gitignore`.
- `.env.example` missing variables that `process.env.*` references in source.
- Bundler config referencing plugins or aliases for removed dependencies.
- TypeScript `paths` or `references` misaligned with actual package layout.

Better shapes:

- Config files are pruned after tool migrations; dead config is removed in the same PR.
- Monorepo packages extend a shared root config where possible.
- Build output is gitignored; CI artifacts use a separate pipeline cache.
- `.env.example` is kept in sync with actual usage — add variables when they are introduced.
- Bundler config is reviewed whenever a dependency is removed.

Verification:

- Search for config filenames of tools not in `package.json` — zero hits.
- Build output directories are in `.gitignore` and absent from `git status`.
- `.env.example` entries match `grep -rh 'process\.env\.' src/` (modulo public-prefix conventions).

## Accessibility

Smells:

- `<img>` elements without `alt` attribute.
- `<div>` or `<span>` with `onClick` but no `role`, `tabIndex`, or keyboard handler.
- Modals and dialogs that open without focus trapping or restoring focus on close.
- `<input>` / `<select>` / `<textarea>` without an associated `<label>` or `aria-label`.
- Dynamic content (toasts, alerts, spinners) without `aria-live` or `role="status"`/`role="alert"`.
- Status indicators that rely solely on color (red/green) without text or icon.

Better shapes:

- All images have meaningful `alt` or `alt=""` with `role="presentation"` for decorative images.
- Interactive elements use semantic HTML (`<button>`, `<a>`) or have correct `role` + keyboard handlers.
- Modals use a focus-trap pattern and return focus to the triggering element on close.
- Every form control has a visible label or `aria-label`.
- Live regions use appropriate `aria-live` values (`polite` for non-critical, `assertive` for time-sensitive).
- Status changes are communicated through text, icon, or announcement, not color alone.

Verification:

- Run the project's lint rules (many a11y checks are covered by `eslint-plugin-jsx-a11y`).
- Spot-check keyboard navigation: Tab through modals, dialogs, and forms without a mouse.
- Check that automated a11y tooling (axe-core, Lighthouse) is present in CI.

## Frontend Security

Smells:

- `dangerouslySetInnerHTML` used without documented sanitization for user-generated content.
- `<a href={...}>` or `<Link href={...}>` interpolating user input without `javascript:` prefix protection.
- `message` event listeners that don't verify `event.origin` against an allowlist.
- API keys, tokens, or secrets hardcoded in source files (not drawn from `process.env.*`).
- `<script src={...}>` loading external resources without `integrity` (SRI) attributes.
- CSP meta tag or server header set to `default-src *` or similar permissive values.

Better shapes:

- `dangerouslySetInnerHTML` usage is limited to trusted content and cross-referenced in security review.
- User-supplied URLs are validated (parsed, protocol-checked) before use in `href`.
- All `postMessage` listeners check `event.origin` before acting on data.
- Secrets live in environment variables or a secrets manager — never in source.
- External scripts use Subresource Integrity (`integrity` attribute).
- Content Security Policy is restrictive and reviewed when new resource origins are needed.

Verification:

- Grep for `dangerouslySetInnerHTML` — every instance has a documented justification.
- Grep for `message` event listeners — every one has an `event.origin` check.
- Grep for hardcoded secrets (`apiKey`, `secret`, `token` as string literals) — zero hits in source.
- Check that `integrity` attributes are present on all external `<script>` tags.

## Bundle & Build Output

Use existing local analyzers only; do not install tools or create analysis artifacts during the audit.

Smells:

- Entry chunks over ~250 KB (gzip) that aren't code-split.
- Polyfills included for APIs natively supported in the project's browser targets.
- Barrel imports from libraries known to have side effects or no tree-shaking.
- Duplicate instances of `react` / `react-dom` in the lockfile (causes hooks/context bugs).
- Large pages or modals not using lazy loading or dynamic import.
- Source map files publicly accessible in production, or source maps disabled entirely.

Better shapes:

- Route-level and heavy-component code splitting is the default; measure before optimizing individual chunks.
- Browser targets are explicit (`.browserslistrc`, `tsconfig` `lib`) and polyfills are audited against them.
- Prefer direct imports over barrel imports from utility libraries.
- Lockfile is checked for duplicate singletons during code review.
- Source maps are uploaded to error tracking in production, not served to end users.

Verification:

- Run an approved, side-effect-checked build and check output sizes for large entry chunks.
- `npm ls react` shows a single instance.
- Check that route/page components use `React.lazy()` or dynamic `import()`.
- Verify production `.map` files are not publicly accessible.
