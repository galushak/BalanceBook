# Original application restored — 2026-09-10

`main` is based on the source recovered from `balancebook-fresh:20260910`, the application running immediately before the Plaid-first rework. It retains earlier CSV reconciliation, merchant matching and original Plaid review-only integration. It does not include the new automatic bank-ledger or bank-balance model.

The test server was restored to that image and the financial snapshot `balancebook-backup-2026-09-10T18-16-40-502Z-36dceb59.zip`. The encrypted Plaid key and login configuration remain in place. The restore invalidates sessions and offline mutations through a new epoch.

The rework remains on local branch `plaid` at `e55afe0`. Its financial state was separately backed up before rollback as `balancebook-backup-2026-09-10T19-17-23-610Z-1486005b.zip`; restore also created `balancebook-backup-2026-09-10T19-19-35-127Z-7b184486.zip`.

Validation: original source passes TypeScript checks and 40 tests; original Docker app responds successfully to its health endpoint.
