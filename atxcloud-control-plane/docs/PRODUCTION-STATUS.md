# Production implementation status

This file tracks the actual control-plane implementation. A feature is complete only when it has a real backend integration, server-side authorization, failure handling, and no fake success state.

## Implemented foundations
- PostgreSQL persistence and transactional services
- Discord OAuth2 identity with HTTP-only sessions and OAuth state validation
- Pterodactyl application/client API adapter
- Central server ownership/delegated-access checks
- Audit logging
- Idempotent coin ledger and transfer locking
- Node/egg policy checks
- Reconciliation worker for Pterodactyl/local server drift
- Staff destructive-operation API boundaries
- File, console, startup and backup API adapters
- Cloudflare Tunnel-compatible web binding on 127.0.0.1:4832
- User-controlled Minecraft Playit plugin bootstrap for compatible Bukkit/Paper-family servers

## Playit policy
AtxCloud does **not** create, claim, authenticate, configure, or manage a Playit account or tunnel. For compatible Minecraft software, server creation adds a one-time startup bootstrap that downloads the Playit Minecraft plugin into `/plugins/playit-minecraft-plugin.jar`. The server owner completes Playit setup themselves. The bootstrap is disabled for non-Minecraft and non-plugin-capable software.

## Still required before the project can be called launch-ready
- Complete dashboard information architecture and all requested pages
- Complete dashboard server create flow with real allocation selection and validation
- Full console/files/startup/backups/players/plugins/mods/settings UI with live Pterodactyl state
- Full Discord command/component workflow, including `a!` compatibility, 120-second interaction expiry and all requested staff actions
- Staff stats with live running/offline/suspended counts and slot capacity/availability
- Safe server transfer/delete/blacklist workflows with cross-surface synchronization
- Production-grade provisioning rollback when Pterodactyl succeeds but local persistence fails
- Reward-provider adapters, signed callbacks/verification, cooldowns and abuse controls
- Referrals/rewards/store backend and dashboard UI
- Theme/appearance engine and admin customization UI
- Health/readiness dependency checks and operational diagnostics
- Production migrations that are safe to re-run without destroying existing data
- Automated TypeScript builds, schema checks and integration tests against disposable Pterodactyl fixtures
- Final deployment/install script hardening and Cloudflare route verification

Do not advertise the system as fully launch-ready until every item in the remaining list is implemented and verified.
