# AtxCloud Control Plane

Production control-plane source tree. This repository intentionally keeps deployment secrets out of Git.

## Runtime
- API: Fastify + PostgreSQL
- Bot: Discord.js
- Web: Next.js
- Pterodactyl credentials remain server-side
- Cloudflare Tunnel remains the public ingress

Deployment is documented in `atxcloud-control-plane/docs/DEPLOYMENT.md`.
