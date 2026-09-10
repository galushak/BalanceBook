# CSV review

Open Transactions > Import CSV, choose the destination account, select the export, and parse it. The original file is retained on the app server. Parsing and starting a review session do not post transactions.

Arrow Internet Banking exports are supported with their account metadata preamble, transaction number, date, description, memo, signed Amount Debit, and Amount Credit columns. Memo text is retained with the description. Adjust the column mapping for other formats; Discover and Citi exports still need representative-file testing. Signed amount files support reversing the sign convention. MDY and DMY dates are selectable.

Invalid rows, duplicate bank transaction numbers, malformed CSV, missing amounts, and ambiguous debit/credit values are reported. Resolve these before starting a session. Statement balance columns are never posted as transactions.

Matching suggests existing active transactions with the same account effect and amount within three days. Suggestions require review; they are not automatic posting decisions. Previously linked bank transaction numbers are recognized for the same account while the linked ledger entry remains active and its amount matches. Files without stable bank IDs rely on match suggestions rather than guaranteed duplicate identification.

Use Link to associate an existing transaction, Review addition / transfer to open the normal editable form, or Ignore / expected. Check the transaction type, payee, category, destination account, and date before saving. Prior balance adjustments may already cover missing purchases. Resolve those adjustments before adding the underlying purchases to avoid double-counting.

The review remains open when an addition is cancelled or saved. Completed sessions are read-only. Tests cover Arrow structure, memo quoting, signs, invalid rows, explicit mapping, repeated bank IDs and unchanged ledger state during matching.

Review rows now show one primary action: Confirm match (or Match existing transfer), Add transaction, or Review adjustment. Find another match and Skip this row are under Other options. Adjustment warnings are suggestions based on an exact total of unmatched outflows within ten days of the adjustment; they never alter the ledger. Finish review reports the unresolved count before closing the session.

Replace part of adjustment opens an editable payee/category review showing the new expense, remaining adjustment, and zero current balance change. One idempotent mutation creates labels if needed, creates the expense, reduces or voids the debit adjustment, and links the row. Stale versions, duplicate bank IDs, linked refunds/schedules, invalid rows and insufficient remainder are rejected. Historical balances between the purchase and adjustment dates can change. The final zero remainder voids the adjustment with its audit trail retained.

Discover exports (Trans. Date, Post Date, Description, Amount, Category) automatically reverse signed amounts: purchases decrease the account balance, refunds and payments increase it. Explicit mapping can override this. Recheck CSV repairs an untouched OPEN Discover review from its retained original file, refreshing signs and suggestions without changing ledger transactions; reviews with handled rows are excluded.

High-confidence matches link automatically on opening or saving an OPEN review. Requires a unique account/signed amount/date candidate and full payee agreement (or recognized merchant alias); competing rows and transactions linked in other reviews are excluded. Automatically matched rows are collapsed with an undo action that prevents automatic rematching. No ledger transactions are created by automatic matching.

Confirmed manual links teach account-scoped merchant aliases. Google CC@GOOGLE.COM reference suffixes are removed, preserving subscription identifiers such as KGTE/FORG. Automatic links never teach aliases. Conflicting learned payees are disabled until edited. Learned payees in reconciliation allows payee edits and reversible removal; overrides persist in settings. Existing amount/date/uniqueness requirements still govern automatic matching.
