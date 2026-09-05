# Balancebook — Project Bible

**Version:** 1.0  
**Status:** Approved planning baseline / Codex source of truth  
**Prepared:** September 2, 2026  
**Working name:** **Balancebook**  
**Product type:** Single-user, self-hosted, mobile-first account tracking PWA

> **Working-name note:** “Balancebook” is a temporary product name. Renaming the product later must not require changing database identities, API semantics, or core domain terminology.

---

## 1. Purpose of This Document

This document is the authoritative product, behavior, UX, data, architecture, testing, and implementation specification for Balancebook.

It exists to prevent implementation-by-assumption. Codex must not redesign the product, quietly introduce budgeting behavior, or substitute generic finance-app conventions for the rules written here.

### 1.1 Source-of-truth order

When implementation decisions conflict, use this order:

1. This Project Bible.
2. A later explicit decision from the owner.
3. The simplest conservative behavior that preserves ledger integrity and matches the product philosophy.

When a genuine ambiguity remains, Codex should document the assumption in the implementation notes. It should not build an elaborate abstraction to cover every hypothetical possibility.

### 1.2 Core implementation instruction

> **Do not over-engineer this app.** It is a personal, single-user account tracker. Prefer transparent behavior, a small number of dependable components, understandable data structures, and recoverable storage over enterprise patterns or speculative flexibility.

---

## 2. Executive Summary

Balancebook is a custom account tracking application. It is **not a budgeting application**.

The product centers on accounts and their balances. It tracks what money exists, where it exists, what is owed, and how those values change through transactions. It also provides many capabilities commonly found in budget applications—categories, recurring activity, forecasts, reports, receipt attachments, and statement reconciliation—but none of those features may turn the product into a category-limit, envelope, or spending-allocation system.

The Balancebook ledger is the financial source of truth. Bank, lender, and credit-card apps are external reference points that may lag, omit pending activity, or use different timing. External balances can be compared against Balancebook, but they must never silently overwrite the ledger.

Balancebook is designed for one person, one USD financial world, and multiple synced devices. It runs on the owner’s home server using Docker. It is a web application and installable PWA, with mobile-first UX, offline viewing and transaction entry, explicit sync-conflict handling, full backup and restore, and optional encrypted Google Drive backup through rclone.

---

## 3. Product Identity and Philosophy

### 3.1 Product statement

**Balancebook is a private account ledger that answers: “What do I have, what do I owe, what changed, and what will each account likely look like next?”**

### 3.2 Primary principles

#### Accounts, not budgets

Accounts are the primary entities. Categories and reports explain activity. They do not impose spending limits.

#### The ledger is authoritative

Balances are derived from an opening balance plus ledger activity. External financial apps and uploaded statements are comparison sources, not the authority.

#### Immediate truth

A transaction affects the Balancebook balance immediately when entered. The product does not wait for a bank’s “cleared” status before considering the transaction real.

#### Manual independence

There are no direct bank connections, Plaid integrations, credential scrapers, or automatic transaction imports. The owner controls what enters the ledger.

#### Helpful automation, never silent financial mutation

The app may auto-post configured recurring transactions, generate forecasts, suggest categories, parse receipts, and suggest statement matches. Reconciliation and OCR results must always be reviewable. Statement reconciliation must never change ledger data without explicit approval.

#### Reports are first-class

Reports are a central product feature, not an afterthought. Charts must be accompanied by inspectable numbers and tables.

#### Mobile-first and compact

The mobile experience is primary. The dashboard should expose important information with minimal scrolling and avoid accidental navigation.

#### Personal scale

The app is for one user. It should be reliable over many years but must not be burdened with multi-tenancy, organizations, permissions matrices, enterprise workflows, or speculative scale engineering.

#### Recoverable and portable

The owner must be able to back up, restore, and export all data without being locked into the application.

---

## 4. Goals

Balancebook must:

- Track balances for checking, savings, wallet/cash, credit cards, and loans.
- Derive every current balance from an opening balance and ledger entries.
- Represent transfers and debt payments as linked atomic activity.
- Make current available funds and total debt immediately visible.
- Forecast total available funds and each account’s running balance from scheduled activity.
- Support recurring fixed and variable transactions with finite schedules.
- Provide detailed searchable transaction history and an audit trail.
- Provide strong financial reports with filtering and PDF export.
- Work as an installable mobile-first PWA.
- Support offline viewing and offline transaction entry.
- Detect conflicting edits between devices and require manual resolution.
- Support attachments, receipt photos, and review-first OCR assistance.
- Reconcile uploaded PDF and CSV statements without direct bank connectivity.
- Run reliably on a home server through Docker with persistent storage.
- Create automatic local backups and optionally copy encrypted backups to Google Drive.

---

## 5. Explicit Non-Goals

The following are out of scope unless the owner later changes this document:

- Monthly category budgets or spending limits.
- Envelope budgeting.
- “Safe to spend” advice that tells the user what they should do.
- Direct bank or card connections.
- Automatic statement-import changes without approval.
- Multi-user households, shared accounts, roles, or permissions.
- Multiple currencies or exchange-rate conversion.
- Investment, brokerage, stock, cryptocurrency, or portfolio tracking.
- Split-category transactions.
- Native iOS or Android apps.
- Remote-access, reverse-proxy, VPN, DNS, or certificate setup for the home server.
- Public registration.
- Email-based password reset in the initial release.
- Two-factor authentication in the initial release.
- Custom account colors and user-uploaded account icons in the initial release.
- A general accounting chart of accounts, journal-entry editor, or formal business bookkeeping system.
- Microservices, Kubernetes, Redis, message brokers, CQRS, or a generic plugin platform.
- Third-party analytics or advertising.

---

## 6. User and Operating Environment

### 6.1 User model

- Exactly one owner account is supported.
- The owner logs in with email and password.
- The same login can be used on multiple devices.
- Public sign-up is disabled after first-run setup.

### 6.2 Currency

- USD only.
- All displayed money uses USD formatting.
- No currency selector or exchange-rate data is required.

### 6.3 Deployment

- Runs on a home server.
- Deployed with Docker Compose.
- Remote access is already configured and is outside project scope.
- All permanent data must live in mounted persistent storage, not in the disposable container filesystem.

### 6.4 Primary client

- Responsive web application.
- Installable PWA is mandatory.
- Mobile is the primary UX target.
- Desktop receives enhanced detail views and shortcuts where appropriate.

---

## 7. Domain Glossary

**Budget account:** An account that normally holds usable funds. Types: Checking, Savings, Wallet.

**Debt account:** An account representing money owed. Types: Credit Card, Loan.

**Opening balance:** The manually entered balance effective when account tracking begins. It establishes the ledger baseline and is not income or spending.

**Transaction event:** The user-recognizable financial action, such as an expense, transfer, or debt payment.

**Ledger entry:** A signed amount applied to one account as part of a transaction event. A simple expense has one entry; a transfer has two linked entries.

**Available Funds:** The sum of all active budget-account balances, including checking, savings, and wallet.

**Projected Available Funds:** The running forecast of Available Funds after known scheduled activity through a selected target.

**Total Debt:** The signed aggregate balance of active debt accounts. A normal debt total is displayed as a negative amount.

**Net worth:** Budget-account balances plus debt-account balances. Because debt balances are negative, this is equivalent to assets minus debts. Net worth belongs in reports, not the main dashboard.

**Scheduled rule:** A reusable instruction that creates future occurrences.

**Scheduled occurrence:** One dated instance of a scheduled rule.

**Reconciliation:** A user-reviewed comparison between an external statement and the Balancebook ledger.

**Void:** A preserved transaction that no longer affects balances.

**System reporting bucket:** A built-in classification used for system transaction types, such as Balance Adjustments. It is not one of the user-managed starter categories.

---

## 8. Core Financial Model

### 8.1 Signed money convention

All money is stored as signed integer cents. Floating-point numbers must never be used for persisted financial amounts or balance calculations.

- `12345` means `$123.45`.
- `-12345` means `-$123.45`.

### 8.2 Balance formula

For any account:

```text
current balance = opening balance + sum(active ledger entries)
```

For a historical date:

```text
balance as of date = opening balance + sum(active ledger entries dated on or before that date)
```

Voided transaction entries are excluded from all balance calculations.

The stored/cached balance must never become a second source of truth. A cache may be used for performance, but it must be reproducible from the opening balance and active ledger entries.

### 8.3 Account sign behavior

#### Budget accounts

- Positive means funds are available.
- Negative is allowed and represents an overdraft or negative cash position.

#### Debt accounts

- Negative means money is owed.
- A credit-card balance of five hundred dollars owed is displayed as `-$500.00`.
- A positive debt-account balance is technically allowed for an overpayment or lender credit, although it is not the normal state.

### 8.4 Ledger event design

Use one transaction-event record with one or more linked ledger-entry records.

This is intentionally narrower than a general double-entry accounting system. It exists so linked operations remain atomic and balances remain derivable.

Examples:

| Event | Ledger effects |
|---|---|
| $75 checking expense | Checking `-$75` |
| $75 credit-card purchase | Credit Card `-$75` |
| $200 checking-to-savings transfer | Checking `-$200`; Savings `+$200` |
| $300 credit-card payment | Checking `-$300`; Credit Card `+$300` |
| $400 loan payment with $330 principal | Checking `-$400`; Loan `+$330`; $70 retained as interest metadata/reporting component |

### 8.5 Financial dates and timestamps

Each transaction has:

- A **transaction date**, interpreted in the app’s configured timezone.
- Immutable technical timestamps for creation and audit history, stored in UTC.

The transaction date defaults to today and is editable.

Normal ledger transactions:

- May be backdated to the account’s tracking-start date.
- May not be dated before any affected account was created.
- May not be future-dated.

Future activity belongs in the Scheduled system.

For linked events, the chosen transaction date must be valid for every affected account.

---

## 9. Account Model

### 9.1 Account classes and types

#### Budget accounts

- Checking
- Savings
- Wallet

Checking, Savings, and Wallet use the same ledger mechanics. Their types affect labeling, organization, icons, and defaults—not the mathematical rules.

Wallet behaves as cash.

#### Debt accounts

- Credit Card
- Loan

### 9.2 Required account-creation fields

All accounts require:

- Account Name
- Account Type
- Starting Balance / Amount Owed

Optional general field:

- Institution / lender name

For debt accounts, the creation form should present a friendly **Amount Owed** input. A positive magnitude entered as amount owed is stored as a negative opening balance. The preview must make the resulting signed balance clear before saving.

### 9.3 Tracking start

- Tracking begins when the account is created.
- The tracking-start date is the account creation date in the configured app timezone.
- There is no separate user-entered “Start Tracking From” field in the initial release.
- The opening balance represents all activity before tracking began.

### 9.4 Opening-balance rules

- Opening balances are not transactions.
- They are excluded from Income, Spent, and all activity reports.
- The opening balance may be edited only before the account has ever had ledger activity.
- Once any transaction has existed for the account—even if later voided—the opening balance is locked.
- Later corrections use a Balance Adjustment.

### 9.5 Account names and ordering

- Active account names must be unique case-insensitively so transfers and generated labels are unambiguous.
- Budget and debt accounts are ordered independently.
- The owner can manually reorder accounts.

### 9.6 Archiving

Accounts are never permanently deleted.

Archiving an account:

- Removes it from normal account selectors and everyday dashboard totals.
- Excludes it from current Available Funds, current Total Debt, and current net-worth defaults.
- Preserves all transactions, revisions, attachments, and reconciliation history.
- Keeps the account available for historical reports and explicit report filters.
- Prevents new ledger activity unless the account is restored.

Before archiving:

- Warn if the account has a nonzero balance.
- Block completion while an active scheduled rule references the account. The owner must end, pause, or reassign those schedules first.

Accounts can be unarchived.

---

## 10. Transaction Types and Reporting Effects

The primary Add Transaction flow begins with transaction type, then asks for the relevant account or accounts.

### 10.1 Expense

**Purpose:** Record money spent or a charge incurred.

**Account:** Budget or debt account.

**Ledger effect:** One negative entry on the selected account.

**Required:**

- Account
- Amount greater than zero in the input; stored as a negative ledger entry
- Date
- Name
- Payee
- Category

**Optional:** Notes, attachments.

**Reporting:** Counts toward Spent in the transaction’s date period.

A credit-card purchase is simply an Expense against the credit-card account and increases debt immediately.

### 10.2 Income

**Purpose:** Record money received.

**Account:** Budget account normally; debt account is allowed for a genuine credit.

**Ledger effect:** One positive entry.

**Required:** Account, amount, date, name, payee, category.

**Reporting:** Counts toward Income.

### 10.3 Transfer

**Purpose:** Move funds between two budget accounts.

**Accounts:** Source budget account and destination budget account.

**Ledger effects:**

- Source: negative amount
- Destination: equal positive amount

**Generated payee:** `Source Account → Destination Account`

**Classification:** System Transfer bucket.

**Reporting:** Excluded from Income and Spent. It changes individual account balances but does not change combined Available Funds.

**Integrity:** Both sides are one atomic event. Editing or voiding affects both sides together.

### 10.4 Debt Payment

**Purpose:** Pay a credit card or loan from a budget account.

**Accounts:** Source budget account and destination debt account.

**Generated payee:** `Source Account → Debt Account`

#### Credit-card payment

Ledger effects:

- Source budget account: negative full payment
- Credit card: positive full payment, reducing the negative balance

Reporting:

- Excluded from Spent to avoid double-counting purchases already recorded as expenses.
- Excluded from Income.

#### Loan payment

Ledger effects:

- Source budget account: negative full payment
- Loan account: positive principal portion only
- Interest portion remains part of the event’s payment breakdown and does not reduce the loan balance

Reporting:

- The **entire loan payment** counts as Spent, including principal and interest.
- This is an intentional personal cash-flow rule, not formal accounting treatment.

Loan-payment subtype:

- Regular Payment — default
- Extra Principal Payment — optional selection

An extra-principal payment applies the full amount to principal unless manually overridden.

### 10.5 Balance Adjustment

**Purpose:** Correct the ledger with an explicit signed change when the owner determines that the Balancebook balance needs correction.

**Input:** Add or subtract `$X`; never replace the balance directly.

**Ledger effect:** One signed entry.

**Payee:** Automatically `Balance Adjustment`.

**Category:** Does not use a normal user category. It uses the built-in Balance Adjustments reporting bucket.

**Note:** Optional, not required.

**Reporting:**

- Positive adjustment counts as Income.
- Negative adjustment counts as Spent.

### 10.6 Refund

Refund is a linked action initiated from an existing Expense rather than a primary top-level transaction type.

Rules:

- May be full or partial.
- Must link to the original expense.
- Defaults to the original payee and category snapshots.
- The refund category may be changed before saving.
- Defaults to the original account; the destination may be changed when the refund actually landed elsewhere.
- Creates a positive ledger entry in the destination account.
- Counts as Income in the period received.
- Does not reduce historical Spent.
- Multiple partial refunds are allowed.
- Total linked refunds may not exceed the original expense amount. Any excess credit must be recorded as separate Income.

Integrity rules:

- An original expense with active refunds cannot be voided until its refunds are voided.
- Its amount cannot be reduced below the total active refunded amount.

### 10.7 Starting balances

Starting balances establish an account baseline only. They never count as Income, Spent, transfers, adjustments, or report activity.

---

## 11. Transaction Fields

### 11.1 Required normal fields

Normal Expense and Income transactions require:

- Transaction type
- Account
- Amount
- Date
- Name
- Payee
- Exactly one category

### 11.2 Optional fields

- Notes
- One or more attachments

### 11.3 Name and payee are separate

Example:

```text
Name: Weekly groceries
Payee: Walmart
Category: Groceries
```

### 11.4 No split transactions

Each user-entered Expense or Income has exactly one category. Category splits are out of scope.

---

## 12. Categories

### 12.1 Purpose

Categories organize and report activity. They do not have limits, budgets, targets, envelopes, or enforcement behavior.

### 12.2 Starter categories

The app may ship with a useful starter list, but all starter categories are user-controlled.

### 12.3 Create, rename, hide, and delete

- Custom categories can be created.
- Categories can be created inline from transaction entry where practical.
- An unused category can be permanently deleted.
- A category that has been referenced by a transaction cannot be hard-deleted; it is hidden/inactivated.
- Hidden categories remain on historical transactions and remain available in historical filters.
- Hidden categories are not selectable for new manual transactions.
- A category referenced by an active schedule cannot be hard-deleted. The schedule must first be reassigned or ended.

### 12.4 Historical name snapshots

Renaming a category changes the name used for future selections. It must not rewrite the visible category name on past transactions.

Each transaction stores:

- Category identity, when applicable.
- Category-name snapshot captured when the transaction was saved.

Historical screens and report labels use the snapshot. A renamed category may therefore appear under its old and new names in historical reports, accurately reflecting what was recorded at the time.

### 12.5 System buckets

System reporting buckets such as Transfers, Credit Card Payments, Loan Payments, and Balance Adjustments are internal classifications, not ordinary starter categories. They are not managed through the user category delete/hide workflow.

---

## 13. Payees

### 13.1 Required behavior

- Payee is required on normal transactions.
- Transfers, debt payments, and balance adjustments generate their payee automatically.
- Existing payees autocomplete as the owner types.
- A new payee is created inline by finishing the new name and continuing the transaction flow.

### 13.2 Category suggestions

The app remembers category choices by payee and suggests the most relevant recent/frequent category the next time that payee is used.

Suggestions never save a transaction automatically.

### 13.3 Create, rename, hide, and delete

- Unused payees can be permanently deleted.
- Used payees are hidden/inactivated rather than deleted.
- Hidden payees remain on historical activity but do not appear in default autocomplete.

### 13.4 Historical name snapshots

Renaming a payee affects future use and autocomplete only. Past transactions keep displaying the payee name they had when saved.

Transactions store both the payee identity and the payee-name snapshot.

---

## 14. Editing, Voiding, and Audit History

### 14.1 Editing

Transactions are editable after entry.

- Simple transaction edits update the relevant ledger entry atomically.
- Transfer edits update both ledger sides atomically.
- Debt-payment edits update source, destination, and payment breakdown atomically.
- A failed multi-entry edit must roll back completely.

### 14.2 Audit trail

Every edit creates an immutable revision record containing:

- What changed.
- Previous values.
- New values.
- When the change occurred.
- The owning user identity.

The audit trail is accessible in the app behind a History action so it does not clutter normal transaction viewing.

### 14.3 Voiding

Transactions are never hard-deleted.

Voiding:

- Preserves the original event and revision history.
- Marks the event clearly as Voided.
- Removes all of its ledger effects from current and historical balance calculations.
- Leaves the transaction visible in transaction history and search by default.
- Records when the void occurred.

Linked events void as one unit.

### 14.4 Editing a voided transaction

A voided transaction is read-only. To restore it, use an explicit Unvoid/Restore action that creates an audit event and revalidates all account/date/category constraints.

---

## 15. Credit-Card Model

### 15.1 Optional card details

Credit-card creation must remain simple. The following are optional and editable later:

- Credit limit
- APR
- Current statement balance
- Statement closing date
- Current minimum payment due
- Current payment due date

### 15.2 Running balance versus statement balance

- **Running balance:** Calculated from the Balancebook ledger and always current according to Balancebook.
- **Statement balance:** A manually entered snapshot from a closed issuer statement.

They are intentionally separate.

### 15.3 Purchases

A card purchase is an Expense on the card and immediately makes the debt balance more negative.

### 15.4 Payments

A credit-card payment is a linked Debt Payment from a budget account to the card.

- It reduces Available Funds.
- It reduces the card debt.
- It does not count as Spent.

### 15.5 Minimum-payment warning

The minimum payment is informational and must not automatically create a scheduled transaction.

When a current statement cycle has a minimum amount and due date:

- The app totals qualifying card payments recorded after the statement close date for that cycle.
- It warns as the due date approaches if the total is below the minimum.
- A payment at or above the minimum satisfies the warning for that cycle.
- If statement-cycle information is missing, no minimum-payment claim is made.

The warning configuration must allow at least same-day and advance reminders.

---

## 16. Loan Model

### 16.1 Optional loan details

- APR
- Original or remaining term in months
- Lender’s required payment
- Payment due day/date
- Interest calculation method
- Last interest-through/payment date where needed

All are optional and editable later.

### 16.2 Required payment authority

The lender’s actual required payment is authoritative. Balancebook must not replace it with a mathematically calculated payment.

The term and APR may be used for projections and payment splits, but not to invent the contractual payment.

### 16.3 Principal and interest split

When enough information exists, Balancebook may propose a principal/interest split.

Supported simple methods:

1. **Monthly periodic interest:** APR divided by 12. Month length does not change the periodic rate.
2. **Daily simple interest:** Uses the actual day count between relevant dates and an Actual/365 calculation.

The proposed split is editable before saving because real lender formulas, fees, rounding, and accrual practices vary.

If the app cannot produce a sane split—for example, required inputs are missing or calculated interest exceeds the entered payment—it must require manual principal and interest values rather than inventing a result.

Validation:

```text
principal + interest = total payment
```

For a Regular Payment:

- Source account decreases by total payment.
- Loan balance increases toward zero by principal only.
- Entire payment counts as Spent.

For an Extra Principal Payment:

- Full payment defaults to principal.
- Entire payment counts as Spent.
- It does not satisfy or suppress the normal due-date reminder.

### 16.4 Loan reminders

Loan due-date reminders occur every configured payment cycle even if other payments were recorded. Loans may have unusual timing, and the owner explicitly wants the reminder regardless.

The reminder may show whether a Regular Payment has already been recorded, but it still fires.

---

## 17. Scheduled and Recurring Activity

### 17.1 Supported scheduled types

- Expense
- Income
- Transfer
- Debt Payment

Balance Adjustments are not recurring activity in the initial release.

### 17.2 Schedule fields

A scheduled rule includes:

- Transaction type
- Relevant account or accounts
- Name
- Payee/category or system-generated classification
- Start date
- Frequency
- Amount mode
- Optional end date
- Optional occurrence/payment count
- Notification timing
- Active/paused/ended status

### 17.3 Frequencies

Use a simple interval model:

- Every `N` days
- Every `N` weeks
- Every `N` months
- Every `N` years

Common presets should include weekly, biweekly, monthly, and yearly.

Example:

```text
PayPal Pay in 4
Every 2 weeks
4 occurrences
Ends automatically after occurrence 4
```

### 17.4 Monthly date behavior

When a monthly rule starts on a day that does not exist in a later month, use that month’s last valid day, then return to the original day when possible.

Example: January 31 → February 28/29 → March 31 → April 30.

### 17.5 Fixed and variable amounts

#### Fixed amount

- Has a known amount.
- Can auto-post when due if global automatic posting is enabled.
- Participates fully in forecasts.

#### Variable amount

- The due date is known, but the amount is intentionally unset.
- It must not auto-post without an amount.
- The owner must enter and confirm the amount.
- Forecasts must mark the affected period as incomplete/uncertain rather than silently treating the amount as zero.

### 17.6 Automatic posting

- Automatic posting is enabled by default.
- A global Settings toggle can turn it off.
- When disabled, due occurrences wait for confirmation.
- Variable occurrences always wait for an amount and confirmation.

Automatic posting must be idempotent. One scheduled occurrence can create at most one ledger transaction.

### 17.7 Occurrence states

At minimum:

- Upcoming
- Due
- Waiting for Amount
- Posted
- Skipped
- Overdue

### 17.8 Overdue behavior

An unposted due item remains visible and generates reminders until it is posted, skipped, or otherwise resolved.

Default reminder repetition: once daily while overdue. The owner may mute a specific occurrence.

### 17.9 Editing recurring activity

Editing an occurrence offers:

- **This occurrence only**
- **This and all future occurrences**

“This and all future” ends the old rule immediately before the chosen occurrence and creates a revised continuation. Past posted transactions never change automatically.

### 17.10 Skipping

A single occurrence may be skipped without ending the series. The skip is retained in schedule history.

---

## 18. Forecasting

### 18.1 Forecast philosophy

Forecasts are deterministic projections based on known scheduled activity. They are not behavioral guesses and do not claim to predict unscheduled spending.

### 18.2 Running forecast

Forecasting must show a running sequence, not only a final number.

Example:

```text
Checking
Today          $1,200
Rent           $  200
Paycheck       $1,700
Card payment   $1,300
```

### 18.3 Forecast levels

#### Combined Available Funds

Starts with the current sum of all active budget accounts and applies scheduled activity in time order.

#### Individual accounts

Every active account has its own running forecast, including credit cards and loans.

### 18.4 Available Funds effects

- Scheduled Income into a budget account increases projected Available Funds.
- Scheduled Expense from a budget account decreases it.
- Budget-to-budget Transfer changes individual accounts but not the combined total.
- Credit-card purchase changes the card forecast but not Available Funds until a card payment occurs.
- Credit-card payment decreases Available Funds and reduces debt.
- Loan payment decreases Available Funds and changes the loan by its principal portion.

### 18.5 Forecast targets

The owner can choose the target interactively and can set a default in Settings.

Supported target types:

- End of month
- A specific date
- Next occurrence of a selected recurring item
- Next Paycheck shortcut, implemented as selection of a recurring income rule

When a recurring occurrence is the target, the displayed target balance means **immediately after that occurrence is applied**. The timeline makes the before/after state visible.

### 18.6 Dashboard default

Dashboard forecast values use the Settings default target and display its label/date.

### 18.7 Variable scheduled items

If a variable occurrence falls before the target:

- Show the known projection using only known amounts.
- Mark the result as incomplete.
- List the unresolved item prominently.
- Never present the number as fully reliable.

### 18.8 Archived accounts

Archived accounts are excluded from current forecasts by default. Historical reports remain available separately.

---

## 19. Dashboard

### 19.1 Launch destination

After successful login, open directly to Dashboard.

### 19.2 Mobile summary area

The first content is a compact 2-by-2 summary-card grid wherever screen width allows:

1. **Available Funds** with **Projected Available** inside the same card.
2. **Income** — current month to date.
3. **Spent** — current month to date.
4. **Total Debt**.

Mobile summary cards are display-only to prevent accidental navigation.

Desktop summary cards may link to the corresponding pre-filtered report.

### 19.3 Summary definitions

**Available Funds:** Sum of all active Checking, Savings, and Wallet balances.

**Projected Available:** Available Funds after scheduled activity through the configured default forecast target, with incomplete-state warning when variable amounts are unresolved.

**Income:** Qualifying Income during the current calendar month.

**Spent:** Qualifying Spent during the current calendar month.

**Total Debt:** Signed sum of active credit-card and loan balances, normally displayed as a negative value.

### 19.4 Account sections

Budget accounts and debt accounts appear in separate compact sections.

Each account card/row shows:

- Account name
- Current balance
- Smaller forecasted balance and target label
- Type icon

The owner can reorder accounts within each section.

### 19.5 Mobile account interaction

Tapping an account on mobile opens a compact bottom sheet/popout rather than navigating away.

The sheet contains:

- Current balance
- Forecasted balance
- Recent transactions
- Add Transaction action
- Transfer action when relevant
- Make Payment action when relevant

### 19.6 Desktop account interaction

Tapping an account on desktop opens a full account detail page with balance history, transactions, forecast, details, and actions.

### 19.7 Upcoming section

Dashboard includes a compact Upcoming section showing the next few scheduled items and unresolved overdue items, with a link to the full Scheduled screen.

The section must remain compact to minimize scrolling.

---

## 20. Navigation and Information Architecture

### 20.1 Mobile bottom navigation

Fixed five-button bottom bar:

1. Dashboard
2. Transactions
3. **Add Transaction (+)** centered and visually prominent
4. Scheduled
5. Reports

### 20.2 Profile/menu

A small top-right profile/menu button contains:

- Settings
- Sync status/conflicts
- Backup status where useful
- Logout

No greeting or profile fluff is required.

### 20.3 Desktop navigation

Desktop may use a sidebar or top navigation but must preserve the same core destinations. Settings remains accessible through the profile/menu area.

---

## 21. Add Transaction Experience

### 21.1 Flow order

1. Choose transaction type.
2. Choose account or accounts.
3. Enter the type-specific details.
4. Review and save.

### 21.2 Type-specific forms

The UI should show only relevant fields.

- Expense/Income: one account, amount, date, name, payee, category, notes, attachments.
- Transfer: source, destination, amount, date, name/notes as needed; generated payee.
- Debt Payment: source budget account, destination debt account, amount, date, card/loan-specific fields.
- Balance Adjustment: account, add/subtract choice, amount, date, optional note.

### 21.3 Mobile ergonomics

- Optimized for one-handed entry.
- Large, deliberate Save action.
- No accidental save from tapping outside a sheet.
- Preserve unsaved form state if the app temporarily goes offline or is backgrounded.
- Camera receipt action is available directly from transaction entry.

---

## 22. Transactions Screen

### 22.1 Default view

- One combined ledger across all accounts.
- Newest transaction date first.
- Voided transactions included and clearly labeled.

### 22.2 Global search

Search across:

- Transaction name
- Payee snapshot
- Category snapshot
- Notes
- Amount

### 22.3 Filters

- Account
- Date range
- Category
- Payee
- Transaction type
- Status, including active/voided when desired

### 22.4 Sorting

- Date
- Amount
- Payee
- Category

Newest-first is the default.

### 22.5 Transaction detail

Shows:

- Full event details
- All affected accounts and signed effects
- Linked original/refund relationship where applicable
- Attachments
- Edit
- Void/restore
- History
- Reconciliation links where applicable

---

## 23. Reports

### 23.1 Required reports

1. Spending by category
2. Balance over time for one or more accounts
3. Net worth over time
4. Income versus Spent
5. Spending by payee

Reports may also expose the underlying transaction table for the selected data.

### 23.2 Filters

All relevant reports support:

- Specific account or accounts
- Category
- Payee
- Preset date range
- Custom date range

Preset dates should include at least:

- This month
- Last month
- This year
- Last year

### 23.3 Charts and tables

Every chart must have an accompanying table or exact figures. The owner should never have to estimate values from chart geometry.

### 23.4 Report classification rules

#### Counts as Income

- Income transactions
- Refunds in the period received
- Positive Balance Adjustments

#### Counts as Spent

- Expenses, including credit-card purchases
- Full loan payments
- Extra-principal loan payments
- Negative Balance Adjustments

#### Excluded from both

- Opening balances
- Budget-account transfers
- Credit-card payments

### 23.5 Archived accounts

- Current/default totals exclude archived accounts.
- Historical reports can include archived accounts and should include them when explicitly selected.
- Archived accounts remain fully reportable for their historical activity.

### 23.6 Balance-over-time behavior

- Begins at the account opening balance on its creation date.
- Applies active ledger activity by transaction date.
- A voided event disappears from the historical series because it no longer affects the authoritative ledger.
- Audit history remains separately available.

### 23.7 Net worth

```text
net worth = sum(budget account balances) + sum(debt account balances)
```

Net worth is available in Reports, not as a primary Dashboard summary.

### 23.8 PDF export

Reports are exportable as PDF.

The PDF includes:

- Report title
- Applied filters
- Date range
- Generated timestamp
- Summary figures
- Chart(s)
- Underlying table or a clearly summarized table when the complete table is too long
- Page numbers

No CSV report export is required in the initial release, although the full data export contains portable tabular data.

---

## 24. Balance Checkpoints and Manual Reconciliation

### 24.1 Balance checkpoint

The owner can enter an external balance shown by a bank, card, or lender without changing the ledger.

The app displays:

- Balancebook calculated balance
- External reported balance
- Difference
- Comparison timestamp/date

A checkpoint is informational. It never adjusts the ledger automatically.

If the owner concludes Balancebook needs correction, they create or approve a specific transaction or Balance Adjustment.

---

## 25. Statement Reconciliation

### 25.1 Supported files

- PDF statements
- CSV transaction exports

### 25.2 Core rule

> Statement reconciliation is always review-first. Nothing in the ledger is added, edited, voided, or adjusted without explicit owner approval.

### 25.3 Workflow

1. Choose the Balancebook account.
2. Upload PDF or CSV.
3. Parse statement metadata and entries.
4. Display statement period and opening/closing balance when detected.
5. Suggest matches against the ledger.
6. Show unresolved items and mismatches.
7. Let the owner approve, reject, link, add, edit, or ignore each suggestion.
8. Save the completed reconciliation session and its decisions.

### 25.4 CSV import

Provide a small mapping step when column names are not recognized:

- Date
- Description/payee
- Amount, or separate debit/credit columns
- Optional balance column
- Date format

A mapping can be remembered for future statements from the same institution/file pattern.

### 25.5 PDF processing

- Extract embedded text first.
- If the statement is image-only or text extraction is inadequate, render/OCR pages locally on the server.
- Retain the original uploaded statement.
- Parsing failure must never prevent the owner from keeping the file or manually reconciling.

### 25.6 Matching suggestions

Suggestions may consider:

- Exact signed amount
- Transaction date, with a small posting-date tolerance
- Normalized payee/description similarity
- Account
- Existing reconciliation links

Default date tolerance: three calendar days. This is only a suggestion rule and is user-adjustable per session.

### 25.7 Reconciliation statuses

At minimum:

- Exact/strong match
- Possible match
- Missing from Balancebook
- Possible duplicate
- Amount mismatch
- Date mismatch
- Ignored/expected
- Resolved

### 25.8 Approved actions

The owner may explicitly approve:

- Link statement line to an existing ledger transaction.
- Add a missing transaction using a prefilled review form.
- Edit an existing transaction after reviewing exact changes.
- Leave a statement item unmatched.
- Mark a mismatch expected/ignored for that session.

Ignoring a mismatch does not alter ledger data.

### 25.9 Session history

Completed reconciliations retain:

- Original statement file
- Account and statement period
- Parsed entries
- Suggested and confirmed matches
- Approved additions/edits
- Ignored items
- Final difference/result
- Completion timestamp

Old sessions can be reopened read-only.

---

## 26. Attachments and Receipt OCR

### 26.1 Attachments

Transactions may have optional receipt images, screenshots, or files.

On mobile, the owner can take a receipt photo directly from the transaction form using the device camera where supported.

### 26.2 Storage

- Original file is retained.
- Files live in persistent mounted storage.
- Database stores metadata and relative paths, not giant base64 blobs.
- File names on disk must be generated, not trusted from uploads.
- Hash files for integrity and duplicate detection.

### 26.3 OCR behavior

Receipt OCR should attempt to extract:

- Payee
- Date
- Total
- Tax when recognizable

It may suggest a category using payee history and receipt content.

### 26.4 Review requirement

OCR output is always a draft suggestion.

- Never auto-post.
- Show extracted fields in an editable review form.
- Make low-confidence fields visually clear.
- OCR failure must not block manual transaction entry.

### 26.5 Offline receipt capture

While offline:

- The photo and transaction draft can be saved locally.
- The ledger transaction can be queued and applied optimistically.
- The attachment upload is queued.
- OCR waits until the device reconnects and the image reaches the server.

---

## 27. PWA and Offline Behavior

### 27.1 PWA requirements

- Installable manifest.
- Appropriate icons and standalone display behavior.
- Service worker for application-shell caching.
- HTTPS in production through the existing reverse-proxy environment.
- Clear update behavior; do not strand the app on stale assets indefinitely.

### 27.2 Local data store

Use IndexedDB for structured offline data and queued changes. Do not use localStorage for the ledger.

The local store contains the subset needed for normal offline use:

- Accounts
- Categories and payees
- Transactions and revisions needed for display
- Scheduled rules/occurrences
- Forecast inputs
- Pending local mutations
- Pending attachment blobs where storage permits

### 27.3 Offline-capable actions

Must work offline on an already authenticated device:

- View cached Dashboard data.
- View and search cached transactions.
- View account balances and forecasts based on cached data.
- Add Expense and Income.
- Add Transfer and Debt Payment.
- Add Balance Adjustment.
- Edit or void cached transactions.
- Create a payee inline.
- Capture an attachment and queue it.

Scheduled-rule edits may also be queued, provided the same conflict rules are used.

### 27.4 Server-required actions

These may require connection:

- Initial login or reauthentication after session expiry.
- OCR processing.
- PDF/CSV statement processing.
- Report PDF generation.
- Push-subscription registration.
- Backup and restore.
- Google Drive upload.

### 27.5 Optimistic local behavior

An offline transaction immediately updates local balances, reports, and forecasts on that device.

The queued mutation survives reload, browser restart, and PWA closure.

### 27.6 Mutation identity and idempotency

Every client mutation uses:

- Client-generated UUID
- Device/client identifier
- Base entity version when editing
- Client timestamp

The server records applied mutation IDs so retries cannot duplicate transactions.

### 27.7 Server authority after sync

The server ledger is authoritative after synchronization. Local state is reconciled to the server response.

### 27.8 Conflict detection

A conflict exists when the same entity was changed on two devices from the same older base version before sync.

The app must not silently choose “last write wins.”

Conflict UI presents:

- Server version
- Local version
- Field-by-field differences
- Keep server
- Keep local, after explicit confirmation
- Manually merge

All conflict resolutions create audit history.

### 27.9 Non-conflicting changes

Independent new transactions and edits to different records sync automatically.

### 27.10 Scheduled occurrences while offline

The server is responsible for authoritative auto-posting.

An offline client may show that an occurrence is expected/due, but it must not assume a background browser task posted it. If the owner manually posts a known occurrence offline, the queued mutation includes the occurrence ID. The server’s idempotency rule prevents a duplicate if the server already posted it.

### 27.11 Sync visibility

The app shows a compact state indicator:

- Online / synced
- Offline
- Changes waiting to sync
- Syncing
- Conflict requires attention
- Sync error

### 27.12 Logout and cached data

Explicit logout clears locally cached financial data, pending sessions, and offline queues only after warning about any unsynced changes.

Threat model: offline storage is intended for trusted personal devices. The app must not claim to protect cached data from a fully compromised device or browser profile.

---

## 28. Notifications

### 28.1 Delivery

Use PWA/browser push notifications where supported and permission is granted. Also provide an in-app notification center/fallback.

### 28.2 Scheduled-item timing

Notification timing is configurable per scheduled rule, including at least:

- Same day
- One day before
- Three days before
- A custom number of days before

Multiple notification offsets may be allowed if implementation remains simple.

### 28.3 Overdue reminders

Unresolved overdue occurrences continue reminding once daily by default until posted, skipped, or muted.

### 28.4 Credit-card reminders

Warn when the current card minimum is approaching and recorded qualifying payments are below the minimum.

### 28.5 Loan reminders

Loan due-date reminders fire each cycle regardless of payments already recorded.

### 28.6 Permission handling

- Ask for notification permission in context, not immediately on first page load.
- Explain why notifications are useful before the browser prompt.
- If denied or unsupported, the app remains fully usable with in-app reminders.

---

## 29. Authentication and Sessions

### 29.1 First-run setup

On an uninitialized installation:

- Create the sole owner account.
- Require email and password.
- Disable further public registration after setup.

### 29.2 Login

- Email + password.
- “Remember email” checkbox stores only the email/username convenience value.
- Never store the password client-side.

### 29.3 Sessions

- Use secure, HTTP-only, same-site cookies.
- Session timeout is based on inactivity.
- Timeout is configurable in Settings.
- Default inactivity timeout: 30 minutes.
- Reopening within an active session does not require another login.

### 29.4 Password storage

Use Argon2id with current OWASP-appropriate parameters. Parameters should be stored with the hash and can be upgraded on later successful login.

### 29.5 Recovery

Email-based Forgot Password is not required initially.

Provide a documented owner-operated Docker CLI recovery command that safely resets the sole user password from the home server console. It must not print the new password to logs.

### 29.6 Initial security exclusions

- No 2FA requirement.
- Biometric/WebAuthn unlock is a later nice-to-have only if it can be added through standard browser APIs without platform-specific hacks.

### 29.7 Login protections

- Rate-limit failed logins.
- Use CSRF protection appropriate to the cookie/session design.
- Regenerate the session after login.
- Invalidate sessions on password change.

---

## 30. Privacy and Security

- No bank credentials are ever requested or stored.
- No third-party analytics, ads, or telemetry by default.
- Receipt and statement OCR runs locally on the self-hosted server, not through an external AI/OCR service.
- Do not log passwords, session tokens, full statement text, receipt OCR text, notes, or complete financial payloads.
- Validate all uploaded file types and sizes.
- Sanitize file names and generated PDF content.
- Use restrictive file permissions for persistent data.
- Run the application container as a non-root user.
- Set standard security headers.
- Require HTTPS at the production origin for secure cookies, service workers, camera access, and push features.
- Secrets are supplied through environment variables or Docker secrets, never committed to source control.

---

## 31. Backup, Export, and Restore

### 31.1 Portability goal

The owner must be able to recover the app and inspect/export data without being locked into proprietary storage.

### 31.2 Full backup contents

A complete backup includes:

- Consistent SQLite database snapshot
- Accounts and opening balances
- All transactions and ledger entries
- Audit revisions and void history
- Categories and payees
- Scheduled rules and occurrence history
- Settings
- Push-subscription metadata where appropriate
- Attachments and receipt originals
- Uploaded statements
- Reconciliation history
- Backup manifest and checksums

Derived caches may be omitted because they can be rebuilt.

### 31.3 Backup format

Use a versioned archive such as:

```text
balancebook-backup-YYYY-MM-DD-HHMMSS.zip
```

Contents should include:

- `manifest.json`
- Consistent database snapshot
- Attachments and statement files
- Portable JSON/CSV exports of key records for lock-in protection
- Checksums

### 31.4 Manual backup

Settings provides:

- Create backup now
- Download completed backup
- View backup history and status

### 31.5 Automatic local backup

- Runs daily by default.
- Schedule is configurable.
- Stored in mounted persistent storage.
- Default retention: latest 30 successful local backups.
- Failed backup is visible and creates an in-app warning.

Use SQLite’s supported online-backup mechanism or an equivalent consistent snapshot. Do not copy a live database file naïvely.

### 31.6 Google Drive backup

Google Drive is optional and implemented outside the finance domain through rclone.

Recommended design:

- Balancebook creates and validates the local backup.
- An optional rclone sidecar/job uploads the completed archive.
- Use an rclone `crypt` remote so the cloud copy is encrypted before upload.
- Use the owner’s own Google OAuth client ID; do not rely on rclone’s retiring shared client ID.
- Drive failure does not invalidate the successful local backup.
- Show local-success and cloud-copy status separately.

Do not build a custom Google Drive SDK integration into the application unless this specification is later changed.

### 31.7 Restore

Restore must:

1. Validate archive type, manifest version, and checksums.
2. Confirm the backup is compatible or run documented migrations.
3. Create a safety backup of the current installation first when possible.
4. Require explicit destructive confirmation.
5. Restore database and files atomically enough to avoid a mixed state.
6. Rebuild derived caches.
7. Run an integrity check.
8. Report success or exact failure.

Provide both:

- In-app restore for a healthy installation.
- Documented Docker CLI restore for disaster recovery.

### 31.8 Restore testing

A backup feature is not considered complete until an automated or repeatable test proves a fresh installation can restore a generated backup and reproduce balances, transaction counts, attachments, and settings.

---

## 32. Visual Design System

### 32.1 Direction

- Clean modern finance application.
- Strong numeric hierarchy.
- Compact cards and rows.
- Minimal decoration.
- Functional rather than personalized.
- Minimal scrolling on mobile.

### 32.2 Theme

- Follow device/system light or dark theme automatically.
- No manual theme override is required initially.

### 32.3 Color semantics

- Positive values may use a positive color cue.
- Negative values may use an alert/negative color cue.
- `+` and `-` signs remain visible so color is never the sole indicator.
- Debt values remain visibly signed.

### 32.4 Account appearance

- Use consistent account-type icons.
- Use a neutral visual system.
- No user-selectable accent colors or icons in the initial release.

### 32.5 Accessibility

Target WCAG 2.2 AA behavior:

- Sufficient contrast in light and dark modes.
- Keyboard-accessible desktop workflows.
- Visible focus indicators.
- Semantic labels and form errors.
- Touch targets appropriate for mobile.
- Charts accompanied by text/table equivalents.
- Meaning never communicated by color alone.
- Respect reduced-motion preferences.

### 32.6 Accidental-action prevention

- Mobile summary cards do not navigate.
- Destructive actions require clear confirmation.
- Add/Edit forms do not save from backdrop taps.
- Void, restore, archive, reconciliation approval, and backup restore use deliberate actions.

---

## 33. Error, Empty, Loading, and Offline States

Every major screen must have truthful states.

### 33.1 Empty examples

- No accounts: guide owner to add first account.
- No transactions: show what the account opening balance means and present Add Transaction.
- No schedules: explain scheduled activity without implying budgets.
- No reports data: explain current filters/date range.
- No reconciliations: present upload entry point.

### 33.2 Loading

- Use compact skeletons where helpful.
- Never display fake financial values such as `$0.00` while real data is loading.

### 33.3 Errors

- State what failed.
- Preserve user-entered form data.
- Offer retry where safe.
- Never partially apply a linked financial transaction.

### 33.4 Offline

- Clearly show offline state.
- Distinguish locally saved from server-synced.
- Explain when a feature requires connection.
- Never imply a backup, OCR result, statement parse, or server auto-post succeeded while offline.

---

## 34. Recommended Technical Architecture

### 34.1 Architecture objective

One maintainable application, one primary database, one persistent file area, and one optional backup sidecar.

```text
Mobile/Desktop Browser PWA
  ├─ Service worker / cached app shell
  ├─ IndexedDB local ledger cache + mutation queue
  └─ HTTPS REST API
          │
          ▼
Single Node.js application container
  ├─ Fastify API
  ├─ Static React/Vite frontend
  ├─ Domain services and validation
  ├─ In-process scheduler/job runner
  ├─ Web Push sender
  ├─ Report generation
  └─ Local OCR/document parsing
          │
          ├─ SQLite database on mounted local storage
          └─ Attachments/statements/backups on mounted storage

Optional rclone sidecar/job
  └─ Encrypted Google Drive backup copy
```

### 34.2 Recommended stack

Use maintained releases and pin exact versions in the lockfile and container image.

- Runtime: Node.js 24 LTS at project kickoff, or the current supported LTS if implementation begins later.
- Language: TypeScript end-to-end.
- Frontend: React with Vite.
- Backend: Fastify REST API.
- Validation: Shared schema definitions used by client and server.
- ORM/query layer: Drizzle ORM or equally lightweight typed SQL layer.
- Database: SQLite.
- Client offline storage: IndexedDB through a small maintained wrapper or a carefully isolated native adapter.
- PWA: Standards-based service worker and web app manifest.
- OCR: Tesseract 5.x locally, with PDF pages rendered or passed through an appropriate local PDF OCR pipeline.
- Push: Standard Web Push/VAPID.
- Container orchestration: Docker Compose.

A technically equivalent substitution is allowed only when documented and demonstrably simpler or more maintainable. Do not switch to a cloud-only or serverless design.

### 34.3 Database operating mode

SQLite is appropriate because this is one user and one application instance.

- Store the database on a local Docker volume/bind mount, not NFS/SMB.
- Enable foreign keys.
- Prefer the normal rollback journal for the initial implementation; the workload does not require WAL.
- WAL may be enabled later only if the SQLite build contains the 2026 WAL-reset fix, storage is local, and testing demonstrates a reason.
- Use transactions for every linked ledger operation.
- Run periodic integrity checks and before/after restore validation.

### 34.4 One instance

Only one application instance may write the SQLite database. Horizontal scaling is not required and must not be introduced.

### 34.5 Background work

Use an in-process scheduler because there is one app instance.

Persist enough job/occurrence state to recover after restart. Do not add Redis or an external queue.

On startup:

- Find missed due scheduled occurrences.
- Process them idempotently according to auto-post settings.
- Resume pending document jobs where practical.
- Never create duplicate occurrences.

### 34.6 API style

- REST under a versioned prefix such as `/api/v1`.
- JSON for normal application data.
- Multipart upload for files.
- Consistent typed error envelope.
- Idempotency key for mutations from offline clients.
- Optimistic concurrency version on mutable entities.

### 34.7 File layout

Recommended persistent layout:

```text
/data
  /database
  /attachments
  /statements
  /reports-temp
  /backups
  /imports-temp
  /rclone-config   # optional, permission-restricted
```

Temporary files must be cleaned after success/failure and never be treated as the only copy of user data.

### 34.8 Deployment artifacts

Repository includes:

- Production Dockerfile
- `docker-compose.yml`
- `.env.example` without secrets
- Healthcheck
- Persistent-volume documentation
- Initial setup instructions
- Upgrade/migration instructions
- Backup/restore runbook
- CLI password-reset instructions

### 34.9 Container behavior

- Run as non-root.
- Gracefully close database connections on shutdown.
- Do not run destructive migrations automatically.
- Create a pre-migration backup before schema upgrades.
- Fail startup clearly if persistent paths are unavailable or read-only.

---

## 35. Logical Data Model

Names are illustrative; implementation may adjust naming while preserving semantics.

### 35.1 Authentication

**users**

- id
- email
- password_hash
- created_at
- updated_at

**sessions**

- id
- user_id
- created_at
- last_activity_at
- expires_at
- revoked_at

### 35.2 Settings

**user_settings**

- currency fixed to USD
- timezone
- inactivity_timeout_minutes
- auto_post_scheduled
- default_forecast_target_type
- default_forecast_rule_id/date
- backup_schedule
- backup_retention_count
- notification preferences

### 35.3 Accounts

**accounts**

- id
- user_id
- name
- class: BUDGET or DEBT
- subtype: CHECKING, SAVINGS, WALLET, CREDIT_CARD, LOAN
- institution_name nullable
- opening_balance_cents
- tracking_start_date
- sort_order
- archived_at nullable
- version
- created_at
- updated_at

**credit_card_details**

- account_id
- credit_limit_cents nullable
- apr_basis_points/decimal nullable
- statement_balance_cents nullable
- statement_close_date nullable
- minimum_due_cents nullable
- payment_due_date nullable

**loan_details**

- account_id
- apr_basis_points/decimal nullable
- term_months nullable
- required_payment_cents nullable
- due_day/date nullable
- interest_method nullable
- interest_reference_date nullable

### 35.4 Classification

**categories**

- id
- current_name
- active
- created_at
- updated_at

**payees**

- id
- current_name
- active
- created_at
- updated_at

**payee_category_preferences**

- payee_id
- category_id
- usage_count
- last_used_at

### 35.5 Ledger

**transaction_events**

- id UUID
- user_id
- type
- subtype nullable
- transaction_date
- name
- payee_id nullable
- payee_name_snapshot
- category_id nullable
- category_name_snapshot/system_bucket
- notes nullable
- status ACTIVE or VOIDED
- refund_of_transaction_id nullable
- scheduled_occurrence_id nullable unique
- total_amount_cents
- principal_cents nullable
- interest_cents nullable
- version
- created_at
- updated_at
- voided_at nullable

**ledger_entries**

- id
- transaction_event_id
- account_id
- amount_cents signed
- role: PRIMARY, SOURCE, DESTINATION, PRINCIPAL

**transaction_revisions**

- id
- transaction_event_id
- action
- before_json
- after_json
- created_at

### 35.6 Schedules

**scheduled_rules**

- id
- type/template fields
- amount_mode FIXED or VARIABLE
- fixed_amount_cents nullable
- start_date
- interval_count
- interval_unit
- end_date nullable
- max_occurrences nullable
- active/paused/ended
- version

**scheduled_occurrences**

- id
- rule_id
- due_date
- sequence_number
- status
- amount_override_cents nullable
- posted_transaction_id nullable unique
- exception_payload nullable
- created_at
- resolved_at nullable

**schedule_notifications**

- rule_id
- days_before/offset
- overdue_enabled

### 35.7 Attachments and OCR

**attachments**

- id
- transaction_id nullable
- statement/reconciliation_id nullable
- storage_path
- original_filename
- mime_type
- size_bytes
- sha256
- ocr_status
- ocr_result_json nullable
- created_at

### 35.8 Reconciliation

**reconciliation_sessions**

- id
- account_id
- source_type PDF/CSV
- source_attachment_id
- period_start/end nullable
- opening/closing balance nullable
- status
- completed_at nullable

**reconciliation_items**

- id
- session_id
- source_date
- description
- amount_cents
- source_balance nullable
- suggested_transaction_id nullable
- confidence nullable
- resolution_status
- linked_transaction_id nullable
- decision_metadata

### 35.9 Offline sync

**applied_client_mutations**

- mutation_id UUID unique
- device_id
- applied_at
- result_reference

Entity version fields provide optimistic concurrency.

### 35.10 Notifications and backups

**push_subscriptions**

- id
- user_id
- endpoint and keys encrypted/protected
- device label nullable
- created_at
- last_success_at
- disabled_at nullable

**backup_records**

- id
- local_path
- size
- checksum
- schema_version
- created_at
- local_status
- cloud_status
- cloud_error nullable

---

## 36. Hard Business Invariants

These must be enforced server-side, regardless of client validation.

1. Money persists as integer cents.
2. Account balances derive from opening balance plus active ledger entries.
3. A normal transaction cannot be future-dated.
4. A transaction cannot predate any affected account’s tracking start.
5. Archived accounts cannot receive new activity.
6. Transfer source and destination cannot be the same account.
7. Transfer sides have equal magnitude and opposite signs.
8. Credit-card payment source decrease equals card increase.
9. Loan payment source decrease equals total payment; loan increase equals principal.
10. Loan principal plus interest equals total payment.
11. Linked transaction creation/edit/void is atomic.
12. Opening balance locks after any ledger activity has ever existed.
13. Starting balances never enter Income or Spent metrics.
14. Transfers never enter Income or Spent metrics.
15. Credit-card payments never enter Income or Spent metrics.
16. Full loan payments enter Spent once.
17. Refunds enter Income and do not reduce Spent.
18. Positive adjustment enters Income; negative adjustment enters Spent.
19. A transaction has at most one normal category.
20. Used transactions and accounts are never hard-deleted.
21. Used categories/payees are hidden rather than hard-deleted.
22. Category and payee snapshots are preserved historically.
23. Active refund total cannot exceed the original expense.
24. One scheduled occurrence creates at most one ledger transaction.
25. Reconciliation never mutates the ledger without an explicit approved action.
26. Duplicate offline mutation IDs return the existing result rather than applying twice.
27. Stale entity versions create a conflict rather than silently overwriting.

---

## 37. Nonfunctional Requirements

### 37.1 Reliability

- Atomic linked writes.
- Graceful restart recovery.
- Idempotent scheduled posting and offline sync.
- Consistent backup snapshots.
- No data loss on container recreation.

### 37.2 Long-term maintainability

- Supported runtime and dependencies.
- Pinned dependency versions with deliberate upgrades.
- Straightforward schema migrations.
- No unnecessary infrastructure.
- Domain calculations isolated from UI code.

### 37.3 Performance

The app should remain responsive with at least tens of thousands of transactions.

- Paginate or virtualize long transaction lists.
- Index account/date/type/payee/category/status fields used by search and reports.
- Do not load every attachment or entire audit history into Dashboard requests.
- Cache derived report data only when invalidation remains simple and testable.

### 37.4 Observability

- Structured application logs.
- Health endpoint.
- Version/build information in Settings/About.
- Clear backup, scheduler, OCR, reconciliation, and sync status.
- No sensitive payload logging.

---

## 38. Testing Strategy

### 38.1 Unit tests

Required for:

- Signed balance calculations.
- Income/Spent classification.
- Available Funds and Total Debt.
- Transfer and debt-payment effects.
- Loan principal/interest split.
- Refund limits.
- Opening-balance lock.
- Recurrence generation, including month-end behavior.
- Forecast timeline calculations.
- Statement match scoring.
- Conflict detection.

### 38.2 Database/integration tests

Required for:

- Atomic linked transactions.
- Edit revision creation.
- Void/unvoid behavior.
- Category/payee hide/delete rules.
- Account archive rules.
- Scheduled occurrence idempotency.
- Duplicate offline mutation idempotency.
- Stale-version conflict responses.
- Reconciliation approval actions.
- Backup snapshot creation.

### 38.3 End-to-end tests

At minimum:

- First-run owner setup and login.
- Create each account type.
- Add expense/income/transfer/card payment/loan payment/adjustment.
- Edit, void, restore, and inspect history.
- Create fixed and variable recurring items.
- View mobile dashboard and account bottom sheet.
- Search/filter/sort combined ledger.
- Generate each required report and PDF.
- Go offline, add transaction, reload, reconnect, and sync.
- Create a two-device edit conflict and resolve it.
- Capture/upload a receipt and review OCR.
- Reconcile a known CSV and PDF fixture.
- Generate backup and restore it into a clean environment.

### 38.4 Financial regression fixtures

Maintain a small deterministic fixture set with expected balances, reports, and forecasts. These become permanent regression tests across migrations.

### 38.5 Migration tests

For every schema migration:

- Apply all migrations to a fresh database.
- Apply the new migration to a copy of the previous-version fixture.
- Verify ledger balances and counts before/after.
- Verify backup/restore compatibility.

---

## 39. Acceptance Criteria by Capability

### 39.1 Accounts

- Owner can create all five account types with required fields only.
- Current balance equals opening balance immediately after creation.
- Opening balance is excluded from activity metrics.
- Account starts tracking on creation date.
- Pre-creation and future normal transactions are blocked.
- Opening balance locks after first ledger activity.
- Accounts reorder within class.
- Accounts archive but never delete.
- Archived accounts disappear from current totals and remain historically reportable.

### 39.2 Ledger transactions

- Each transaction immediately affects local and server balances.
- Expense, Income, Transfer, Debt Payment, Balance Adjustment, and linked Refund work according to this document.
- Transfer and payment sides cannot drift.
- Edits create visible revision history.
- Voids preserve the record and remove financial effect.
- Voided entries remain in default search/history.

### 39.3 Categories and payees

- User can create custom values.
- New payee can be created inline.
- Payee autocomplete works.
- Category is suggested from payee history.
- Unused records delete; used records hide.
- Rename does not alter past visible snapshots.

### 39.4 Debt

- Card purchase makes card balance more negative and counts Spent.
- Card payment reduces source funds and card debt without counting Spent.
- Loan payment reduces source by total and loan by principal, while full payment counts Spent.
- Optional debt details can be added later.
- Card minimum warning and unconditional loan reminder behave as specified.

### 39.5 Scheduled activity

- Fixed and variable rules work.
- Pay-in-four style finite biweekly schedule ends automatically.
- Automatic posting default can be disabled globally.
- Variable item never posts without amount.
- Editing offers occurrence-only versus future-series behavior.
- Overdue items continue reminding until resolved.
- Occurrence posting is idempotent.

### 39.6 Forecasts

- Combined and per-account forecasts show running balances.
- Transfers preserve combined Available Funds.
- Forecast target can be date, month-end, or selected recurring occurrence.
- Settings target drives dashboard forecast.
- Variable amount produces a visibly incomplete projection.

### 39.7 Dashboard and navigation

- Login lands on Dashboard.
- Mobile shows the four summary metrics first.
- Mobile bottom navigation matches the five specified destinations.
- Summary cards do not navigate on mobile.
- Account tap opens a bottom sheet on mobile and full page on desktop.
- Dashboard minimizes unnecessary scrolling.

### 39.8 Reports

- All five required report types exist.
- Preset and custom dates work.
- Account/category/payee filters work.
- Charts include exact tables/numbers.
- Classification rules match Section 23.4.
- PDF export reflects active filters and figures.

### 39.9 Offline and sync

- Installed PWA opens with cached data offline.
- Offline transaction changes local balances immediately.
- Queued changes survive restart.
- Reconnect applies each mutation once.
- Conflicting edits are never silently overwritten.
- Conflict resolution is explicit and audited.

### 39.10 OCR and reconciliation

- Mobile receipt photo can attach to a transaction.
- OCR suggestions are editable and never auto-post.
- PDF and CSV statements can be uploaded.
- Parsing produces suggestions only.
- Every financial mutation requires approval.
- Ignored/expected mismatch remains session-only.
- Completed session history can be reopened.

### 39.11 Backup and restore

- Daily local backup runs by default.
- Manual backup can be created and downloaded.
- Backup contains database, files, settings, and history.
- Optional encrypted rclone Drive copy reports separate success/failure.
- Clean-install restore reproduces balances and files.
- Container recreation with the same volumes preserves all data.

---

## 40. Implementation Roadmap

The product bible describes the full intended v1. Codex should implement in vertical, testable milestones rather than attempting every feature at once.

### Milestone 0 — Foundation

- Repository and TypeScript setup
- Docker and persistent volumes
- SQLite schema/migrations
- First-run owner setup
- Login/session/logout/CLI recovery
- Responsive shell and system theme

### Milestone 1 — Authoritative Ledger

- Accounts and opening balances
- Ledger event/entry model
- Expense and Income
- Transfers
- Credit-card and loan payments
- Balance Adjustments
- Edit/void/audit history
- Categories/payees/snapshots
- Core calculation tests

### Milestone 2 — Daily UX

- Mobile Dashboard and bottom navigation
- Account bottom sheet and desktop detail
- Combined Transactions screen
- Search/filter/sort
- Refund workflow
- Account archive/reorder

### Milestone 3 — Scheduled Activity, Forecasting, and Reports

- Recurring rules and occurrences
- Auto-post and variable amount handling
- Notifications data model/in-app reminders
- Running forecasts and Settings target
- Required reports
- PDF export

### Milestone 4 — PWA and Multi-Device Offline Sync

- Installable PWA and app-shell caching
- IndexedDB local store
- Mutation queue and optimistic updates
- Server idempotency
- Entity-version conflicts and conflict UI
- Web Push
- Offline attachment queue

### Milestone 5 — Documents and Reconciliation

- Attachments and mobile camera
- Local receipt OCR and review
- PDF/CSV statement parsing
- Matching suggestions
- Approval workflow
- Reconciliation history

### Milestone 6 — Backup, Restore, and Hardening

- Manual and scheduled full backup
- Portable export contents
- In-app and CLI restore
- Optional encrypted rclone Drive copy
- Restore round-trip tests
- Security, performance, migration, and failure-state hardening

### MVP definition

A usable MVP requires Milestones 0 through 4 plus local manual and automatic backup. OCR, statement reconciliation, and Google Drive copying may follow immediately after without changing the core data model.

PWA installation, offline entry, and explicit conflict handling are MVP requirements—not optional polish.

---

## 41. Codex Implementation Rules

1. Treat this document as the product source of truth.
2. Do not add budgeting limits, envelopes, recommendations, or “safe to spend” behavior.
3. Do not connect to banks or financial providers.
4. Do not implement multi-user abstractions beyond the single owner record required for authentication.
5. Do not use floating-point money.
6. Do not store a mutable account balance as the authority.
7. Do not hard-delete accounts or transactions.
8. Preserve category/payee snapshots on transactions.
9. Use database transactions for linked financial events.
10. Reconciliation and OCR never auto-save financial changes.
11. Offline conflicts require manual resolution; do not use silent last-write-wins.
12. Keep architecture to one app container, SQLite, persistent files, and optional rclone sidecar unless a documented blocker proves otherwise.
13. Do not introduce Redis, queues, microservices, or cloud dependencies for hypothetical scale.
14. Keep mobile UX primary and validate at realistic phone widths throughout development.
15. Do not show fake or placeholder financial metrics as though they are real.
16. Every feature must include loading, empty, error, and offline behavior where relevant.
17. Every migration must preserve balances and pass migration tests.
18. Create a consistent pre-migration backup before production schema upgrades.
19. Add automated tests with every domain rule, not after the UI is complete.
20. When a requirement is unclear, choose the smallest behavior consistent with this bible and record the assumption.
21. Never “simplify” by weakening ledger integrity, audit history, backup/restore, or conflict detection.
22. Never “improve” the product by turning it into generic finance software.

---

## 42. Deferred Nice-to-Haves

These are acknowledged but must not contaminate MVP scope:

- Biometric/WebAuthn unlock when straightforward and broadly supported.
- User-selectable account accent colors/icons.
- More report types built from the same verified report engine.
- Additional portable exports from individual report screens.
- More sophisticated lender-specific loan formulas.
- Historical reference-only imports predating account creation.
- Optional manual theme override.

---

## 43. Resolved Decisions and Remaining Open Items

### 43.1 Resolved

The product model, supported accounts, balance authority, transaction rules, scheduled behavior, forecasts, report classification, navigation, mobile/desktop distinction, offline conflict policy, reconciliation approval rule, deployment, persistent storage, and backup goals are resolved in this document.

### 43.2 Intentionally flexible implementation details

The following can be selected during implementation without reopening product design, provided the behavior remains unchanged:

- Exact chart library.
- Exact IndexedDB wrapper.
- Exact PDF-rendering library.
- Exact schema-validation library.
- Exact component library, or whether to use one.
- Exact OCR preprocessing tools.
- Exact mobile/desktop breakpoint values.

### 43.3 Working name

Balancebook remains a working name and can be changed later.

---

## 44. Technical Reference Notes

These references were verified while preparing Version 1.0 on September 2, 2026. Codex should re-check supported versions at implementation time and pin exact dependencies.

- [Node.js release policy and supported releases](https://nodejs.org/en/about/previous-releases)
- [Vite documentation](https://vite.dev/)
- [Fastify documentation](https://fastify.dev/docs/latest/)
- [Drizzle ORM SQLite documentation](https://orm.drizzle.team/docs/sqlite/get-started-sqlite)
- [SQLite Online Backup API](https://www.sqlite.org/backup.html)
- [SQLite Write-Ahead Logging documentation and 2026 WAL-reset fix note](https://www.sqlite.org/wal.html)
- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [MDN: Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [MDN: IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [MDN: Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [MDN: Camera access with getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Tesseract OCR documentation](https://tesseract-ocr.github.io/tessdoc/)
- [rclone Google Drive documentation](https://rclone.org/drive/)
- [rclone Crypt documentation](https://rclone.org/crypt/)

---

# End of Project Bible

**Authoritative baseline:** Balancebook Project Bible v1.0, September 2, 2026.
