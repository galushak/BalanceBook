# Desktop Transactions - Round 01

Status: five unapproved image mockups. The desktop dashboard remains approved separately. No application code has been implemented.

Generated using the built-in image tool with ../approved/desktop-dashboard-operations-grid.png as the visual reference. Exact prompts are in prompts.json.

## Concepts

- [A - Ledger Overview](a-ledger-overview.png): full-width combined ledger with search and filters above. No detail inspector open.
- [B - Right Inspector](b-right-inspector.png): selected loan payment details in a right-side panel.
- [C - Bottom Inspector](c-bottom-inspector.png): selected loan payment details docked beneath the full-width ledger.
- [D - Inline Detail](d-inline-detail.png): selected expense expands inside the ledger, with receipt and Refund action.
- [E - Filter Workspace](e-filter-workspace.png): persistent filter column alongside the combined ledger.

## Visual review

- All five show twelve sample event rows in descending transaction-date order, including a clearly marked voided expense.
- All include search, six filter dimensions, and a date-sort affordance.
- Transfers and debt payments appear as single linked events rather than duplicate transactions.
- B and C correctly display a $450 loan payment as Checking -$450, Auto Loan +$350, $350 principal, $100 interest, and $450 Spent.
- D shows the expense-only Refund action alongside Edit, Void, and History.
- B through E render some unsigned transfer/payment magnitudes green. Refine these to neutral text to avoid implying income; signed account effects remain visible in payment detail.
- B repeats payee information beneath the name and in a separate column; this can be simplified during refinement if selected.
- Final selected design still needs readable voided-row contrast, all required sort choices, linked-refund detail, voided read-only/Restore behavior, and empty/loading/error/offline states specified or reviewed. Images are not runtime or accessibility validation.

All financial figures and status messages are illustrative sample data, not owner records.
