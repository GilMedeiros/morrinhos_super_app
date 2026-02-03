## Quick orientation for AI coding agents

This repository is a Vite + React + TypeScript frontend scaffold (shadcn-ui + Tailwind) with Supabase as the primary backend/integration. Keep suggestions tightly scoped to the actual code and files below.

Key facts (read before changing code):

- App entry: `src/main.tsx` -> `src/App.tsx`. Routing and protected routes live under `src/components` and `src/pages`.
- Supabase client is generated at `src/integrations/supabase/client.ts`. Auth flows use `src/hooks/useAuth.tsx` and expect the published (public) key and URL to exist in the generated client.
- UI patterns use shadcn-style components under `src/components/*` and small focused hooks in `src/hooks/*`. Look for `useToast`, `useAuth`, `useNotifications`.

Build & dev commands (use these exact npm scripts):

- npm run dev — start Vite dev server (default port 8080 as configured in `vite.config.ts`).
- npm run build — production build (or `npm run build:dev` for a dev-mode build).
- npm run preview — preview the production build.

Developer conventions and patterns to follow:

- TypeScript strictness: files use typed React components; prefer adding narrow types rather than using `any`.
- Single responsibility components: many small components live under `src/components/*` and pages under `src/pages/*`. When adding a new page, register routes in `src/App.tsx` rather than modifying multiple files.
- Hooks live in `src/hooks/` and encapsulate side effects (auth, mobile detection, notifications). Reuse these hooks instead of reimplementing the same logic in components.

Supabase & auth notes (critical):

- The repo includes a generated supabase client (`src/integrations/supabase/client.ts`) with a published URL and key. Treat this file as the single source for supabase usage. Import via:

  import { supabase } from '@/integrations/supabase/client'

- Auth flows use `supabase.auth` and expect session persistence in localStorage (see `useAuth.tsx`). When modifying auth behavior, update the listener and session retrieval code in `useAuth.tsx`.

Patterns & examples to reference:

- Protected routes: see `src/components/ProtectedRoute.tsx` for how authenticated access is enforced.
- Dialogs and UI primitives: components often wrap Radix UI + Tailwind (e.g., `src/components/ui/*`). Follow the existing className and variant patterns.
- API interactions: the app uses `@tanstack/react-query` for data fetching. Favor queries/mutations with optimistic updates where appropriate.

Files to read first for most tasks:

- `src/App.tsx` — routing and high-level layout
- `src/integrations/supabase/client.ts` — supabase client and keys
- `src/hooks/useAuth.tsx` — auth flow and session handling
- `src/components/Layout.tsx` and `src/components/AppSidebar.tsx` — main layout and navigation

When creating or editing code:

- Preserve existing patterns: small, testable components; use provided hooks; follow TypeScript types.
- When introducing new environment variables or secrets, do not commit them to the repo — follow the generated client pattern or add to local env files as needed.

Testing & verification:

- Fast feedback loop: run `npm run dev` and use the browser to exercise routes. The dev server runs on port 8080 by default (see `vite.config.ts`).

If you need clarification from a human:

- Ask where new routes/components should be registered (App.tsx) and whether a new supabase RLS / function is required before wiring UI.

Be conservative: avoid sweeping refactors unless requested. Prefer minimal, isolated changes with clear file-level diffs.

---
If any of the above is out-of-date, show the diff you plan to make and ask for confirmation before changing generated files (especially `src/integrations/supabase/client.ts`).
