# Manual imports on main

The current `main` version uses manual ledger entry and CSV/PDF statement review. Direct bank connections, Plaid API routes, OAuth, and external SDK permissions have been removed. The separate `plaid` branch preserves the experimental integration.

Existing financial records and saved reconciliation sessions are retained as historical data. Deployment removes the inactive connection configuration and cached credentials from the live database after a backup. The original encryption key is retained with the rollback backups, separately from the active application.

Use Transactions → Import CSV to upload a statement. Merchant suggestions, learned matches, manual transaction matching and balance-adjustment reconciliation remain available.

Validation: TypeScript check, production build, 38 tests, including authenticated 404 checks for every former connection endpoint and restrictive content-security-policy checks.
