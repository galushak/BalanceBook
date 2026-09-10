# Balancebook design decisions

Status: Desktop Dashboard Round 02 A / Operations Grid, Desktop Transactions A2 / Ledger Overview without transaction names, and all six Desktop Add Transaction forms are approved visual baselines. The owner subsequently authorized a full working V1 demo and delegated judgment for remaining desktop and mobile designs. Implementation now follows that authorization.

## Latest authorization

The owner stated: “I think you know the format I want. I’ll trust your judgement for the rest. Can you generate a full working V1 Demo of the app?” This supersedes the earlier requirement to approve each remaining screen before implementation. The previously approved dashboard, ledger, and six forms remain the visual references.

## Owner decisions, September 5, 2026

- The project bible is the product baseline; later explicit owner decisions take precedence.
- After 30 minutes of inactivity, hide financial data and require login. Previously set-up devices must support offline login and offline work. The local authentication mechanism still needs technical design; do not substitute unlocked cached access for this requirement.
- Primary use is phone, with approximately three budget accounts and five debt accounts.
- Visual direction: command center.
- Current review process: one strong mockup per screen, revising as needed; related screens/forms can be reviewed together. Owner accepted this faster process after approving Dashboard and Transactions. It supersedes the earlier five-alternatives-per-screen process. Explicit design approval remains required before implementation. Complete desktop screens, then repeat for mobile.
- Only implement approved mockups. Selecting a concept for refinement is not automatically final approval.
- Include known overdue amounts at the beginning of forecasts, labeled overdue.
- Include archived-account activity by default in historical income/spending reports.

## Delegated implementation decisions

- Scheduled loan payments wait for confirmation unless an owner-approved split or calculation method can produce a valid principal/interest breakdown. Invalid or incomplete calculations always require review.
- Same-day forecast occurrences have a stable visible sequence. Recurrence targets show immediately before/after the selected occurrence; exact ordering controls will be specified with the Scheduled/Forecast designs.
- Manual and automatic local backup belong in MVP, consistent with the bible's MVP definition.

## Dashboard round 01

- Five independent image-generated desktop concepts, with identical illustrative sample data and all eight accounts visible.
- Mockup values are labeled sample data and are not owner financial records.
- Prompts are stored in dashboard-round-01/prompts.json.
- Built-in image generation tool used; images are visual proposals, not working UI.

## Owner feedback and Dashboard round 02

- Owner ended the individual ranking process and selected Round 01 concepts 01, 02, and 04 as preferred starting points. None is approved.
- First round felt insufficiently like a command center and somewhat childish.
- Command center means NOC/SOC-style operational information density: everything immediately visible.
- Round 02 explores compact metric strips, mature neutral styling, tightly aligned account tables, upcoming activity, recent transactions, and exact running forecasts in one desktop viewport.
- Remove oversized cards, colorful illustrative icons, and excessive empty space. Preserve the personal-ledger feature scope.
- Of the five revised desktop proposals, the owner subsequently approved A / Operations Grid. B through E remain unapproved.

## Desktop Dashboard approval

- Owner explicitly locked the desktop dashboard design "for now" and identified Round 02 A / Operations Grid with an attached image.
- Exact owner-selected image preserved at approved/desktop-dashboard-operations-grid.png.
- Preserve its dark neutral palette, compact summary strip, dense aligned tables, sidebar status area, and four-panel layout: accounts upper left, upcoming upper right, recent activity lower left, and running forecast lower right.
- This approval supersedes earlier unapproved status and the assistant's suggestion to automatically remove repeated top/sidebar navigation. Preserve the approved reference; do not silently redesign its navigation.
- Financial sample data and concept labels are illustrative, not production records/content.
- Approval is for this desktop dashboard visual baseline. It does not approve mobile, other screens, or unshown light/empty/error/offline states, and does not begin application implementation.
- Continue the agreed desktop screen-by-screen mockup process before moving to mobile. Desktop Transactions was reviewed next and its A2 refinement is now approved below.

## Desktop Transactions exploration

- Owner authorized the next set of five desktop Transactions mockups.
- Inherit the approved Operations Grid dashboard visual system and navigation shell. Dashboard approval remains unchanged.
- Compare ledger overview, right inspector, bottom inspector, inline details, and dedicated filter rail.
- Preserve combined event-level ledger, newest-date-first ordering, required search/filter/sort controls, visible voided transactions, atomic linked-event details, and Edit/Void/History actions.
- Initial mockups and exact image-generation prompts are in transactions-round-01. The A2 refinement was subsequently approved below; no app implementation has started.

## Transactions refinement and naming change

- Owner selected Transactions A / Ledger Overview as the preferred direction and requested that transactions do not need names. That refinement request was followed by explicit approval of A2 below.
- Remove the separate user-entered transaction Name field from creation/editing, the ledger Name column, and transaction-name search. Do not merely make the field optional or rename it Description.
- Identify transactions using payee, type, account(s), date, category and amount. Optional notes remain available.
- This later owner decision supersedes the bible's separate Name requirement in Sections 10, 11, 21, and 22 and the corresponding transaction-event schema proposal. The original external bible remains unchanged; this decision is the authoritative override.
- Apply the same transaction naming rule to future dashboard recent-activity content and transaction detail designs. Preserve the approved dashboard's visual arrangement; its old sample names do not restore a Name-field requirement.
- Account names, category/payee names, and scheduled-rule labels remain distinct concepts and are not removed by this transaction-field change.
- A2 changes the selected Transactions image by removing Name and updating search wording; other layout and sample data remain as before. The owner has approved this revision.

## Desktop Transactions approval

- Owner explicitly approved A2 / Ledger Overview without transaction names with "Ok lets lock that in" after reviewing the revised image.
- Approved reference: approved/desktop-transactions-ledger-overview.png, copied unchanged from transactions-refinement-a2/a2-ledger-overview-no-name.png and hash verified.
- Preserve the full-width table, compact horizontal search/filter controls, Operations Grid shell, visible voided records, row actions, and absence of a transaction Name field.
- This approves the desktop Transactions overview. Unshown detail, add/edit, history, confirmation, and other state designs remain for subsequent review.
- Both desktop Dashboard and Transactions overview are now locked visual baselines. No application implementation is authorized by this approval alone.
- Proposed next desktop mockup set: Add Transaction, applying the approved no-name field decision.

## Add Transaction review set

- Owner accepted proceeding with one cohesive design per screen and reviewing related forms together.
- Current set: Expense, Income, Transfer, Credit Card Payment, Loan Payment, and Balance Adjustment, as six states of one Add Transaction design.
- Five top-level transaction choices remain Expense, Income, Transfer, Debt Payment, Balance Adjustment. Debt Payment adapts to the selected card or loan. Refund remains a linked action from an existing expense.
- Use the approved desktop Operations Grid shell and omit transaction names throughout. Show compact balance-effect previews alongside relevant inputs; one deliberate Save transaction action.
- Owner subsequently approved all six current forms, including the corrected Income and Loan Payment images. No app implementation has started.

## Desktop Add Transaction approval

- Owner explicitly approved the shared design and all six form states with "YEs approved" in response to the review set.
- Approved references are preserved unchanged in approved/desktop-add-transaction/: 01-expense.png, 02-income.png, 03-transfer.png, 04-card-payment.png, 05-loan-payment.png, 06-balance-adjustment.png. All copies are hash verified.
- Preserve the shared left-input/right-preview layout, five type choices, type-specific fields, optional notes/attachments, deliberate save action, and absence of transaction names.
- Approval includes the current corrected Income payee/category controls and Loan Payment principal input. It does not resurrect earlier discarded renderings.
- Generated note counters are not a new product limit. Existing documented minor currency-formatting and principal-label consistency notes remain applicable; preserve the approved layout.
- This records visual approval only. No app implementation has begun; other unshown screens/states and mobile remain for review.
- Next proposed desktop review: Scheduled activity and its recurring-rule form, using one cohesive design per screen.

## Working demo refinements — September 5, 2026

- Owner delegated the remaining design choices and authorized a full working V1 demo after the approved desktop references.
- Transactions now uses a compact search/filter/sort toolbar. Filters open in an app modal with draft changes, Apply, Cancel, Reset, and removable active filters.
- All confirmations, text prompts, and reminders stay inside Balancebook. Browser push subscriptions and delivery are disabled.
- Scheduled shows recurring rules first. Each rule opens its own paginated upcoming, overdue, and historical occurrences.


## In-app dropdowns — September 5, 2026

- Replaced every native select with a shared styled listbox. Payee/category datalists now use searchable in-app suggestions and accept new typed values.
- Controls support arrow keys, Enter, Escape, type-ahead selection, outside dismissal, disabled states, and field labels. Escape closes the menu before its parent modal.
- Data-entry inputs and forms request autocomplete off. Login retains standard username/password semantics for credential managers.

## Dashboard forecast and upcoming payments

- The owner prefers the next paycheck as the active forecast target. A Change link beside the target opens forecast preferences.
- Upcoming Payments replaces the Total Debt headline card. It totals unpaid scheduled expenses and debt payments through the forecast date, including overdue and muted reminders, excluding posted/skipped items and transfers between funds accounts.
- View payments opens an in-app breakdown. Unknown variable amounts are explicitly flagged. Card charges are listed but do not reduce cash balances until payment.
- Forecasts include all activity on the target date, avoiding arbitrary exclusions from same-day rule ordering.
- Verified with the domain regression suite (23 passing tests) and desktop/phone browser checks. Real data remains in ignored local storage.
