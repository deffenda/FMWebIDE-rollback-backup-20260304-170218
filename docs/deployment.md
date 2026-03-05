# Deployment and Environment Hardening (Phase 9)

## Environment profiles

Central profile config lives in:
- `/Users/deffenda/Code/FMWebIDE/src/server/enterprise-config.ts`

Supported profiles:
- `DEV`
- `TEST`
- `PROD`

Set via:
```bash
WEBIDE_ENV_PROFILE=PROD
```

Profile impact includes defaults for:
- auth mode
- CSRF enforcement
- audit logging
- rate limiting
- structured logs

## Health endpoint

Runtime health endpoint:
- `GET /api/health`

Includes:
- profile
- auth mode
- shutdown state
- metrics route count
- timestamp

## Graceful shutdown state

Module:
- `/Users/deffenda/Code/FMWebIDE/src/server/graceful-shutdown.ts`

Tracks:
- SIGINT/SIGTERM state
- shutdown reason and timestamp

## Docker deployment

Files:
- `/Users/deffenda/Code/FMWebIDE/Dockerfile`
- `/Users/deffenda/Code/FMWebIDE/docker-compose.yml`

Build:
```bash
docker build -t fmwebide:latest .
```

Run:
```bash
docker compose up -d
```

## CI/CD sample

GitHub Actions workflow:
- `/Users/deffenda/Code/FMWebIDE/.github/workflows/ci.yml`

Pipeline steps:
- install
- typecheck
- lint
- tests
- production build

## Production build script

`package.json` includes:
- `npm run build:prod`

Equivalent:
```bash
WEBIDE_ENV_PROFILE=PROD NODE_ENV=production next build
```
