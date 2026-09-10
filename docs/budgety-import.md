# Budgety data conversion

`server/import-budgety.ts` provides a read-only SQLite conversion function. It returns a candidate Balancebook state and a reconciliation report; it does not modify the source database or install data into the running app.

- Account opening balances, posted history, notes, original labels, source identifiers, and next scheduled dates are retained. Amounts are converted to integer cents and every account balance is independently reconciled.
- Transfers to debt accounts become debt payments. For loans, Budgety's credited amount becomes principal with zero interest in that record. Separately recorded interest remains separate. Balancebook's Spent reporting includes loan principal; Budgety's transfer reporting does not.
- Missing categories become Uncategorized. Historical source labels remain available even if the corresponding payee is hidden.
- A transfer without a destination is retained as a read-only historical withdrawal. Savings-goal allocations are read-only references with no additional account movement. Imported goals appear on their account detail page and do not reduce Balancebook's Available Funds.
- Scheduled posting defaults to manual after conversion. No historical occurrences are generated from a rule whose source date represents its next payment.
- Unsupported populated legacy recurrence, category budget, and paystub tables stop conversion for review rather than silently dropping data. Legacy authentication credentials are not read or imported.

For installation, first create a complete rollback backup, validate an isolated candidate database and its backup, stop the app before restoring that candidate, and then verify the live state against the candidate. Changing the ledger epoch prevents stale device writes; local drafts from the prior epoch are cleared.

Keep source backups, candidate databases, reconciliation reports, and verification captures in ignored local storage. Never place real financial data in test fixtures or commit it to the repository. The migration tests use synthetic records only.
