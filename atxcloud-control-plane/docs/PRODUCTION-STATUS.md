# Production implementation status

This file tracks implemented control-plane boundaries. A feature is marked complete only when it has a real backend integration and server-side authorization; UI-only placeholders are not considered complete.

## Core
- PostgreSQL persistence and transactional services
- Discord OAuth2 identity and HTTP-only sessions
- Pterodactyl application API adapter
- Central authorization boundary
- Audit logging
- Idempotent coin ledger
- Owner/delegated server access
- Node/egg policy checks

## Required before launch
- Full Discord command/component workflow
- Complete dashboard server control surfaces
- Pterodactyl file/console/backup operations
- Server provisioning/allocation manager
- Staff destructive-operation workflows
- Reconciliation and failure recovery worker
- Minecraft tunnel provisioning and address lifecycle
- Reward-provider callback/verification adapters
- Production migrations and health/readiness checks
- Automated integration tests against a disposable Pterodactyl environment

No production deployment should be advertised as complete until the required list is implemented and verified.
