# The plan, in the repo

These are the two source documents the product is built from. They lived in
the owner's Downloads folder until 2026-08-29, which meant every conversation
about conformance started by pasting them in again.

| File | What it is |
|---|---|
| `technical-build-plan.md` | Challenge Studio — Technical Build Plan. Architecture, stack, domain shape, schema rules, the six timing models, the eleven milestones, and the open decisions. |
| `product-requirements.pdf` | Challenge Studio — Product Requirements & Build Brief v1.0. The source of truth for what the product does. |
| `product-requirements.txt` | The same PRD as text, so it can be searched with `grep` and diffed. Regenerate with the command below. |

```bash
pdftotext -layout docs/plan/product-requirements.pdf docs/plan/product-requirements.txt
```

## Reading them

Both are **planning documents**. The build plan says so on its first page: no
implementation or migrations were authorised by it. Where the built product
differs from either — and it does, in a handful of places — the differences
are recorded in [`../plan-conformance.md`](../plan-conformance.md) rather than
by quietly editing the plan. A plan edited to match the code stops being able
to tell you anything.

The decisions the plan left open are tracked one file each in
[`../decisions/`](../decisions/).

## If either document is revised

Replace the file, regenerate the `.txt`, and then re-check
`plan-conformance.md` — its whole value is being accurate about the gap.
