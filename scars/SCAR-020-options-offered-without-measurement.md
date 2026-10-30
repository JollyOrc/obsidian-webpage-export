# SCAR-020 — An option is offered to the user without being measured

**Area:** Requirements / Decision making
**Severity:** Medium — the user chose an option that did not work; it was measured only after the choice and put back as a counter-offer

---

## What went wrong

A decision was put to the user as a choice between alternatives. One
alternative had been measured with the real consumer; the other was described
from how it should behave. The user chose the unmeasured one. When it was
measured afterwards, it failed in a case the description had not mentioned,
and the decision had to be reopened.

In this project: US-018 offered page numbers after internal links either
always or "only when the target is on another page". The second was chosen.
Measured afterwards, it oscillated at a page edge (moved from SCAR-008 on
2026-10-22; the layout side of it is SCAR-021).

## Root cause

An alternative that was only described looks as solid as one that was
measured, and the person choosing cannot tell them apart. The cost of
measuring was saved at the point where it was cheapest, before anyone relied
on the result.

## Prevention

- Measure every alternative with the real consumer before it is offered as a
  choice; an alternative that only one option was measured for is not an equal
  choice.
- When an alternative cannot be measured in time, say so in the question
  ("not measured: …") so that the choice is made knowing it.
- Applies next to: every open decision in a story, every counter-offer, and
  every "A or B" put to the user.
