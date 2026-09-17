# AtxCloud Production Architecture

The control plane is the source of truth for AtxCloud state. Discord and the dashboard call the same API; neither surface mutates Pterodactyl or the coin balance directly.

## Core domains
- Identity and Discord OAuth sessions
- Pterodactyl account synchronization
- Server ownership and delegated access
- Node/egg/nest policies and allocation capacity
- Server lifecycle and power operations
- Coin ledger, transfers, referrals, rewards and store
- Staff operations and destructive-action confirmations
- Audit events and reconciliation
- Tunnel/address provisioning

## Security rules
- Browser never receives Pterodactyl application/client keys.
- Discord bot never trusts component custom IDs for authorization; every action is checked against the authenticated Discord user and current database state.
- Coin balances are derived from an immutable ledger inside database transactions.
- Destructive operations require an idempotency key and an explicit confirmation.
- OAuth uses state validation and secure HTTP-only cookies.

## Synchronization
Pterodactyl is an external system. AtxCloud records the external Pterodactyl IDs and periodically reconciles users, servers, nodes and server state. External failures are surfaced as operation failures rather than fake success messages.
