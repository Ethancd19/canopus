# Canopus

Photography portfolio. Next.js 16, Prisma 7 on Neon Postgres, NextAuth v5.

## Setup

Requires Node 26 or newer (the hash script relies on Node's built-in TypeScript support).

```bash
npm install
cp .env.example .env.local   # fill in the values
npx prisma generate
npm run dev
```

### Admin password

The admin login compares against a bcrypt hash in `ADMIN_PASSWORD_HASH`:

```bash
printf '%s' 'your password' | npm run -s hash-password
```

Paste the output into `.env.local` (and into your host's environment settings). Set `ADMIN_PASSWORD_HASH` on your host before deploying; without it, admin login is disabled and the server logs a warning.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Prisma generate + Next dev server |
| `npm run build` | Production build |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run lint` | ESLint |
| `npm run hash-password` | Hash an admin password from stdin |

The test scripts pass `--no-deprecation` to hide Node's DEP0205 warning emitted by Vite's loader on Node 26; remove the flag once Vite no longer calls `module.register()`.

## Admin

- `/admin/login` is public. Everything else under `/admin` requires a session.
- Every `/api/admin/*` route returns `401 { ok: false, error: "unauthorized" }` without a session.

## Design docs

- `docs/superpowers/specs/` holds design specs.
- `docs/superpowers/plans/` holds implementation plans.
