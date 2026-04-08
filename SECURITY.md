# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in FinViz, please report it
responsibly:

1. **Do not** open a public GitHub issue.
2. Email **[your-email@example.com]** with a description of the issue,
   steps to reproduce, and any relevant logs or screenshots.
3. You will receive an acknowledgement within **48 hours**.
4. A fix will be developed privately and released as a patch before the
   issue is disclosed publicly.

## Security Architecture

### Authentication

- Login uses Supabase Auth's `signInWithPassword` directly.
- **No public signup** — users are created via CLI
  (`setup/create-user.sh`), not self-registration.

### Data Isolation

- All data tables use **Row-Level Security (RLS)** policies scoped to
  `auth.uid()`. Users can only access their own data.
- The `service_role` key bypasses RLS and must **never** be exposed to the
  browser or committed to source control.

### Secrets & Environment Variables

| Secret | Exposure | Notes |
| --- | --- | --- |
| `ANON_KEY` | Client-side (safe) | Publishable by design; RLS enforces access |
| `SERVICE_ROLE_KEY` | Server-side only | Bypasses RLS — keep in Docker env only |
| `JWT_SECRET` | Server-side only | Used to sign auth tokens — generate with `openssl rand -base64 32` |
| `VITE_*` variables | **Baked into JS bundle** | Visible to anyone inspecting the app — never put real credentials here |

### Self-Hosting Hardening

- Serve behind **HTTPS** (Caddy, nginx + Let's Encrypt, Cloudflare Tunnel).
- Restrict network access via **VPN**, **Tailscale**, or
  **Cloudflare Access**.
- Pin Docker image versions and regularly pull security patches.
- Rotate `JWT_SECRET` periodically and invalidate existing sessions.

## Supported Versions

Only the latest release is actively supported with security updates.
