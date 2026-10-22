# Deploy plus test plus deps plus safety plus build

Scope: Dockerfiles, compose files, static serving in API, fixture servers, smoke scripts, docs artifacts, core dumps, test infra, deps, error handling, config sprawl, frontend security, bundle output.

Inspect for local cost only. Do not report generic practice without a concrete failure path, maintenance cost, or drift risk in this repo. Flag dead tool configs, duplicated lint or typechecker configs, tracked build output, stale env examples, duplicated test helpers, drifted mocks, flaky timer or network patterns, slow redundant renders, missing CI wiring, mirror tests that repeat implementation literals such as string matches or snapshots without behavior and fail only on copy edits, unused or duplicated deps, empty catch blocks, missing route- or section-level error boundaries, committed logs or debugger statements, user-supplied hrefs, unchecked message origins, entry chunks over ~250KB gzip, duplicated framework runtime instances, missing code splits.

## Test contract audit

Assess test value separately from production-code correctness.

- Identify each changed test's intended behavior and supporting contract.
  Use requirements, public APIs, schemas, consumers, or platform behavior.
  Current implementation values alone do not establish a contract.
- Name a plausible regression the test detects and a valid refactor it permits.
- Flag assertions that freeze incidental classes, wrappers, SVG dimensions,
  layout formulas, or private calls. State their concrete maintenance cost.
- Preserve exact assertions for genuine parser, formatter, linter, wire-format,
  accessibility, and public customization contracts.
- Test layout outcomes in a browser: usable controls, containment, overlap,
  focus, and interaction. JSDOM class checks do not prove rendered behavior.
- Check for duplicate coverage and assertions that merely confirm fixture setup.
- Report the test-contract assessment explicitly. Passing runs and test counts
  do not establish test quality.

Return concise findings using `reporting.md`: relevant background, the direct change, source evidence, and verification. Flag fixture harnesses that replaced a second implementation as useful boundaries when that evidence rules out a proposed removal.
