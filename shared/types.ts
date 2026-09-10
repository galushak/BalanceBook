export type AccountType='CHECKING'|'SAVINGS'|'WALLET'|'CREDIT_CARD'|'LOAN';
export type EventType='EXPENSE'|'INCOME'|'TRANSFER'|'DEBT_PAYMENT'|'ADJUSTMENT'|'REFUND';
export interface Entity {id:string;version:number;createdAt:string;updatedAt:string}
export interface Account extends Entity {name:string;type:AccountType;institution:string;opening:number;trackingStart:string;archived:boolean;order:number;everUsed:boolean;details:Record<string,any>}
export interface Label extends Entity {name:string;active:boolean}
export interface Entry {accountId:string;amount:number}
export interface Tx extends Entity {type:EventType;date:string;accountId:string;toAccountId?:string;amount:number;principal?:number;interest?:number;subtype?:string;direction?:number;payeeId?:string;categoryId?:string;payee:string;category:string;notes:string;status:'ACTIVE'|'VOIDED';refundOf?:string;occurrenceId?:string;entries:Entry[];settlement?:'AWAITING_BANK'|'BANK_PENDING'|'POSTED';bank?:{manual?:boolean;excludeReports?:boolean;refs?:{id:string;accountId:string;pending:boolean;date:string;amount:number;description:string;transactionId:string}[];attention?:string;candidates?:string[];separateFrom?:string[];removed?:boolean;mergedInto?:string};imported?:{source:string;recordId:number;original:Record<string,any>;readOnly?:boolean;reason?:string}}
export interface Revision {id:string;entityId:string;entityType:string;action:string;before:any;after:any;at:string;actor:string}
export interface Rule extends Entity {label:string;template:Partial<Tx>;start:string;unit:'days'|'weeks'|'months'|'years';interval:number;end?:string;count?:number;mode:'FIXED'|'VARIABLE';status:'ACTIVE'|'PAUSED'|'ENDED';notifyDays:number;autoSplit:boolean;plaid?:{itemId:string;streamId:string}}
export interface Occurrence extends Entity {ruleId:string;due:string;sequence:number;status:'POSTED'|'SKIPPED'|'MUTED'|'WAITING';transactionId?:string;override?:Partial<Tx>}
export interface Attachment extends Entity {filename:string;mime:string;size:number;hash:string;entityId:string;kind:'transaction'|'statement';ocr?:any}
export interface Reconciliation extends Entity {accountId:string;attachmentId:string;periodStart:string;periodEnd:string;closing?:number;status:'OPEN'|'COMPLETE';items:any[];notes:string;tolerance:number}
export interface Checkpoint extends Entity {accountId:string;date:string;external:number;ledger:number;notes:string}
export interface Settings {merchantAliases?:{id:string;accountId:string;key:string;payeeId:string;disabled?:boolean}[];version?:number;timezone:string;timeout:number;autoPost:boolean;forecastTarget:'month'|'date'|'rule';forecastDate:string;forecastRule:string;backupHour:number;retention:number;demo:boolean;theme:'system'|'dark'|'light'}
export interface State {schema:number;epoch:string;accounts:Account[];events:Tx[];categories:Label[];payees:Label[];rules:Rule[];occurrences:Occurrence[];revisions:Revision[];attachments:Attachment[];reconciliations:Reconciliation[];checkpoints:Checkpoint[];settings:Settings}
export type Collection='accounts'|'events'|'categories'|'payees'|'rules'|'occurrences'|'reconciliations'|'checkpoints';
export interface Mutation {id:string;epoch:string;collection:Collection|'settings';action:string;entityId:string;baseVersion?:number;data:any;deviceId:string;resolution?:string}
export const accountTypes:Record<AccountType,string>={CHECKING:'Checking',SAVINGS:'Savings',WALLET:'Wallet',CREDIT_CARD:'Credit card',LOAN:'Loan'};
export const eventTypes:Record<EventType,string>={EXPENSE:'Expense',INCOME:'Income',TRANSFER:'Transfer',DEBT_PAYMENT:'Debt payment',ADJUSTMENT:'Balance adjustment',REFUND:'Refund'};
