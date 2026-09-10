# Medical Terminology spec sync — runbook

**Status:** designed, NOT executed. No part of this has been applied to the shared database.
**Written:** HOSA phase H4-C1, 2026-09-10.

Repository truth and the shared database disagree about HOSA Medical Terminology. Phase H4-B verified
the 2026-27 guidelines and recorded them in the repository; phase H4-B.1 was blocked rather than
forcing a partial write. This runbook is the single synchronization that closes that gap, to be run
once, by the owner, when the model is complete.

## Why there is no `prisma/migrations/` directory

This repository has never used Prisma's migration engine. `prisma/` contains only `schema.prisma` and
`seed.ts`; schema changes reach the database through `npm run db:push`. Creating a first migration
file now would be worse than useless: a later `prisma migrate deploy` against the already-populated
shared database fails with **P3005 — the database schema is not empty** unless someone first
baselines every table that exists today. That is a trap laid for whoever runs it next.

So the exact DDL is recorded **here** instead, generated from local schema files only
(`prisma migrate diff --from-schema-datamodel … --to-schema-datamodel … --script`, no database
connection). `db:push` produces the same result; this is what it will do.

## 1. Schema change — exact operations

```sql
-- CreateTable
CREATE TABLE "SpecTestPlanRow" (
    "id" TEXT NOT NULL,
    "specId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "weightPercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpecTestPlanRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpecTestPlanRow_specId_order_idx" ON "SpecTestPlanRow"("specId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "SpecTestPlanRow_specId_key_key" ON "SpecTestPlanRow"("specId", "key");

-- AddForeignKey
ALTER TABLE "SpecTestPlanRow" ADD CONSTRAINT "SpecTestPlanRow_specId_fkey" FOREIGN KEY ("specId") REFERENCES "CompetitionSpec"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Every operation is additive. No existing table is altered, no column is dropped or retyped, and no
existing row is touched by the schema step. Code running against the old client keeps working.

## 2. Data change — what `npm run specs:seed` will write

The seed is idempotent on `(organization, eventName, season, version)`. Expect this, and confirm each
line against the database before accepting the run:

| # | Write | Notes |
|---|-------|-------|
| 1 | Upsert 4 CompetitionSpec rows | DEBATE PF, DECA HLM, HOSA MT, MODEL_UN GA |
| 2 | **INSERT** HOSA MT `2026-2027` v1 | A new season is a new unique key — this is an insert, not an edit of the existing `2025-2026` row |
| 3 | Delete + recreate SpecRubricCategory rows per spec | Pre-existing behaviour, unchanged by H4-C1 |
| 4 | **INSERT 12 SpecTestPlanRow rows** for HOSA MT | The 2026-27 written test plan; 45 + (11 × 5) = 100 |
| 5 | **Deactivate superseded specs** | `isActive = false` on any other active row with the same organization + event name |

Write 5 is new in H4-C1 and is the only write that changes rows the seed did not create. It exists
because `getActiveSpec` returns the newest active row by season: without it, MT `2025-2026` stays
active and invisible, and the registry holds two rows both claiming to be current. Expected effect on
the shared database: the existing MT `2025-2026` row is retired. **Confirm before running** that this
is the only spec it will touch — the seed logs each deactivation by organization and event.

The seed refuses to write at all if any test plan fails validation (missing or duplicate key, empty
label, non-positive weight, out-of-sequence order, or weights not totalling 100). It validates every
plan before the first write, so a bad transcription cannot leave the registry half-seeded.

## 3. Sequence

```bash
npm run db:push        # applies section 1 — additive, safe on a populated database
npm run specs:seed     # applies section 2 — read the log lines before accepting
```

Both are owner-approved actions against a shared production database. Neither may be run by an agent.

## 4. Verification after the run

- `CompetitionSpec` has exactly one active HOSA Medical Terminology row, season `2026-2027`.
- That spec has 12 `SpecTestPlanRow` children whose `weightPercent` sums to 100.
- That spec still has exactly **one** `SpecRubricCategory` row worth **50** points. The plan totals
  100 percent and the rubric totals 50 points; they describe different things and neither number may
  be rendered as the other.
- The Medical Terminology event page shows the September 2026 source label and verification date.

## 5. Rollback

`DROP TABLE "SpecTestPlanRow";` reverses section 1 completely. Section 2 is reversed by restoring
`isActive = true` on the MT `2025-2026` row and deleting the MT `2026-2027` row; nothing else the
seed writes differs from what it already wrote.
