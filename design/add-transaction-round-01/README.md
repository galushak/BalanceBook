# Desktop Add Transaction - Review set 01

Status: all six current form-state mockups explicitly approved by the owner, including corrected Income and Loan Payment images. Exact references are preserved in ../approved/desktop-add-transaction/. Dashboard and Transactions approvals remain unchanged. No app code has been implemented.

## Current review images

1. [Expense](01-expense.png)
2. [Income - corrected](02-income.png)
3. [Transfer](03-transfer.png)
4. [Card Payment](04-card-payment.png)
5. [Loan Payment - corrected](05-loan-payment.png)
6. [Balance Adjustment](06-balance-adjustment.png)

Built-in image generation was used with the approved desktop Transactions screen as the shell reference. The Expense mockup then served as the common form-layout reference. Exact initial submissions are in submitted-prompts.json; the subsequent Income and Loan Payment corrections are in correction-prompts.json. prompts.json records the initial form briefs.

## Shared design

- Select transaction type first, then account(s), then relevant fields.
- No transaction Name, Title, or equivalent required freeform field.
- Inputs on the left, current/change/after-save account preview on the right.
- Optional notes and attachments; one deliberate Save transaction action.
- Debt Payment adapts to credit-card or loan destination. Refund remains a linked expense action and is not included as a top-level type.
- All displayed financial information is illustrative sample data; previews are labeled Not saved.

## Visual and arithmetic review

| Form | Verified sample effects |
| --- | --- |
| Expense | Checking $3,450.00 minus $86.42 = $3,363.58; Spent increases $86.42 |
| Income | Checking $3,450.00 plus $2,500.00 = $5,950.00; Income increases $2,500.00 |
| Transfer | Checking $2,950.00; Savings $9,300.00; combined funds unchanged; excluded from Income/Spent |
| Card Payment | Checking $3,300.00; card -$1,100.00; excluded from Income/Spent |
| Loan Payment | Checking $3,000.00; loan -$14,150.00; $350 principal + $100 interest = $450 payment; full payment counts as Spent |
| Adjustment | Wallet $200.00 minus $5.00 = $195.00; Spent increases $5.00 |

- Corrected the first Income rendering, which had omitted the editable payee/category controls.
- Corrected the first Loan Payment rendering, which had omitted the $350 principal input value.
- Some images include generated notes counters suggesting a 300-character cap. That is not an approved product constraint and should be omitted in the final design.
- Expense preview table omits some dollar signs although the monetary values and arithmetic are correct. Normalize USD formatting during refinement.
- The corrected loan principal control has a slightly awkward double-border label/value treatment; preserve the value and use the same label/input treatment as Interest in final refinement.
- These are visual mockups. Unshown validation, unsaved-change handling, empty/error/offline states, keyboard behavior and accessibility remain to be specified or reviewed. No runtime verification is claimed.
