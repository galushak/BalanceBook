# Balancebook

Working V1 demo of the private account ledger, with the approved dark command-center desktop design and responsive phone layouts.

**Open:** http://127.0.0.1:3080

Existing local demo login: `demo@balancebook.local` / `BalancebookDemo2026!` (sample data only).

```powershell
docker compose up -d --build
```

For a fresh installation, clone this repository, run the command above, and open the app. Create your owner account on the first-run screen; optionally select **Start with clearly labeled demo data**. The existing local demo credentials are not automatically created on a fresh installation.

```powershell
git clone https://github.com/galushak/BalanceBook.git
cd BalanceBook
docker compose up -d --build
```

Validation: `npm ci`, `npm run build`, and `npm test`. The repository includes source code, sample fixtures, and design references; your ledger, receipts, backups, and environment files remain local.

See [the demo guide](docs/README.md) for features, sample workflows, offline behavior, recovery, deployment, and current limitations. The running Docker ledger lives in a dedicated persistent volume.
