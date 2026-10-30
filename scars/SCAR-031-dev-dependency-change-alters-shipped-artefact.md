# SCAR-031 — Adding a development tool changes the artefact that ships

**Area:** Dependencies / Release
**Severity:** Medium — the shipped bundle changed without any source change; found only because its checksum was compared

---

## What went wrong

Test tools (a test runner and a formatter) were added as development
dependencies. The package manager resolved the new tree and, to satisfy a
peer range of the test runner's bundler, lifted two runtime dependencies of
the plugin to newer versions. The plugin's own code was not touched, the
build passed, and every test passed. The bundle that ships to users was
nevertheless different.

In this project: US-001, step 2 (2026-10-30). Installing Vitest 3.2.7 moved
postcss 8.4.47 → 8.5.32 and nanoid 3.3.7 → 3.3.20; the `main.js` checksum
changed from `628d…` to `9baa…`. postcss was pinned back; the remaining
8-line difference was the nanoid fix of CVE-2024-55565, accepted by the user.

## Root cause

"Development dependency" was read as "cannot affect the product". A package
manager resolves one tree for development and runtime packages together;
hoisting and deduplication let a development package's requirements move a
shared runtime package. Nothing in the workflow compared the artefact before
and after a dependency change, so the only signal would have been a user's
bug report.

## Prevention

- Record the checksum of the release artefact (the bundle, the package)
  before any dependency change, rebuild after it, and compare. A difference
  without a source change is a finding, not noise.
- Classify every difference: list the lockfile packages whose versions
  moved, find which of them reach the artefact, and diff the artefact to see
  the actual code change (here: 8 lines, one package).
- Pin a runtime dependency that a development tool would move, or accept the
  move as a decision of the user with its reason (security fix, bug fix);
  never let it pass silently.
- Keep the artefact checksum as an invariant of every ticket that touches
  `package.json` or the lockfile.
- Applies next to: adding or upgrading test tools, linters, type packages,
  bundler plugins; `npm audit fix`; lockfile regeneration.
