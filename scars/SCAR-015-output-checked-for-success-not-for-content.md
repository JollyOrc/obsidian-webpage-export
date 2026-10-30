# SCAR-015 — Every check passes on an output that is missing its main content

**Area:** Verification / Acceptance
**Severity:** High — the whole export "worked" (zero compile errors, PDF header, images, page size, all automated tests and all manual M3 steps green) while the PDF contained no text at all

---

## What went wrong

M3 (US-008, US-007) passed. Afterwards the tester added that the PDF had no
visible text; he had not reported it because the check did not say text was
expected. The cause was simple: the plugin ships no fonts and the export passed
an empty font list, and the compiler does not warn about that (spike S4:
unknown families and missing glyphs are silent). The images were in the PDF, so
the output looked plausible at a glance.

## Root cause

Success was defined by the absence of errors and by the presence of
containers (file exists, `%PDF-` header, size above 1000 bytes, page size),
never by the presence of the content the reader is there for. The same
blind spot sat in the automated test, the acceptance criterion
("zero compile errors in 30 s") and the manual check (the list of what to
see did not include the text). A tester who reports only what the list asks
for does not report what the list forgot, and a test cannot see what it
does not assert. The known state ("the font list is empty until US-010") was
noted in the code but never connected to a statement of what the user then
gets.

## Prevention

- An end-to-end acceptance criterion names the content that must be in the
  output, not only that producing it did not fail: for a PDF, the text of a
  known sentence, the fonts that are embedded, the number of images. "No
  errors" is a necessary condition and never the definition of done.
- Keep a guard test that shows the blank result (compile without fonts:
  the PDF names no font) beside the test that shows the real one, so the
  difference is visible and measured with the real consumer (compare SCAR-008).
- Manual checks end every procedure with an open question: "Is anything
  missing, odd or ugly that this list did not ask about? Report it even if it
  seems unrelated", and list what a correct result looks like (what is
  readable on page 1, which images, which fonts), not only what must not
  fail.
- A known gap that makes the output visibly incomplete (no fonts, no cover)
  is stated in the check and in the handover as a known limitation, or it is
  closed before the handover. Never leave it for the tester to find.
- Applies next to: previews, cover pages, headers and footers, fonts per role,
  anything that is judged by looking at it.
