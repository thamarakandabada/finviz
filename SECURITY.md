# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FinViz, please report it
responsibly:

1. **Do not** open a public GitHub issue.
2. Open a [private security advisory](https://github.com/thamarakandabada/finviz/security/advisories/new)
   on GitHub with a description of the issue, steps to reproduce, and any
   relevant logs or screenshots.
3. You will receive an acknowledgement within a reasonable timeframe.
4. A fix will be developed privately and released as a patch before the
   issue is disclosed publicly.

## Security Architecture

### Authentication

- Login uses Supabase Auth's `signInWithPassword` directly.
- **No public signup** — users are created via CLI
  (`setup/create-user.sh`), not self-registration.
- **Client-side rate limiting** — after 5 failed login attempts, the
  form locks out for 30 seconds to slow brute-force attacks.
- **Idle session timeout** — sessions are automatically signed out
  after 30 minutes of inactivity (mouse, keyboard, touch, scroll).

### Data Isolation

- All data tables use **Row-Level Security (RLS)** policies scoped to
  `auth.uid()`. Users can only access their own data.
- The `service_role` key bypasses RLS and must **never** be exposed to the
  browser or committed to source control.

### Demo Mode Protection

When running a public demo, the demo user account has **full write access**
with automatic data restoration:

- A `demo_users` table tracks which user IDs are demo accounts.
- Demo users can **upload, edit, and delete** data freely — this lets
  visitors experience the full app without restrictions.
- A `SECURITY DEFINER` function (`is_demo_user`) identifies demo accounts
  server-side and cannot be bypassed from the client.
- An **Edge Function** (`reset-demo-data`) restores the sample dataset
  automatically. It runs on an **hourly schedule** via `pg_cron` but is
  smart enough to skip the reset if the data is already intact (saving
  resources).
- To mark a user as demo, run `setup/mark-demo-user.sh <email>`.

### Secrets & Environment Variables

| Secret | Exposure | Notes |
| --- | --- | --- |
| `ANON_KEY` | Client-side (safe) | Publishable by design; RLS enforces access |
| `SERVICE_ROLE_KEY` | Server-side only | Bypasses RLS — keep in Docker env only |
| `JWT_SECRET` | Server-side only | Used to sign auth tokens — generate with `openssl rand -base64 32` |
| `VITE_*` variables | **Baked into JS bundle** | Visible to anyone inspecting the app — never put real credentials here |

### Self-Hosting Hardening

- Serve behind **HTTPS** (Caddy, nginx + Let's Encrypt, Cloudflare Tunnel).
- The included `setup/nginx.conf` sets **Content Security Policy**,
  `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and
  `Referrer-Policy` headers by default.
- Restrict network access via **VPN**, **Tailscale**, or
  **Cloudflare Access**.
- Pin Docker image versions and regularly pull security patches.
- Rotate `JWT_SECRET` periodically and invalidate existing sessions.

## Supported Versions

Only the latest release is actively supported with security updates.
