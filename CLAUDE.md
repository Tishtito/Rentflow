# Rentflow — Frontend monorepo (React + TypeScript)

Two React apps for the Rentflow rental system, sharing one set of packages. Backend: the Laravel API in
`../backend` (read its `CLAUDE.md` and `docs/SCHEMA.md`).
Stack: pnpm workspaces + Turborepo, Vite 5, React 18, TypeScript (strict), Tailwind 3, React Router 6, TanStack Query 5.

| App | Port | Users | Routes |
|---|---|---|---|
| `apps/admin` | 5173 | landlords, caretakers (`/admin/*`), super admins (`/platform/*`) | `AdminShell` (dark sidebar) |
| `apps/portal` | 5174 | tenants, phone-first | `TenantShell` / `TenantAuthLayout` |

| Package | What's in it |
|---|---|
| `@rentflow/config` | design tokens (`tokens.js`), Tailwind preset, tsconfig base, ESLint + PostCSS config |
| `@rentflow/core` | API types (`types.ts`, mirror the Laravel Resources), money/date formatting (`format.ts`), `cn` |
| `@rentflow/ui` | every component: primitives, layout shells, feedback, domain components; `styles.css` |
| `@rentflow/api` | fetch client (cookie or token auth), `ApiProvider`, TanStack Query hooks per endpoint, `RequireAuth` |
| `@rentflow/native` | Capacitor helpers: `isNative()`, `secureTokenStore()` (Keychain/Keystore), `useNativeShell()` (Android back button, status bar, splash), `useOnline()` |

Packages are source-only (no build step): `exports` point at `src/*.ts`, and Vite/TS compile them from source.

```bash
pnpm install
pnpm dev            # both apps (needs Laravel on :8000: php artisan serve)
pnpm dev:admin      # or one app
pnpm typecheck && pnpm lint && pnpm test && pnpm build
pnpm native:sync    # Capacitor: build both apps for Android/iOS and copy into android/ + ios/
```

## Talking to the API

- **Two auth modes, chosen in each app's `src/api.ts`** (`packages/api/src/client.ts`):
  - **cookie** (browser + installed PWA): Sanctum SPA sessions. `GET /sanctum/csrf-cookie` before the first
    write, `X-XSRF-TOKEN`, one retry on 419. Admin `POST /api/admin/auth/login|logout`; tenant
    `POST /api/portal/auth/login|logout`.
  - **token** (Android/iOS apps, `isNative()`; or a browser build with `VITE_AUTH_MODE=token` for testing):
    the web view's origin (`https://localhost` / `capacitor://localhost`) can't use the API's cookies, so the
    app calls `VITE_API_URL` directly with `Authorization: Bearer`. Admin `POST|DELETE /api/admin/auth/token`;
    tenant `POST|DELETE /api/portal/auth/token`. The token lives in the Keychain/Keystore (`secureTokenStore`).
  - The login/logout hooks branch on `api.auth`; pages never care which mode is used.
  - `GET /api/admin/user` / `GET /api/portal/user` work in both modes. Tenant login may return
    `{ choose_home: true, homes }` (one person, several landlords) in both modes.
- In dev, Vite proxies `/api` and `/sanctum` to `VITE_API_URL` (default `http://localhost:8000`), so the SPA
  is same-origin and needs no CORS. The origins must be in the backend's `SANCTUM_STATEFUL_DOMAINS`.
- Write endpoints answer **202** (the backend is event-driven); the hooks invalidate the affected queries.
  422 → `ApiError.field(name)` for the `TextField` `error` prop.
- **One hook per endpoint** in `packages/api/src/admin.ts` / `portal.ts`. Add new endpoints there, and their
  types in `packages/core/src/types.ts`, together with the backend API Resource.
- Super admins acting inside an account: `api.setAccountId(id)` sends `X-Account-Id` (UI not built yet).

## Design rules (from the "Kims Properties Portals" design canvas)

The screens were designed in Claude Design; the original export lives in `../kims-frontend` (pages there
show each artboard with mock data). When a new screen is designed, build it **only from `@rentflow/ui`**;
add a new component only when nothing fits, in the right folder so the next screen can reuse it.

1. **Tokens only — no raw hex in components.** Colours, fonts and radii live in `packages/config/tokens.js`
   and are exposed through Tailwind (`bg-brand`, `text-muted`, `border-line-strong`, `bg-warn-soft text-warn-ink`,
   `rounded-lg`, `font-display`…). Both apps' `tailwind.config.ts` use the preset and scan `packages/ui/src`.
2. **Money:** the API sends decimal strings. Display with `formatKES` / `formatAmount`; do arithmetic in integer
   cents via `toCents` (never `Number(a) + Number(b)` on money). Add the `num` class to every block of numbers.
3. **Dates** with `formatDate` / `formatDateTime` / `formatPeriod` (Africa/Nairobi, "16 Oct").
4. **Statuses** always through the mapped badges (`InvoiceStatusBadge`, `PaymentStatusBadge`,
   `BillingRunStatusBadge`, `WhatsAppStatusBadge`, `DeliveryStatusBadge`, …) so a status reads the same everywhere.
5. **Accessibility:** 44px touch targets (`min-h-touch`); real `<button>`/`<a>`/`<label>`; `IconButton` needs
   `label`; contrast ≥ 4.5:1 (don't put `text-muted` on tinted fills, use the family's `-ink`).
6. **Responsive:** fluid pages; side-by-side regions use `flex flex-wrap` with `flex-[3_1_560px]` /
   `flex-[1_1_340px]`; tables scroll inside their card (`DataTable`). No horizontal page scroll at 390px.
7. **Navigation:** router `Link`/`NavLink`/`ButtonLink`, never `<a href>`, for in-app routes.
8. **No fake data in the apps.** A screen without an API shows `ComingSoon` (admin) / `SoonCard` (portal).
   Sample data stays in `packages/ui/src/__fixtures__/data.ts` for tests.
9. Loading / failure / empty: `LoadingState`, `ErrorState` (with retry), `Notice`, `DataTable`'s `empty`.
10. **App-safe layout:** fixed/sticky bars pad with `env(safe-area-inset-top|bottom)` (notches, home bar in the
    Capacitor apps); the shells already do. Native-only behaviour goes through `@rentflow/native`, never
    `Capacitor.*` calls in pages.

## PWA and the Android/iOS apps

- **PWA** (`vite-plugin-pwa` in each `vite.config.ts`): manifest, icons generated from `public/icon.svg`
  (`pwa-assets.config.ts`), Workbox service worker that precaches the app shell (works offline) and caches
  Google Fonts. **API responses are never cached** (personal data, shared phones). `registerType: 'prompt'`:
  `AppChrome` shows `UpdatePrompt` when a new version is deployed. `OfflineBanner` shows while offline.
- **Capacitor** (`apps/*/capacitor.config.ts`, `android/`, `ios/`): `pnpm build:native` = `vite build --mode native`
  (no service worker; `.env.native` sets `VITE_API_URL`), `pnpm cap:sync` copies it into the native projects.
  - App IDs `com.codepasstech.rentflow.tenant` / `.admin` are **placeholders** (no domain yet): change `appId` in
    `capacitor.config.ts` and the Android `applicationId`/iOS bundle id before the first store upload.
  - Native icons/splash: `apps/*/assets/*.png` → `pnpm cap:assets`.
  - Debug Android builds may call `http://10.0.2.2:8000` / `http://localhost:8000` (`android/app/src/debug/`
    network security config); release builds are https only. Use `CAP_DEV=1 pnpm cap:sync` for the emulator.
  - The API must list the app origins in `CORS_ALLOWED_ORIGINS` and must NOT have bare `localhost` in
    `SANCTUM_STATEFUL_DOMAINS` (see backend `config/cors.php`).

## Component catalogue (`@rentflow/ui`)

| Folder | Components |
|---|---|
| `primitives` | `Button` (`primary`, `secondary`, `outline-brand`, `danger-outline`, `ghost`, `mint`; `md`/`lg`/`xl`), `ButtonLink`, `IconButton`, `Badge` + status badges, `Card`, `Eyebrow`, `VisuallyHidden`, `StatCard`, `StatGrid`, `ProgressBar`, `TextField`, `SelectField`, `SearchInput`, `FilterChips`, `ChannelPicker`, `SegmentedControl`, `SwitchRow`, `DataTable<T>`, `SidePanel`, `BottomSheet` |
| `layout` | `AdminShell` (+ `landlordNav`, `superAdminNav`; props `user`, `onLogout`, `accountName`, `onSwitchAccount`; top bar + menu below `md`), `PageHeader`, `Tabs`, `TenantShell` (`base`), `TenantAuthLayout`, `CaretakerHeader` |
| `feedback` | `Notice`, `LoadingState`, `ErrorState`, `ComingSoon`, `UpdatePrompt` (PWA), `OfflineBanner` |
| `billing` | `BillLinesTable`, `BillTotals`, `BillDocument`, `DeliveryList`, `LeaseStatement`, `BillingRunsTable`, `ChargeRateCard`, `RateHistoryTable` |
| `payments` | `PaymentsTable`, `PaymentOutcomeBadge`, `UnmatchedPaymentRow`, `RecordPaymentPanel` (live balance-after, API `errors`) |
| `readings` | `MeterReadingCard`, `ReadingTaskLink` |
| `dashboard` | `AttentionPanel`, `AttentionItem`, `CollectionBars`, `AmountRow` |
| `tenant` | `AmountDueCard`, `TenantBillCard`, `PaymentHistoryList`, `HomeChoiceList` |
| `units` | `MoveInPanel` |

Icons: `packages/ui/src/icons.tsx` (stroke SVGs, `currentColor`, aria-hidden).

## Current state

- **Connected:** admin login/logout + role-based nav (caretakers: Dashboard, Meter readings, Payments),
  Payments (list, pagination, record cash/bank/cheque), Bill detail, Billing runs (list + run now),
  WhatsApp settings; tenant login (with "Which home?"), logout, profile.
- **Coming soon (designed, waiting for an API):** dashboard, properties/units, tenants, meter readings
  (incl. caretaker phone screens), bills list, team, platform/*, tenant bills/payments/M-Pesa, invitation accept.

## Next steps

1. Wire the designed screens as the backend's admin API grows (properties, units, charge rates, tenants +
   invitations, leases, meter readings): add hooks in `@rentflow/api`, swap `ComingSoon` for the page.
2. Tenant portal API → `AmountDueCard`, `TenantBillCard`, `PaymentHistoryList`, accept invitation.
3. Lease search for `RecordPaymentPanel` (replace the lease-number field) once a leases API exists.
4. Super-admin account switcher (`X-Account-Id`).
5. Component tests (Testing Library) for `RecordPaymentPanel` / `MeterReadingCard` live calculations.
6. Store release: decide the domain → real app IDs + `VITE_API_URL` (https), signing keys, Play Store / App Store
   listings; deep links for tenant invitations (`/invite/:token`); push notifications for new bills.
