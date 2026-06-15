# Deploying SeaPole TMS to Railway

This is the step-by-step runbook for hosting the app on [Railway](https://railway.com) for client
testing. The repo already contains everything Railway needs:

- **`railway.json`** — tells Railway to build with Nixpacks, run database migrations + the
  super-admin seed before each deploy (`preDeployCommand`), start the app, and health-check
  `/api/health`.
- **`package.json`** — pins Node/pnpm (`engines`, `packageManager`) and keeps `prisma` / `tsx` /
  `dotenv` as runtime dependencies so the pre-deploy migrate + seed work.

You only need to provide the things that can't live in the repo: a Railway project, a Postgres
database, and the secret/URL environment variables.

---

## 1. Create the project and database

1. Sign in to Railway with GitHub.
2. **New Project**.
3. In the project, **New → Database → Add PostgreSQL**. Railway provisions and manages it; nothing
   else to configure.

## 2. Add the app service

1. **New → GitHub Repo** → authorize Railway to access **`frhnx11/seapolerp`** → select it.
2. Railway may kick off a first build that **fails** because the environment variables aren't set
   yet — that's expected. Set them in the next step and it will redeploy.

## 3. Set environment variables (on the app service, not the database)

Open the app service → **Variables** and add:

| Variable             | Value                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| `DATABASE_URL`       | `${{Postgres.DATABASE_URL}}` — a reference to the Postgres plugin (private network) |
| `BETTER_AUTH_SECRET` | a strong random secret (see below)                                                  |
| `HUSKY`              | `0` — skips git hooks during the CI install                                         |

Generate the secret locally and paste the output:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> `NODE_ENV=production` is set automatically by Railway/Nixpacks — you don't need to add it.

## 4. Generate the public domain and set `BETTER_AUTH_URL`

1. App service → **Settings → Networking → Generate Domain**. Copy the
   `https://<something>.up.railway.app` URL.
2. Back in **Variables**, add:

   | Variable          | Value                                                  |
   | ----------------- | ------------------------------------------------------ |
   | `BETTER_AUTH_URL` | the exact https domain from step 1 (no trailing slash) |

Saving variables triggers a redeploy. `BETTER_AUTH_URL` **must** match the real domain or login
cookies won't work.

## 5. Wait for the deploy

Watch the deploy logs. A healthy deploy shows:

1. **Build** — `prisma generate && next build` completes.
2. **Pre-deploy** — `prisma migrate deploy` applies all migrations, then the seed prints
   `Seeded super admin: superadmin@seapolerp.com` (or "already exists" on later deploys).
3. **Health check** — `/api/health` returns `200` and the deployment goes live.

Sanity check: open `https://<domain>/api/health` → it should return
`{ "status": "ok", "database": "up", ... }`.

---

## 6. First login and handing it to the client

1. Open the Railway URL and log in as the bootstrapped super admin:
   - **Username:** `superadmin@seapolerp.com`
   - **Password:** `1234567890`
2. **Immediately change the super-admin password** (Profile → Change Password). The default is
   public in the repo seed, so rotate it before sharing the URL.
3. Go to **Settings → "Clear all data and fill with sample"** and type `RESET` to confirm. This
   seeds master data, ~100 trucks, and vessels, and creates four ready-to-use staff accounts. The
   page then shows their usernames.
4. Share the URL and those logins with the client. All sample staff accounts use the password
   `123456`:
   - **Joseph** — Admin
   - **Ramesh** — Port Weighbridge
   - **Suresh** — Party Weighbridge
   - **Rajesh** — Accountant

---

## How deploys work after this

Every push to the GitHub `main` branch triggers a new Railway build. Migrations run automatically
via the `preDeployCommand`; if they fail, Railway keeps the previous version running. The seed is
idempotent, so it only creates the super admin if it's missing — it never overwrites data.

To reset the database for a fresh testing round, use **Settings → Clear all data** (or **Clear all
data and fill with sample**) in the app — no redeploy needed.

## Troubleshooting

- **Build fails on a Zod env error** — a required variable (`DATABASE_URL` or `BETTER_AUTH_SECRET`)
  isn't set on the app service. Add it and redeploy.
- **Login redirects in a loop / cookies rejected** — `BETTER_AUTH_URL` doesn't match the live
  domain. Set it to the exact `https://…up.railway.app` URL and redeploy.
- **Health check never turns green** — check the pre-deploy logs; usually `DATABASE_URL` isn't
  referencing the Postgres plugin (`${{Postgres.DATABASE_URL}}`).
