# Deploy plus test plus deps plus safety plus build

Scope: Dockerfiles, compose files, static serving in API, fixture servers, smoke scripts, docs artifacts, core dumps, test infra, deps, error handling, CSS hygiene, config sprawl, a11y, frontend security, bundle output.

Inspect for local cost only. Do not report generic practice without a concrete failure path, maintenance cost, or drift risk in this repo. Flag dead tool configs, duplicated lint or typechecker configs, tracked build output, stale env examples, duplicated test helpers, drifted mocks, flaky timer or network patterns, slow redundant renders, missing CI wiring, mirror tests that repeat implementation literals such as string matches or snapshots without behavior and fail only on copy edits, unused or duplicated deps, empty catch blocks, missing route- or section-level error boundaries, committed logs or debugger statements, orphan CSS, hardcoded tokens, user-supplied hrefs, unchecked message origins, entry chunks over ~250KB gzip, duplicated framework runtime instances, missing code splits.

Return: user-observable behavior, `file:line`, code terms used, ordered steps the code takes today, maintenance cost, smallest correction, verification check. Flag fixture harnesses that killed a second implementation as keeps.
