# Balancebook V1 Demo

A working single-owner USD ledger based on the approved command-center mockups. The owner authorized completing the remaining desktop and phone designs on September 5, 2026. Transaction names are deliberately absent; payees, categories and schedule labels remain.

## Open the running demo

Visit **http://127.0.0.1:3080**.

- Email: `demo@balancebook.local`
- Password: `BalancebookDemo2026!`
- Everything in this installation is labeled sample data. These credentials belong only to the local demo.

Three budget accounts and five debt accounts start with derived totals of $12,450 in Available Funds and -$24,850 in Total Debt. The dataset includes income, purchases, transfers, debt payments, a refund, voided activity, and fixed/variable schedules. Browser verification entries may remain as voided records with their audit history.

## Try it

1. Select an account. Desktop opens a detail page; phone opens a bottom sheet with its forecast and ledger.
2. Add a transaction. The review panel shows both account effects and reporting classification before saving. New payees and categories can be typed inline.
3. Open a transaction to edit, refund, void/restore, attach a receipt, or inspect its history.
4. Visit Scheduled for recurring rules, finite series, occurrence overrides, skip/mute, and reviewed posting. Variable amounts always need confirmation. Loan automation requires an explicitly approved split.
5. Reports contains category spending, payee spending, Income versus Spent, Available Funds balance history, and net worth. Charts have exact figures and PDF export respects the filters.
6. Account → Reconciliation accepts CSV/PDF statements, suggests matches, and waits for approval. The included `demo-statement.csv` and `demo-statement.pdf` are reference fixtures. Completed sessions remain read-only.
7. Account → Settings contains accounts, labels, forecasts, appearance, inactivity timeout, backups, and security.
8. To exercise offline mode, first log in online, stop the container with `docker compose stop`, reload the page, and log in with the same credentials. Add a sample expense. Start the container again and sync. If the server session has expired, lock and log in online to reconnect.

## Run and maintain

From the project root:

```powershell
docker compose up -d --build
docker compose ps
docker compose logs --tail 50
docker compose stop
docker compose start
```

The Compose project is `balancebook-demo`. Its dedicated volume is `balancebook-demo_balancebook-data`. Recreating the container preserves this volume. Do not remove the volume to update the app.

The Compose port is bound to this computer's loopback interface. For use on a phone, deploy behind the owner's existing HTTPS access setup, set `APP_ORIGIN` to that exact origin and `TRUST_PROXY=true` only when behind a trusted proxy. Browser PWA installation and camera access require a supported secure context. Reverse proxy, certificate, and remote access setup remain outside this project.

For development with Node 22.13+ (Docker uses Node 24):

```powershell
npm ci
npm run build
npm start
```

`npm run dev` watches the server. Run `npx vite` separately for frontend hot reload at port 5173. Browser verification uses the production build at port 3080. `npm test` runs financial, API, scheduling, restore, PDF/CSV and OCR regressions; `npm run check` checks TypeScript.

## Data and recovery

Permanent Docker data lives in `/data`: SQLite, content-addressed attachments, and backups. The local `data/` directory is the earlier standalone development copy, not the running Docker ledger. The app never connects to a bank or moves actual money.

- Current balances are opening balances plus active integer-cent entries. Transfers and payments are atomic events with linked entries.
- Opening balances lock after activity. Deleting accounts or transactions is unsupported; archive or void preserves history.
- The owner password uses Argon2id. API sessions use hashed random tokens in HttpOnly SameSite cookies.
- Offline state, draft and file queue are encrypted in IndexedDB with AES-GCM and a password-derived key. The app locks after inactivity and requires the password after a full reload. First use of a device requires an online login. Logout removes that device's local vault after warning about pending changes.
- Offline mutation IDs are idempotent. Stale record versions prompt a field comparison and explicit resolution. Restore changes the installation epoch so old offline changes cannot silently repopulate restored data.
- Daily backup defaults to 2 AM in the app timezone, with catch-up while the app server is running and retention of 30 successful archives. ZIPs include a consistent SQLite snapshot, files, audit history, settings, JSON/CSV exports and checksums.
- In-app restore requires typing RESTORE and creates a safety backup first. Owner credentials come from the restored archive. All server sessions are invalidated.

CLI recovery works with the app stopped:

```powershell
docker compose stop
docker compose run --rm app npm run recovery -- backup
# Supply a backup path inside the mounted /data volume:
docker compose run --rm app npm run recovery -- restore /data/backups/YOUR-BACKUP.zip --confirm
docker compose start
```

For a forgotten owner password, set `RECOVERY_PASSWORD` in the recovery process environment and use `npm run recovery -- reset-password` (see `server/cli.ts`). Do not put a real password in a committed file. Local ZIP backups contain readable data and credentials hashed for authentication; protect their storage. Keep the separate rclone crypt secrets if enabling encrypted cloud copies.

## Optional encrypted Drive copies

The Docker image includes rclone. Configure a Google Drive remote, then wrap a dedicated folder with an rclone **crypt** remote. Mount that configuration into the container, set `RCLONE_CONFIG` to its path and `RCLONE_REMOTE` to the crypt remote name followed by a colon, for example `balancebook-crypt:`. The app verifies `type=crypt`, copies local archives, and tracks cloud status separately. It never accepts a destination from an HTTP request, and never deletes remote archives as part of local retention. Configuration/credentials are intentionally not supplied with this demo.

See the official [rclone crypt setup](https://rclone.org/crypt/) and [copyto behavior](https://rclone.org/commands/rclone_copyto/). No cloud upload or external push subscription was performed during demo verification.

## Demo boundaries

This is a functioning V1 demo, not a claim of production certification or exhaustive acceptance of every bible requirement.

- Document extraction is conservative. Clean CSV and text PDFs work best; scanned pages use local OCR. Suggestions must be reviewed and difficult statement layouts may need manual entry. Receipt OCR can populate a reviewed edit; it does not save on its own.
- PDF exports, OCR processing, original-file downloads, and full backup/restore need the server. On-screen reports remain available offline. Offline ledger entry and its attachment queue work locally.
- The demo synchronizes the whole ledger and audit metadata. Large multi-year datasets have not undergone a production load test; server pagination/delta sync is the next scaling step. Attachment contents are fetched separately.
- All reminders, confirmations, and text prompts stay inside the app. Browser push delivery is disabled. Encrypted Drive integration requires owner configuration and has not been tested against its external service.
- Reconciliation matching is a review aid, not a bank import. Only explicitly approved additions alter balances. It does not infer principal/interest splits from bank descriptions.
- Use one active editing tab per browser profile. Multiple physical devices each keep their own encrypted vault and use optimistic concurrency.

The original project bible is preserved in `docs/Balancebook_Project_Bible_v1.0.md`. Later owner decisions are in `design/decisions.md`.
