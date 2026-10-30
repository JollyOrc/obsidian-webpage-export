# SCAR-011 — A generated name is unique against its own kind, not against the names the source already has

**Area:** Specification / Verification
**Severity:** Low — caught while reviewing US-002 before any code existed; a latent failure that only shows when something links to the clashing name

---

## What went wrong

US-002 AC-3 made heading labels unique by adding a counter to a repeated title:
`h-intro`, `h-intro-2`, `h-intro-3`. A heading whose own title is `Intro 2` also
has the label `h-intro-2`. The two labels were never compared, because the rule
only counted repeats of one title. The real file has no such pair, so the
example-based tests would never have found it. The compiler does not complain
either: a duplicate label is an error only when something links to it
(measured: `label occurs multiple times`), so the failure would appear much
later, in the output of a user whose note happens to contain such titles.

## Root cause

Uniqueness was specified as "repeats are numbered", which makes the generated
names distinct from each other but says nothing about names that the source
itself produces. Any rule that builds an identifier from user text (labels,
file names, anchors, footnote keys) has two name spaces: the generated suffixed
names and the natural ones.

## Prevention

- When a rule makes names unique, state the invariant ("no two names are equal")
  and not the procedure ("the second one gets -2"). Then ask which natural input
  produces a name of the generated shape (`x-2`, `x (1)`, `x_copy`).
- Choose a procedure that checks against everything already handed out (a set of
  used names), not a count per title.
- Test the clash directly (title that looks like a suffixed name, before and
  after the title it clashes with) and test the invariant over a mixed
  document and over the real file.
- Keep a guard test that shows the failure the invariant prevents, measured with
  the real consumer, so it is clear why the rule exists.
- Applies next to: copied asset file names (US-003), footnote keys (US-005),
  figure labels, anything derived from a note name.
