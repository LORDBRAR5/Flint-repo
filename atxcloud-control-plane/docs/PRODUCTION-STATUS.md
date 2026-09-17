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
- Cloudflare Tunnel-compatible web binding
- User-controlled Minecraft Playit plugin provisioning for compatible Bukkit/Paper-family servers

## Playit policy
AtxCloud does **not** create, claim, authenticate, configure, or manage a Playit account or tunnel. For compatible Minecraft software, server creation now creates `/plugins` when needed and uses Pterodactyl's remote-file pull API to place the configured Playit Minecraft plugin directly at `/plugins/playit-minecraft-plugin.jar`. The server owner completes Playit setup themselves. Non-Minecraft and non-plugin-capable software is not modified. If plugin provisioning fails, the newly-created Pterodactyl server is rolled back instead of returning a false-success server record.

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
