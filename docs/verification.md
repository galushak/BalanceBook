# Demo verification — September 5, 2026

- TypeScript and Vite build pass, including inside the Docker image.
- 19 Node test cases pass. They cover the financial types, integer cents, linked atomic entries, refunds, opening locks, snapshots, version conflicts, recurrence, forecast uncertainty, reports, reconciliation immutability, API authentication/CSRF/session expiry, scheduler idempotency, backup restore, PDF/CSV parsing, matching, and local OCR.
- `npm audit --omit=dev`: zero known vulnerabilities at verification time. Two initially flagged dependencies were upgraded before delivery.
- Browser first-run setup and login were exercised against the standalone server, then the same initialized sample ledger was moved into the dedicated Docker volume.
- Browser offline test: stopped server, created a $12.34 sample expense and inline payee, reloaded from the cached app shell, logged in offline with the password, verified the new balance and two pending mutations, restarted the server in Docker, synced, and found exactly one transaction. Voided that test entry to restore initial sample totals while preserving history.
- Browser conflict test: staged a local note edit, edited the same sample transaction through a second API client, verified a conflict dialog, and selected Keep server. Amounts and balances remained unchanged. The keep-server decision also has a dedicated audited API regression.
- Responsive browser checks: 390×844 phone layout, four metrics, no document horizontal overflow, account bottom sheet, account-context entry, and native transaction rows. Desktop account and dashboard grids were inspected at normal and 1600×900 viewport sizes.
- Browser CSV reconciliation: uploaded the included fixture, got three strong match suggestions, and saved an OPEN review session. No automatic ledger changes.
- Browser receipt workflow in Docker: uploaded the sample PNG, ran local OCR, and saw editable DEMO MARKET / 42.50 suggestions without saving a financial edit.
- All five PDF report types and the text-PDF statement fixture were checked through the document regression tests.
- Container recreation preserved sample balances, the offline test's voided record, the uploaded files, and the saved reconciliation. A final manual archive was created.

External Web Push delivery, actual phone PWA installation/camera permissions, Google Drive credentials/uploads, and large-dataset load testing were not exercised. These are not implied by the checks above.

See `running-demo-verification.json` for the final running-server snapshot. Tests use isolated directories under ignored `test-results/`, never the live Docker volume.

## September 5, 2026 — requested UI refinements

- Production Docker rebuild and TypeScript validation passed; all 19 existing domain/API regression tests passed.
- Browser verified filter Apply, Cancel, Reset, active chips, and account/type results. Reversed dates show an in-app validation message; September 1–5 selects exactly 10 matching demo rows.
- Scheduled initially displays six recurring rules without a global occurrence list. Paycheck opens 26 scoped occurrences, 12 per page; next page shows rows 13–24.
- Skip confirmation appears inside the app above the occurrence dialog; Cancel preserves the occurrence and underlying dialog. Category rename opens an app text prompt and Cancel preserves its value.
- Visually checked desktop and 390 × 844 phone layouts. Filter sheet fits the viewport; recurring rules and occurrence actions use phone rows without horizontal scrolling.
- Source scan found no native alert/confirm/prompt calls or browser notification display calls. Browser push delivery and subscription UI were removed; the updated service worker unsubscribes older push subscriptions when possible.
- Local health endpoint returned status ok. Existing ledger data was preserved; no financial records were changed by these checks.

## September 5, 2026 — in-app dropdowns

- TypeScript/production Docker build and all 19 regression tests pass; health endpoint returns ok.
- Source and rendered form scans show no native select, datalist, or input[list] controls.
- Browser checks: account/type filter selection produced the expected 13 Everyday Visa expenses; payee/category suggestions filtered and accepted existing/new values without saving a transaction.
- Arrow keys and Enter selected Reserve Savings, then the draft account was restored. Escape closed a dropdown while preserving the filter modal.
- Desktop and 390 × 844 phone screenshots verified styled menus; the phone status menu opened upward within the viewport without page overflow. No browser console errors were captured.
