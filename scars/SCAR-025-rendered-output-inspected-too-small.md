# SCAR-025 — Rendered output is inspected too small to see its defects

**Area:** Verification
**Severity:** Low — every automated check and every step of the manual check passed; the user saw the defect at a glance at reading size

---

## What went wrong

A page background was drawn from four separately drawn gradient strips. Before
the handover the rendered page was looked at as a small image (437 px high),
and it looked right. At reading size the strips showed hard seams where they
overlapped: the strip drawn last covered the others. The programmatic checks
(colours present, gradients counted) could not see it either, because every
colour and every gradient was there.

In this project: the "A5 MU Print" template (US-023, M13, 2026-10-22); fixed by
fading each strip to transparent.

## Root cause

Visual inspection was done at a size chosen for convenience, not at the size
the reader uses. Defects at joins (overlaps, edges, corners) are a few pixels
wide and vanish when the image is scaled down, and checks by program count
parts without looking at how they meet.

## Prevention

- A rendered result that is judged by looking at it is inspected at least at
  its printed or reading size (for a page: the whole page at full width, not
  a thumbnail).
- The joins of separately drawn parts — overlaps, edges, corners, the meeting
  of backgrounds and frames — are zoomed in on before the handover.
- When a visual defect is found, a check by program that tells the defect
  from the fix is added where one exists (here: the number of shading
  objects, opaque against blending strips).
- Applies next to: backgrounds, frames and ornaments, cover pages, image
  crops, the preview's canvas.
