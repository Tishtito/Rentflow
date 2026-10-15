# Rentflow frontend

The admin portal and tenant portal for Rentflow, in one pnpm + Turborepo monorepo.

```
apps/admin      landlords, caretakers, super admins   http://localhost:5173
apps/portal     tenants (phone-first)                  http://localhost:5174
packages/ui     shared components (design system)
packages/api    API client + React Query hooks (cookie auth on the web, tokens in the apps)
packages/core   API types, money and date formatting
packages/native Capacitor helpers (secure token storage, back button, splash)
packages/config Tailwind preset + tokens, tsconfig, ESLint
```

Both apps are installable **PWAs** and are wrapped with **Capacitor** into Android and iOS apps
(`apps/*/android`, `apps/*/ios`).

## Run it

Needs Node 20+ and pnpm (`corepack enable pnpm`), plus the Laravel API in `../backend`.

```bash
# backend
cd ../backend && php artisan migrate:fresh --seed && php artisan serve   # :8000

# frontend
pnpm install
pnpm dev
```

Log in to the admin portal as `landlord@rentflow.test` / `password`, and to the tenant portal as
`jane@rentflow.test` (or national ID `12345678`) / `password`.

The dev servers proxy `/api` and `/sanctum` to `VITE_API_URL` (default `http://localhost:8000`; copy
`.env.example` to `.env.local` to change it).

## Android and iOS apps

Needs [Android Studio](https://developer.android.com/studio); build with its bundled JDK 21 (Capacitor 8's
requirement; this machine's system Java is 25). iOS needs a Mac with Xcode.

```bash
# Laravel reachable from the emulator (it is http://10.0.2.2:8000 inside it)
cd ../backend && php artisan serve --host=0.0.0.0

# build + copy into the native projects (CAP_DEV=1 allows the http dev API)
CAP_DEV=1 pnpm --filter @rentflow/portal cap:sync
pnpm --filter @rentflow/portal cap:android      # opens Android Studio → Run
```

Same for `@rentflow/admin`. On a real phone over USB: `adb reverse tcp:8000 tcp:8000` and set
`VITE_API_URL=http://localhost:8000` in `apps/*/.env.native`. When there is a domain, put the https API URL in
`.env.native`, change the placeholder app IDs (`capacitor.config.ts`), and rebuild with `pnpm native:sync`.

Icons and splash screens: edit `apps/*/public/icon.svg` (PWA) and `apps/*/assets/*.png` (apps), then
`pnpm --filter @rentflow/portal cap:assets`.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

See `CLAUDE.md` for the architecture and the design rules.
# Rentflow
