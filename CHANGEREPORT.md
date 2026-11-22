# Change Report

## 2026-11-22 07:10 IST — Pre-LinkedIn Production Security Hardening

### Objective
Harden public repository, API middleware, authentication, CORS, error handling, and CI workflow permissions prior to public LinkedIn sharing.

### Files Modified & Created
- `backend/src/config/env.ts` — Enforced fail-closed production startup validation refusing default/weak `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- `backend/src/app.ts` — Disabled `x-powered-by`, hardened `/uploads` static serving (`dotfiles: 'deny'`, `X-Content-Type-Options: nosniff`, `Content-Disposition: attachment` to prevent inline SVG/HTML XSS), and gated `/api/docs` off in production unless `ENABLE_DOCS=true`.
- `SECURITY.md` — Added responsible vulnerability disclosure policy.

### Verification Results
- `node --check --experimental-strip-types` on `env.ts` and `app.ts` (PASS).
