# Unreachable dispute code — archived 23 July 2026

Three closed islands, 3,013 lines. Nothing outside each island imported it, so
none of it ran. Archived rather than deleted so it stays findable; nothing here
compiles, because both `tsconfig.json` files only include `src`.

## `DisputeService.ts` + the three models — a boot hazard, not just dead

`DisputeService.ts` (585) with `models/Dispute.ts` (324), `DisputeChat.ts` (141)
and `DisputeEvidence.ts` (181). Zero importers, and importing it throws
immediately:

```
Error: Cannot find package 'sequelize' imported from .../models/DisputeEvidence.ts
```

**`sequelize` is not a dependency of this project** — not in `package.json`, not
in `node_modules`. The models are written against Sequelize while the rest of
the codebase uses raw `pg`. There is a second problem underneath that one which
nothing ever reaches: the models do `import sequelize from '../db'`, and `db.ts`
exports a `pg.Pool`, so even with the package installed they would not work.

`routes/disputes.ts` used to route its evidence read through this service, which
is how it crashed the server on boot; that call was replaced with a direct query
some time ago. Anyone reaching for this service again would break startup, which
is the reason it is out of `src` rather than merely unused.

## `disputeMessagesV2.ts` + `disputeAnalysisV2.ts`

468 and 520 lines. `disputeMessagesV2` imports `disputeAnalysisV2`; nothing
imports `disputeMessagesV2`. A self-contained pair with no entry point.

Superseded by `services/hanaDisputeProposal.ts` (Hana proposes, an admin
decides) and `services/disputeOutcomeMessages.ts` (Hana drafts what each side is
told, an admin sends it).

## `disputeVerdictService.ts` + `disputeVerdictValidator.ts`

313 and 481 lines. `disputeVerdictService` imports the validator; `disputes.ts`
imported `saveDisputeVerdict` and **never called it**, so dropping that import
left the pair orphaned.

This was a third verdict vocabulary — `full_payment` / `refund` /
`partial_payment`, written to a `dispute_decisions` table — alongside the two the
module already had. Consolidating on one decision path is what the 23 July work
was about; see `DISPUTE_FINDINGS.md`. The live path is
`applyMonetaryDecision()` in `services/disputeSettlement.ts`.

## Bringing any of it back

Move the files to `backend/src/services` and `backend/src/models`. For the
Sequelize island you would first have to add `sequelize` as a dependency and
give the models a real Sequelize instance — `db.ts` cannot provide one. Before
wiring any of it to a decision, route it through `applyMonetaryDecision()`, or
it recreates the multiple-writers problem that caused the appeal to pay out the
wrong split.
