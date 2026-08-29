# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LIMPIEZIOT — PWA for monitoring and managing a network of ESP32-based vending machines that dispense liquid cleaning products (tanks, sales, cash balance, physical security alerts). React 18 + Vite 6 + Tailwind CSS + Supabase, deployed to Cloudflare Pages (production: https://sw-pwa-vm-management.pages.dev/). UI text, comments, and commit context are in Spanish.

## Commands

```bash
npm run dev       # Vite dev server at http://localhost:5173
npm run build     # Production build to dist/
npm run preview   # Serve the production build locally
```

There are no tests. `npm run lint` is defined in package.json but ESLint is not installed, so it fails — don't rely on it.

`node scripts/build-icons.mjs` regenerates `public/` icons from `src/assets/logo-source.png` (requires the `sharp` devDependency; not part of the production bundle).

## Environment / Demo Mode

Supabase credentials come from `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; template in `.env.example`). **Only variables prefixed `VITE_` reach the browser** — the unprefixed `SUPABASE_SERVICE_ROLE_KEY` in `.env` is for the webhook and must never gain a `VITE_` prefix.

The central switch is `isSupabaseConfigured` in `src/lib/supabaseClient.js`: when keys are missing or still placeholders, `supabase` is `null` and the app runs in **Demo Mode** against `src/mock/sampleData.js`.

**Demo Mode is entered ONLY by missing configuration — never by a failed query.** All services go through `query()` / `mutate()` in `src/lib/dataAccess.js`, which log the PostgREST `code`/`message`/`hint` and throw a `ServiceError`. Pages render `<ErrorState>`.

> This replaced the previous `if (!error) return data;` pattern, where a schema mismatch silently returned mock data and the UI displayed fabricated figures as if they were real. **Do not reintroduce it.** When adding a service, use `query()`/`mutate()` and keep the demo branch's filtering semantics equivalent to the Supabase branch.

`src/mock/sampleData.js` mirrors the real schema, including the edge cases of the sale-income link: mixed payment, two incomes of the same type, failed sale with no income, legacy `tx_id: null`, orphan income, and success-without-income.

## Architecture

- **Routing** (`src/App.jsx`): public routes `/landing` and `/login`; everything else is nested under a `ProtectedRoute` + `Layout` (Sidebar/Navbar shell rendering pages via Outlet). Unauthenticated users are redirected to `/landing`. SPA routing on Cloudflare Pages depends on `public/_redirects` (`/* /index.html 200`).
- **Auth & roles** (`src/context/AuthContext.jsx`): wraps Supabase Auth (email/password + Google OAuth) with a demo fallback (`loginWithEmail` matches against `sampleProfiles`; `switchDemoRole` swaps demo roles). After login it fetches the user's row from the `profiles` table. Roles are `admin | technician | viewer`; consume them via `useAuth()`'s `role`, `isAdmin`, `isTechnician` (technician check includes admin), and `isDemo`.
- **Multi-tenant scoping**: `profiles.assigned_machine_ids` (TEXT[]) limits which machines a non-admin user sees; `getMachines(assignedIds)` filters on it. Admins manage assignments in `src/pages/Users.jsx`.
- **Data layer** (`src/services/*.js`): plain async functions per domain; no state library. Every read takes an optional `filters` object (`machineIds`, `productId`, `from`, `to`, ...) applied server-side via `src/services/_filters.js`. Supabase joins return related rows as arrays, so services normalize `machine_status` from array to single object.
- **Sales ↔ incomes**: there is **no FK** between `sales` and `sale_incomes`, so PostgREST cannot join them. `getSalesWithPayments()` runs two queries and merges on `(machine_id, tx_id)` using `src/lib/salesLink.js`. The relation is **1:N** (mixed payment), `tx_id` is nullable (pre-fw-2.1.0 rows), and a `status='fail'` sale never has an income. Never pair by `created_at` proximity — the webhook processes both messages concurrently.
- **Precios y niveles mínimos de tanques**: se editan **sólo** desde el botón superior «Precios y niveles mínimos» de `MachineDetail` (`TankSettingsEditor` → `saveMachineTankSettings`), nunca por tanque suelto: el downlink `{device_id}/config/prices` lleva siempre los 8 tanques y el firmware no admite actualización parcial. `price_per_liter` y `low_threshold_liters` deben ser **> 0**, validado en cliente antes de escribir en `machine_tanks`: el firmware descarta en silencio cualquier valor `<= 0` y `mqtt-publisher` responde 400, así que un 0 se guardaría en la base pero jamás llegaría al equipo y la máquina quedaría «Pendiente de sincronizar» de forma permanente, con la base y la máquina discrepantes. **No relajar esa validación a `>= 0`.**
- **Design tokens**: colors are CSS variables in `src/styles/tokens.css`, exposed through `tailwind.config.js` as `rgb(var(--x) / <alpha-value>)`. `brand` and `slate` are **overridden** to read tokens, which is why the palette changed without editing ~1000 utility classes. New code should use the semantic tokens (`surface`, `line`, `content`, `accent`, `status`). To recolor the brand: the three `--brand-*` primitives plus `BRAND_HEX` in `src/theme/brand.js`, then `node scripts/build-icons.mjs`.
- **Data flow (big picture)**: ESP32 machines publish MQTT (sales, income, telemetry/security, alerts) → a backend consumer writes to Supabase tables (`machines`, `machine_status`, `machine_tanks`, `sales`, `sale_incomes`, `tank_operations`, `system_alerts`) → this PWA reads them. The PWA never talks to MQTT; it only reads/writes Supabase.
- **PWA** (`vite.config.js`): `vite-plugin-pwa` with autoUpdate; Supabase API responses are cached NetworkFirst for 24h by Workbox — stale data after connectivity loss is expected behavior, not a bug.

## Internal docs

`.doc/` is gitignored (kept out of the public repo intentionally) but present locally: `architecture_proposal.md` (frontend), `backend_architecture_proposal.md` (MQTT consumer + table mapping, includes payload examples), `PROJECT_CONTEXT.md` (deployment/DB context), `DEPLOYMENT_GUIDE.md`. Consult these before making schema or architecture assumptions.
