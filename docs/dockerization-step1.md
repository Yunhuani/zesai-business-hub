# Deployment Prep Step 1: Backend Containerization

## Scope

This step containerizes the platform backend and serves the built frontend from the Express process. NBG engine containerization is intentionally excluded.

## Serving Choice

Chosen option: Express serves the Vite build output from `dist/public`.

Reason: the backend already owns `/api/*`, `/api/trpc`, and production static serving. Keeping the frontend in the same container avoids an extra Nginx reverse proxy and keeps API calls same-origin. A separate Nginx container can be added later if CDN-style static hosting, edge caching, or independent frontend scaling becomes necessary.

## Files

- `Dockerfile`
  - `deps`: installs all dependencies.
  - `build`: runs `npm run build`.
  - `runner`: production runtime image for Express and static frontend.
  - `migrate`: runs existing Drizzle migrations.
- `docker-compose.yml`
  - `mysql`: local MySQL dependency for reproducible startup.
  - `migrate`: one-shot migration service.
  - `app`: backend plus frontend static serving on port `3000`.
- `.dockerignore`
  - Excludes local dependencies, build output, logs, git metadata, and local env files from image context.

## Environment

Compose loads `.env` with `env_file: .env` so secrets and provider settings such as `JWT_SECRET`, `SMTP_USER`, `SMTP_PASS`, `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL` are injected at runtime.

For reproducible local startup, compose overrides these runtime values:

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=mysql://zesai:zesai_password@mysql:3306/zesai_business_hub`
- `DATABASE_SSL=false`
- `NBG_HEALTH_REQUIRED=false`

`NBG_ENGINE_URL` is pointed at `host.docker.internal:8000` as a placeholder for callers, but `/health` does not require NBG in this step.

## Local Commands

```bash
docker compose up --build
```

Verification commands:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/
curl http://localhost:3000/api/health
curl http://localhost:3000/trpc
```

Expected readiness result for `/health`:

```json
{
  "status": "ok",
  "checks": {
    "service": { "status": "ok" },
    "database": { "status": "ok" }
  }
}
```

## Current Verification

- `npm.cmd run build`: passed locally; frontend output is now generated under `dist/public`.
- `npx.cmd vitest run server/health.test.ts`: passed.
- `npm.cmd run check`: failed on pre-existing TypeScript errors unrelated to containerization.
- `docker compose up --build`: not run in this environment because Docker CLI is not installed.
