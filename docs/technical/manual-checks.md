# Manual checks

One file per check in [manual-checks/](manual-checks/), named by its id
(`M01.md`, ...). Each check starts with the build version it runs on and the
place where it runs (SCAR-012), and states the content the output must show
(SCAR-015).

| ID | Covers | Story |
|----|--------|-------|
| [M01](manual-checks/M01.md) | Diagnostic export timing with build `1.9.2-diag.1` | — (G0 measurement for US-002) |
| [M02](manual-checks/M02.md) | Pinpoint the freeze in `1.4.3 Magic Skills.md` with build `1.9.2-diag.2` | — (G0 measurement for US-002) |
| [M03](manual-checks/M03.md) | Reproduce the batch freeze with the full selection, build `1.9.2-diag.3` | — (G0 measurement for US-002) |
| [M04](manual-checks/M04.md) | Experiment: 20 s wait for all sections (build `1.9.2-exp.1`), two full runs | — (G0 measurement for US-002) |
| [M05](manual-checks/M05.md) | Full export of the author's selection with US-002 (build `1.9.2-roa.1`) | US-002 AC-8 |
| [M06](manual-checks/M06.md) | Find the step that freezes on `1.4.3 Magic Skills` (build `1.9.2-roa.1-diag.1`) | — (US-002 freeze diagnosis) |
| [M07](manual-checks/M07.md) | Repeat M06 without touching the window | — (US-002 freeze diagnosis) |
| [M08](manual-checks/M08.md) | Export with the detached renderer on the desktop (spike build) | — (US-002 freeze diagnosis) |
| [M09](manual-checks/M09.md) | Detached renderer with section wrappers on the desktop (spike build) | — (US-002 freeze diagnosis) |
| [M10](manual-checks/M10.md) | The detached renderer in the author's vault, full export (build `1.9.2-roa.3`) | US-002 AC-8 (amendment 1) |
