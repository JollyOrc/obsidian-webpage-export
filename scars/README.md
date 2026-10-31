# SCARs — Situation, Cause, Action, Resolution

This folder contains **SCAR documents**: post-incident writeups for things
that went wrong during development. Each SCAR is written to be project-
independent — the lesson should apply to any software project, not just this
one. Project-specific implementation bugs live in the git history; SCARs are
for patterns that will recur if not consciously addressed.

## Format

Each SCAR covers:

- **What went wrong** — the observable symptom, with a brief project example
- **Root cause** — the underlying reason it happened
- **Prevention** — concrete changes to process or practice

## Index

Every SCAR is checked at G0 (story review) and G3 (each ticket's SCAR
check). The Gates column names the further gates at which it is checked
again (`CLAUDE.md`, rule 9): G1 story written, G2 tests written, G4 ticket
done or manual-test handover.

| ID | Title | Area | Severity | Gates |
|----|-------|------|----------|-------|
| [SCAR-001](SCAR-001-shared-utility-undocumented-transforms.md) | Shared utilities reused without documenting their transforms | Documentation | Medium | G2 |
| [SCAR-002](SCAR-002-spec-happy-path-only.md) | Specifications written only for the top-level happy path | Requirements | High | G1 |
| [SCAR-003](SCAR-003-ac-not-fully-checked-before-shipping.md) | Acceptance criteria not fully checked before shipping | Process | High | G2 |
| [SCAR-006](SCAR-006-no-ci-gate-before-release.md) | No automated test gate before release | Process / CI | High | G4 |
| [SCAR-007](SCAR-007-ac-without-concrete-examples.md) | Acceptance criteria stated without concrete examples | Requirements | Medium | G1 |
| [SCAR-008](SCAR-008-silent-misuse-of-drawing-api.md) | Drawing API used with guessed arguments; blank output misread as a verdict on the library | Integration / Verification | Medium | G2 |
| [SCAR-009](SCAR-009-rules-verified-only-in-isolation.md) | Rules derived from isolated examples miss what surrounds the input | Verification / Specification | Medium | G2 |
| [SCAR-010](SCAR-010-join-hazards-between-generated-pieces.md) | Each generated piece is valid; the join between two pieces is not | Verification / Specification | Medium | G2 |
| [SCAR-011](SCAR-011-generated-names-clash-with-natural-names.md) | A generated name is unique against its own kind, not against the names the source already has | Specification / Verification | Low | G2 |
| [SCAR-012](SCAR-012-test-environment-not-ready-for-handover.md) | A manual test is handed over with a stale or incomplete environment, and the build cannot be told apart from an older one | Process / Verification | Medium | G4 |
| [SCAR-013](SCAR-013-dialog-ignores-enter-key.md) | An input dialog can only be confirmed with the mouse | Usability / Specification | Low | G1 |
| [SCAR-014](SCAR-014-destructive-action-without-confirmation.md) | A destructive action runs on one click, without asking | Usability / Data safety | Medium | G1 |
| [SCAR-015](SCAR-015-output-checked-for-success-not-for-content.md) | Every check passes on an output that is missing its main content | Verification / Acceptance | High | G1, G2, G4 |
| [SCAR-016](SCAR-016-ui-acts-on-stale-snapshot.md) | A control shows or acts on the state of the moment it was drawn, not the state of now | Usability / Specification / Verification | Medium | G1, G4 |
| [SCAR-017](SCAR-017-fix-applied-to-one-instance-only.md) | A defect is fixed where it was seen, and the same pattern stays broken everywhere else | Process / Verification | Medium | G1 |
| [SCAR-018](SCAR-018-test-tooling-without-proven-undo.md) | Test tooling changes the sources and does not prove that it put them back | Process / Verification | Medium | G4 |
| [SCAR-019](SCAR-019-rule-specified-only-at-default.md) | A configurable rule is specified and tested only at its default value | Requirements / Verification | Medium | G1, G2 |
| [SCAR-020](SCAR-020-options-offered-without-measurement.md) | An option is offered to the user without being measured | Requirements / Decision making | Medium | G1 |
| [SCAR-021](SCAR-021-self-referential-output-not-checked-for-stability.md) | Output that depends on its own layout is not checked for stability | Verification | Medium | G2 |
| [SCAR-022](SCAR-022-callback-data-availability-not-listed.md) | A design assumes data that a callback does not have when it runs | Requirements / Integration | Medium | G1 |
| [SCAR-023](SCAR-023-guard-not-matched-to-its-criterion.md) | A guard or test does not check what its criterion says | Verification | Medium | G2, G4 |
| [SCAR-024](SCAR-024-dependency-behaviour-stated-not-measured.md) | A story states what a dependency does without measuring it | Requirements / Integration | Medium | G1, G2 |
| [SCAR-025](SCAR-025-rendered-output-inspected-too-small.md) | Rendered output is inspected too small to see its defects | Verification | Low | G4 |
| [SCAR-026](SCAR-026-pattern-match-taken-for-instance.md) | A pattern match is taken for an instance of the class it is meant to find | Requirements / Verification | Medium | G1, G4 |
| [SCAR-027](SCAR-027-replacement-specified-from-the-replaced-thing.md) | A replacement is specified from the thing it replaces, not from what its users rely on | Requirements | Medium | G1 |
| [SCAR-028](SCAR-028-test-reader-trusted-unchecked.md) | A test reader is trusted without a check of its own | Verification / Test tooling | Medium | G2, G4 |
| [SCAR-029](SCAR-029-human-steps-buried-in-one-file.md) | Procedures a human runs are kept as sections of one large file | Process / Documentation | Low | G1, G4 |
| [SCAR-030](SCAR-030-test-time-limit-left-at-default.md) | A test's time limit is left at the default for heavy work | Verification / Test tooling | Low | G2, G4 |
| [SCAR-031](SCAR-031-dev-dependency-change-alters-shipped-artefact.md) | Adding a development tool changes the artefact that ships | Dependencies / Release | Medium | G2, G4 |
| [SCAR-032](SCAR-032-count-over-generated-output.md) | A count over a folder includes generated output | Verification / Tooling | Medium | G2, G4 |
| [SCAR-033](SCAR-033-whole-tree-check-before-its-ticket.md) | A whole-tree check is assigned to a ticket that cannot make it green | Process / Specification | Low | G2 |
| [SCAR-034](SCAR-034-fix-measured-only-in-the-test-environment.md) | A fix is measured only in the test environment and fails where the user runs it | Verification / Requirements | High | G1, G4 |

## Recurring themes

**Requirements too vague** (SCAR-002, SCAR-007)
Specs describe intent but not mechanics. Any AC involving a structural,
numeric, or positional outcome needs a concrete example with exact values.
"The heading appears at the right level" is intent; `## Foo` at depth 2
is a requirement. Every example is run through the whole converter, with all
stories' rules on, before it goes into a story, and the composed cases name
inline wrappers (bold, links) as well as block containers (SCAR-002). A story
built on another lists that story's decisions about the shared output, gives
each a composed example, and asks what the other story leaves unstated.

**Process gaps let failures accumulate** (SCAR-003, SCAR-006)
Without a gate that enforces "all ACs ticked" before merge and "tests green"
before release, gaps and regressions compound silently across releases.
Automation is the only reliable enforcement.

**Silent failures misread** (SCAR-008)
An API that accepts the wrong argument without complaint produces empty
output. Treat empty output as our bug first, and verify results by program,
not only by eye.

**Choices and contracts not measured** (SCAR-020, SCAR-021, SCAR-022)
Measure every alternative before offering it (SCAR-020). Output that depends
on its own layout is swept across a page edge; non-convergence is not
reported (SCAR-021). For every callback, read from its type whether it runs
synchronously and list what data it has at that moment; what needs an
asynchronous read moves into the action after the click (SCAR-022).

**Rules checked only where they were tried** (SCAR-009)
A rule that holds in the probe may fail where the output is really used.
Test every position (start, middle, end, before and after a line break)
against the real consumer; text moved into a new container starts a new block.

**Joins between generated pieces** (SCAR-010)
When output is built by concatenation, list what a neighbouring character can
do to each piece, measure it with the real consumer, keep guard tests, and
test piece × neighbour as a cross product.

**Generated names clash with natural names** (SCAR-011)
When a rule makes names unique, state the invariant (no two names are equal),
check against every name already handed out, and test a source name that looks
like a generated one.

**Handover to a human tester** (SCAR-012)
Make the test environment complete and current before the handover (build
installed and compared, fixtures in place), name where the test runs, and give
every test build its own visible version so a stale build is spotted at once.
A fixture that names a file uses a name that is unique where it is looked up.

**Interaction rules nobody wrote down** (SCAR-013, SCAR-014)
Specify how a dialog is operated (Enter confirms, Escape cancels, IME
composition does not submit) and put a confirmation in front of every
destructive action, with the safe button as default. Recoverability (trash)
does not replace asking.

**Success without content** (SCAR-015)
State the content the output must have (text, fonts, images) in every
end-to-end criterion and manual check, keep a guard test that shows the blank
result, and ask testers to report anything odd the list did not mention.

**Stale screens** (SCAR-016)
A control must read the state when it is used, not the one captured while it was
drawn. Specify and test the order draw, change the data, use the control, and
run manual checks on a tab that stays open. A new way to change a value lists
every screen that shows it and how each one updates; a screen drawn before its
data is loaded counts, so the loader announces every load.

**Fix the class, not the instance** (SCAR-017)
When a defect is found, search for the pattern, list every instance in the
ticket, state the rule for the whole class in the story, and put the pattern in
one function with a text check over the file that fails for a new copy. A story
that adds a way to change a value finds every writer by grepping the value. The
fix's own story, tests and tickets go through the same check.

**Guards that miss their criterion** (SCAR-023)
A guard checks exactly its criterion, not less and not more: it counts the
places it checked, matches the whole statement, uses inputs the real producer
gives, and is proven by a mutation check; a test that one side wins also
shows the other side was in effect; before tickets, the tests are searched
for guards that forbid a call the ticket adds and, by function name, for
tests that pin the whole result the ticket widens; a "same output twice" test
runs from two fresh starts.

**Statements about tools are measured** (SCAR-024)
Every sentence in a story about what a dependency does is split into its
parts, and each part has a test with the real tool, or is marked as not
measured. An explanation of a failure stays unverified until a test shows it.

**Visual output at reading size** (SCAR-025)
A result judged by looking at it is inspected at its printed or reading size,
with the joins of separately drawn parts zoomed in on.

**Matches are not instances** (SCAR-026)
A search result is classified by context before it is counted, offered as a
choice or replaced; a choice shows the split; a scripted replace works from a
reviewed keep-list.

**Replacements follow their users** (SCAR-027)
Before a replacement's acceptance criteria are written, every user of the
replaced thing is listed with what it asserts or assumes; each becomes a
criterion or a named change of that user.

**Test readers are checked too** (SCAR-028)
When a reader of output returns less than the source holds, the reader is
checked on a known input first; a reader of a format is tested per syntax rule
of the format.

**One file per human step** (SCAR-029)
What a human runs, answers or approves on its own is a file of its own with an
index that links each file; a test keeps index and files one to one, and tests
read a unit by its id, not by slicing a larger file.

**Time limits are measured** (SCAR-030)
A test that does seconds of work itself states its time limit, measured under
a full parallel run with a margin; a timeout is first run alone before the
code is blamed, and a raised limit goes to every test doing the same work.

**Rules at non-default values** (SCAR-019)
A rule that reads a setting gets examples and tests at the default, at both
ends of the range and at one non-default value; a decision asked in terms of
the default is also asked for the other values.

**Test tooling must prove its undo** (SCAR-018)
Back up by full path with a checksum list, check it after every restore, stop
the run on a failed check, and count a mutant only on a tree verified before
and after it. A survivor is a finding about the tests (SCAR-023). The backup
holds the state to return to: for a manual check, the state as handed over.
A scripted edit leaves out files that change only with the user's approval.

**Development tools reach the product** (SCAR-031)
Compare the release artefact's checksum before and after every dependency
change; classify each difference; pin or decide, never let it pass.

**Counts over the right files** (SCAR-032)
A count or baseline names the files it is over, excludes generated and
third-party files by path, and is measured with and without them present.

**Whole-tree checks and ticket order** (SCAR-033)
When tests are written, name for each whole-tree check the ticket after
which it can be green.

**Fixes measured where the failure happens** (SCAR-034)
A failure seen only in the user's environment is fixed by an approach
measured there before the story builds on it; every claim names the
environment it was measured in.

**Shared code underdocumented** (SCAR-001)
A utility's secondary transforms (not just its primary purpose) must be
documented so callers can judge whether reuse is safe. Undocumented transforms
are silent bugs waiting for the next call site.
