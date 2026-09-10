# Plaid reconciliation

Plaid setup is under Account > Settings & backup > Bank connections. Connect a bank and map its accounts to existing ledger accounts. OAuth returns to Settings.

In Reconciliation, choose an account and select Pull from Plaid. Posted transactions enter the existing review workflow; accounts, balances, schedules and ledger transactions are never rewritten by a pull. Missing entries still require explicit approval. Repeated pulls use saved cursors and transaction fingerprints. Updates/removals flag existing reviews without editing posted ledger entries. Data for other mapped accounts stays cached until those accounts are selected.

Pull uses /transactions/sync, not the paid /transactions/refresh endpoint. Initial data may take a few minutes. Configuration and access tokens are encrypted on the server with its separate plaid.key file; keep that key alongside recovery backups. Secrets are never returned to the browser.

Completed sessions live in History. Reopen session returns one to the active list without changing its reviewed rows or ledger.
