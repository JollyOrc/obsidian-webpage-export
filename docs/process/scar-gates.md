# SCAR gates in this project

The SCARs themselves live in the shared repository
<https://github.com/JollyOrc/scars>, mounted here as the git submodule
`scars/`. Which gates check which SCAR is this project's own process, so the
table lives here (moved from the "Gates" column of the former
`scars/README.md` on 2026-11-05).

Every SCAR is checked at G0 (story review) and G3 (each ticket's SCAR
check). The Gates column names the further gates at which it is checked
again (`CLAUDE.md`, rule 9): G1 story written, G2 tests written, G4 ticket
done or manual-test handover.

Numbers changed on 2026-11-05: this project's former SCAR-031 to SCAR-034 are
now SCAR-042 to SCAR-045 (table "Former numbers" in `scars/README.md`).
SCAR-031, 032 and 033 to 041 came from the other two projects and have no
further gates here yet.

| ID | Title | Gates |
|----|-------|-------|
| SCAR-001 | Shared utilities reused without documenting their transforms | G2 |
| SCAR-002 | Specifications written only for the top-level happy path | G1 |
| SCAR-003 | Acceptance criteria not fully checked before shipping | G2 |
| SCAR-006 | No automated test gate before release; test failures accumulated silently | G4 |
| SCAR-007 | Acceptance criteria stated without concrete input/output examples | G1 |
| SCAR-008 | Third-party drawing API used with guessed arguments; blank output misread as a verdict on the library | G2 |
| SCAR-009 | Rules derived from isolated examples miss what surrounds the input | G2 |
| SCAR-010 | Each generated piece is valid; the join between two pieces is not | G2 |
| SCAR-011 | A generated name is unique against its own kind, not against the names the source already has | G2 |
| SCAR-012 | A manual test is handed over with a stale or incomplete environment, and the build cannot be told apart from an older one | G4 |
| SCAR-013 | An input dialog can only be confirmed with the mouse | G1 |
| SCAR-014 | A destructive action runs on one click, without asking | G1 |
| SCAR-015 | Every check passes on an output that is missing its main content | G1, G2, G4 |
| SCAR-016 | A control shows or acts on the state of the moment it was drawn, not the state of now | G1, G4 |
| SCAR-017 | A defect is fixed where it was seen, and the same pattern stays broken everywhere else | G1 |
| SCAR-018 | Test tooling changes the sources and does not prove that it put them back | G4 |
| SCAR-019 | A configurable rule is specified and tested only at its default value | G1, G2 |
| SCAR-020 | An option is offered to the user without being measured | G1 |
| SCAR-021 | Output that depends on its own layout is not checked for stability | G2 |
| SCAR-022 | A design assumes data that a callback does not have when it runs | G1 |
| SCAR-023 | A guard or test does not check what its criterion says | G2, G4 |
| SCAR-024 | A story states what a dependency does without measuring it | G1, G2 |
| SCAR-025 | Rendered output is inspected too small to see its defects | G4 |
| SCAR-026 | A pattern match is taken for an instance of the class it is meant to find | G1, G4 |
| SCAR-027 | A replacement is specified from the thing it replaces, not from what its users rely on | G1 |
| SCAR-028 | A test reader is trusted without a check of its own | G2, G4 |
| SCAR-029 | Procedures a human runs are kept as sections of one large file | G1, G4 |
| SCAR-030 | A test's time limit is left at the default for heavy work | G2, G4 |
| SCAR-031 | Decisions left in the plugin's entry point, where no test reaches them | — (new here 2026-11-05; decide at the next G5) |
| SCAR-032 | A finding is claimed wider than what was measured | — (new here 2026-11-05; decide at the next G5) |
| SCAR-033 | A path from the user is joined as text, and the write lands somewhere nobody chose | — (new here 2026-11-05; decide at the next G5) |
| SCAR-034 | A file is classified by its first line before its metadata header is removed | — (new here 2026-11-05; decide at the next G5) |
| SCAR-035 | Real user data serves as the development and test data | — (new here 2026-11-05; decide at the next G5) |
| SCAR-036 | A licence conflict is fixed in the build, but the artifacts already shipped keep it | — (new here 2026-11-05; decide at the next G5) |
| SCAR-037 | A dependency applies its defaults after the user's input, and the user's settings silently do nothing | — (new here 2026-11-05; decide at the next G5) |
| SCAR-038 | A lookup also reports, so every caller that only looks fills the report | — (new here 2026-11-05; decide at the next G5) |
| SCAR-039 | Invisible markers written into the text are read by steps they were not meant for | — (new here 2026-11-05; decide at the next G5) |
| SCAR-040 | An output format is specified without naming the program that reads it | — (new here 2026-11-05; decide at the next G5) |
| SCAR-041 | A rule that reads the start of a line does not see past a container's marker | — (new here 2026-11-05; decide at the next G5) |
| SCAR-042 | Adding a development tool changes the artefact that ships | G2, G4 |
| SCAR-043 | A count over a folder includes generated output | G2, G4 |
| SCAR-044 | A whole-tree check is assigned to a ticket that cannot make it green | G2 |
| SCAR-045 | A fix is measured only in the test environment and fails where the user runs it | G1, G4 |
