# FinViz — Personal Finance Data Visualiser

A self-hosted financial dashboard that turns CSV exports from double-entry
bookkeeping apps (like Finances 2) into interactive visualisations.

> **Disclaimer:** This tool is for data visualisation only and does not
> constitute financial advice.

## Features

- 📊 **Net worth tracking** — assets, liabilities, and trends over time
- 📈 **Income vs expenses** — monthly bar charts with MoM deltas
- 🥧 **Category breakdowns** — Sankey diagrams for spending and income
- 💰 **Savings rate** — trend line with automatic calculation
- 🔮 **Expense forecasting** — weighted moving average predictions
- ⏳ **Life runway** — how long your liquid assets last at current burn
- 📄 **Reports** — printable year-end, 6-month, and 12-month summaries
- 🔐 **Secure** — RLS-protected, IP rate-limiting, per-user data isolation

## Quick Start (Self-Hosted)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Node.js 20+](https://nodejs.org/) (for local development only)

### 1. Clone & configure

```bash
git clone <repo-url> && cd finviz
cp .env.example .env
# Edit .env — set passwords, JWT secret, and Supabase keys
```

### 2. Start the stack

```bash
docker compose up -d
```

This starts Postgres, Supabase Auth, PostgREST, and the FinViz app.

### 3. Create your first user

```bash
chmod +x setup/create-user.sh
./setup/create-user.sh you@example.com yourpassword
```

### 4. Open the app

Visit [http://localhost:3000](http://localhost:3000) and sign in.

## Configuration

All configuration lives in `src/lib/app-config.ts` and can be overridden
via environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_CURRENCY_CODE` | `GBP` | ISO 4217 currency code |
| `VITE_LOCALE` | `en-GB` | BCP 47 locale for number formatting |
| `VITE_DEMO_MODE` | `false` | Show demo banner & pre-fill credentials |
| `VITE_DEMO_EMAIL` | *(empty)* | Email pre-filled in demo mode |
| `VITE_DEMO_PASSWORD` | *(empty)* | Password pre-filled in demo mode |

### CSV Column Mapping

The default column map matches **Finances 2** CSV exports. If your app uses
a different column layout, edit the `CSV_COLUMNS` object in
`src/lib/app-config.ts`:

```ts
export const CSV_COLUMNS: CSVColumnMap = {
  date: 0,          // Column index for transaction date
  account: 1,       // Account name
  amount: 2,        // Transaction amount
  currency: 3,      // Currency code
  category: 4,      // Category (supports hierarchical "Parent:Child")
  counterAccount: 5, // Counter-account for transfers
  note: 6,          // Transaction note/memo
  payee: 7,         // Payee name
  cleared: 9,       // Cleared status column
  minColumns: 10,   // Minimum columns for a valid row
  clearedValue: "*", // Value that means "cleared"
};
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** Supabase (Postgres + Auth + REST API)
- **Deployment:** Docker Compose or any static host + Supabase

## Development

```bash
npm install
npm run dev        # Start dev server on :5173
npm run build      # Production build
npm run test       # Run tests
```

## Project Structure

```
src/
├── lib/
│   ├── app-config.ts    # Currency, locale, CSV column mapping
│   └── csv-parser.ts    # CSV parsing & account classification
├── components/
│   ├── AuthProvider.tsx  # Auth context
│   └── FinancialReport.tsx  # Printable reports
├── pages/
│   ├── FinancialDashboard.tsx  # Main dashboard
│   └── Login.tsx        # Login page
setup/
├── schema.sql           # Database schema
├── create-user.sh       # User creation script
└── nginx.conf           # Production nginx config
```

## Security & Authentication

FinViz is designed as a **single-user / private-instance** tool. Each
deployment has its own database and authentication — there is no shared
multi-tenant service.

### How login works

Login is handled by a Supabase Edge Function (`supabase/functions/login/`)
that sits in front of `supabase.auth.signInWithEmailAndPassword`. It adds:

1. **IP rate-limiting** — after 3 failed attempts from the same IP in 15
   minutes the IP is banned (stored in `banned_ips`).
2. **Attempt logging** — every login attempt is recorded in
   `login_attempts` for audit.
3. **Row-Level Security** — all data tables use RLS policies scoped to
   `auth.uid()`, so users can only access their own data.

### Securing your self-hosted instance

| Layer | Recommendation |
| --- | --- |
| **Transport** | Always serve behind HTTPS (e.g. Caddy, nginx + Let's Encrypt, Cloudflare Tunnel). The included `setup/nginx.conf` is a starting point. |
| **JWT secret** | Generate a strong random secret (`openssl rand -base64 32`) and set it in `.env`. Never reuse across environments. |
| **Supabase keys** | The `anon` key is safe to expose to the browser. The `service_role` key must **never** be exposed — it bypasses RLS. Keep it in server-side env only. |
| **User creation** | Users are created via CLI (`setup/create-user.sh`), not self-registration. There is no public signup endpoint. |
| **Network** | For maximum security, restrict access to your instance via VPN, Tailscale, or Cloudflare Access. |
| **Updates** | Pin your Docker image versions and regularly pull security patches. |

### ⚠️ `VITE_` environment variables are public

Vite inlines any variable prefixed with `VITE_` into the JavaScript bundle
at build time. This means values like `VITE_DEMO_EMAIL` and
`VITE_DEMO_PASSWORD` are **visible to anyone** who inspects the built
assets. This is intentional for demo mode, but:

- **Never** put real credentials in `VITE_` variables.
- **Never** set `VITE_DEMO_PASSWORD` to a password you use elsewhere.
- Server-side secrets (JWT secret, `SERVICE_ROLE_KEY`) must **only** be set
  in the Docker environment or Supabase Edge Function secrets — they are
  never exposed to the browser.

### Running as a public demo

If you want to host a public demo (read-only, sample data):

1. Create a dedicated demo user via `setup/create-user.sh`.
2. Load sample data into that user's account.
3. Set these environment variables at build time:

   ```env
   VITE_DEMO_MODE=true
   VITE_DEMO_EMAIL=demo@example.com
   VITE_DEMO_PASSWORD=demopassword
   ```

4. The login page will show a **Demo Mode** banner with pre-filled
   credentials and a link to self-host.
5. Optionally, create a database trigger or policy to prevent writes
   for the demo user, making the experience truly read-only.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
