# SCAR-009 — Rules derived from isolated examples miss what surrounds the input

**Area:** Verification / Specification
**Severity:** Medium — a wrong rule was written into the story and the first implementation; found only by an exhaustive check

---

## What went wrong

The escaping rules for a markup language were derived by trying single
examples in isolation ("a lone `+` stays plain"). The examples were right for
the place they were tried (the end of a whole block) and wrong for the place
the output is really used (the end of a line that is followed by more text,
where the same `+` is an empty list item). The story, its examples, and the
first implementation all carried the mistake.

In this project: US-013 AC-3 first said a lone `=`, `-`, `+`, or `12.` needs no
escape. The round-trip test over every printable character, in four positions
including "before a line break", failed on `+\n+ y`.

## Root cause

An example answers "what happens here", not "what happens wherever this text
can end up". Context that comes **after** the input (a following line break, a
closing delimiter, a neighbouring element) is easy to leave out because the
probe has nothing after it.

## Prevention

- For any function whose output is embedded in a larger document, test every
  basic input in every position that matters: at the start, in the middle, at
  the end, before a line break, and after a line break.
- Prefer an exhaustive or generated round-trip check against the real consumer
  (here the compiler) over a hand-picked list of examples; build it before
  trusting the rules (SCAR-008: verify by program).
- When deriving a rule from probes, write down the context of each probe and
  list which contexts were not tried.
- When generated text moves into a new container (a content block, a call
  argument, a string), its start is a new block start: re-check the escaping
  options there instead of carrying over the options of the old position.
  Example (2026-10-19, US-017): heading text emitted with the heading options
  was safe as `== - x` but became a list item inside `#glossary-term[- x]`;
  the term text is now emitted at block start (`\- x`).
