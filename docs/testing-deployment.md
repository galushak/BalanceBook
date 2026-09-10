# Testing Docker deployment

Deployed 2026-09-09 to `192.168.0.43` in `/opt/balancebook`.

- Compose project: `balancebook`
- Container: `balancebook-app-1`
- Image: `balancebook-demo-app:latest` (exported from the tested local image)
- Persistent data: `/opt/balancebook/data`
- Public origin: `https://balancebook.turneditoffandonagain.com`
- Cloudflare Tunnel service target: `http://192.168.0.43:3080`
- `APP_ORIGIN` is set to the public origin; `TRUST_PROXY=true` for the tunnel.
- Use HTTPS for login and encrypted offline storage. The LAN HTTP endpoint is an origin for the tunnel, not the normal browser login URL.

## Operations

Run from `/opt/balancebook` on the testing host:

```sh
docker compose ps
docker compose logs --tail=100 app
docker compose restart app
docker compose exec -T app npm run recovery -- backup
curl -fsS http://192.168.0.43:3080/api/health
```

Private migration archives are retained at `/opt/balancebook-migration-20260909` and in the local ignored `.cache/migration-20260909` directory. The local Docker container was stopped with its volume retained to prevent separate active ledgers. Restarting it is a rollback to the migration snapshot, not a sync of subsequent remote changes.

Image and data archive SHA-256 hashes matched before deployment. The database file hash matched before startup and its SQLite integrity check passed on both hosts. Financial records were not changed during migration.

At deployment, the final hostname did not yet resolve. HTTPS login and tunnel behavior remain to be verified after routing is configured. Existing app credentials are preserved; replace demo credentials before exposing the service without an additional access gate.
