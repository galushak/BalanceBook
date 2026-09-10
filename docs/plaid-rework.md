# Plaid-first rework (branch `plaid`)

This extends the existing Balancebook application and preserves its routes, ledger, CSV import, offline entry, reporting and scheduled-payment editor.

## Balance and settlement

- Connected account names and cached current balances come from `/accounts/get`. Existing explicit account exclusions remain excluded.
- Working balance = bank current balance + active entries that have not posted at that bank. The available balance is retained as metadata, never used as the base for subtracting pending purchases.
- Manual entries show Awaiting bank. Unique merchant/account/signed-amount/date matches merge into the same event. Bank authorizations show Bank pending; posted replacements use `pending_transaction_id` to retain identity.
- Bank amounts/dates/accounts are protected from manual edits. Payee, category, notes and attachments remain editable. Manual match decisions remember merchant aliases.
- Uncertain amount/date candidates appear under Transactions → Needs attention. Match the existing entry or keep both.
- Bank-identified transfers and credit-card payments are excluded from income/spending totals. Unique opposite transfer entries between connected accounts are combined into one transfer. Unpaired bank imports remain account-specific records rather than inventing a destination account.
- Posted history reconstructs a baseline from the latest snapshot. Older history outside the bank-supplied window is unavailable; this is not an independently reconciled historical opening balance.

## Recurring streams

Scheduled → Detected by your bank reads recurring streams. A stream can create a local rule or link to an existing rule without replacing its schedule or split. Bank transactions in that stream fulfill nearby unresolved occurrences; loan splits are applied only when valid for the actual payment amount. Connected-account schedules do not auto-post ledger entries from the timer.

Weekly, biweekly, monthly and annual stream predictions can create rules. Unsupported or unknown frequencies and missing predicted dates require a locally configured rule before linking. Stream retrieval errors do not prevent ordinary transaction sync.

## Operations

Sync runs on demand and approximately every six hours while the server runs, using cached Plaid data. It does not call the paid Transactions Refresh endpoint. New bank connections request up to 730 days; existing connections retain their originally requested history window.

Cursor updates, encrypted connection data and ledger changes commit together. Credentials and raw bank cache remain encrypted on the server. New financial entries and account changes are audited. CSV reconciliation remains available for manual accounts and independent review.

Before deployment, the existing server data was backed up as `balancebook-backup-2026-09-10T18-16-40-502Z-36dceb59.zip`. The prior image is `balancebook-fresh:20260910`; the Compose rollback copy is `compose.pre-plaid-rework-20260910.yaml`. Roll back both data and application together if reverting settlement semantics.

Validation: TypeScript and production Docker build; 49 automated tests including pending replacement, repeated sync, removed authorizations, uncertain matches, bank-owned fields, recurring loan splits, transfer reporting, existing CSV/domain/API regressions.
