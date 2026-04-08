# FinViz — Personal Finance Data Visualiser

A self-hosted financial dashboard that turns CSV exports from double-entry
bookkeeping apps into interactive visualisations.

> **Disclaimer:** This tool is for data visualisation only and does not
> constitute financial advice.

## ⚠️ Important: Double-Entry Bookkeeping Only

FinViz is designed exclusively for **double-entry bookkeeping** data. It
expects CSV exports where every transaction has both an account and a
counter-account (the "from" and "to" sides of each entry).

### What works

- [Finances 2](https://hochsteger.com/finances/) (macOS/iOS) — default
  column mapping matches out of the box
- Any app that exports CSV with columns for: date, account, amount,
  currency, category, counter-account, note, payee, and cleared status

### What doesn't work

- Bank statement CSVs (single-entry, no counter-account)
- Mint / YNAB / Copilot exports (category-based, not double-entry)
- Spreadsheets without a consistent column structure

If your app uses double-entry bookkeeping but a different column order,
you can remap the columns — see [CSV Column Mapping](#csv-column-mapping)
below.

## Features

- 📊 **Net worth tracking** — assets, liabilities, and trends over time
- 📈 **Income vs expenses** — monthly bar charts with MoM deltas
- 🥧 **Category breakdowns** — Sankey diagrams for spending and income
- 💰 **Savings rate** — trend line with automatic calculation
- 🔮 **Expense forecasting** — weighted moving average predictions
- ⏳ **Life runway** — how long your liquid assets last at current burn
- 📄 **Reports** — printable year-end, 6-month, and 12-month summaries
- 🔐 **Secure** — RLS-protected, per-user data isolation

## Self-Hosting Guide

FinViz is designed to be self-hosted. Each deployment is a private,
single-user instance — there is no shared multi-tenant service.

### Prerequisites

| Requirement | Notes |
| --- | --- |
| [Docker](https://docs.docker.com/get-docker/) & Docker Compose | Required for the full stack |
| [Node.js 20+](https://nodejs.org/) | Only needed for local development |
| A machine or VPS | Any Linux box, Raspberry Pi, or cloud VM works |

### Step 1: Clone & configure

```bash
git clone https://github.com/thamarakandabada/finviz.git
cd finviz
cp .env.example .env
```

Open `.env` and fill in the required values:

| Variable | What to set |
| --- | --- |
| `POSTGRES_PASSWORD` | A strong random password for the database |
| `JWT_SECRET` | Generate with `openssl rand -base64 32` |
| `ANON_KEY` | Supabase anon key (see Supabase docs) |
| `SERVICE_ROLE_KEY` | Supabase service-role key (**never expose this**) |

> **Security note:** The `SERVICE_ROLE_KEY` bypasses all Row-Level Security.
> It must only be used server-side (Edge Functions, CLI scripts) and never
> exposed to the browser.

### Step 2: Start the stack

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** — database with RLS policies
- **Supabase Auth** — handles authentication
- **PostgREST** — auto-generated REST API
- **FinViz app** — the frontend on port 3000

### Step 3: Create your user

```bash
chmod +x setup/create-user.sh
./setup/create-user.sh you@example.com yourpassword
```

There is no public signup — users are created via CLI only.

### Step 4: Open the app

Visit [http://localhost:3000](http://localhost:3000) and sign in.

### Step 5: Secure your instance

| Layer | What to do |
| --- | --- |
| **HTTPS** | Put the app behind a reverse proxy with TLS (Caddy, nginx + Let's Encrypt, Cloudflare Tunnel). See `setup/nginx.conf` for a starting point. |
| **Network** | Restrict access via VPN, Tailscale, or Cloudflare Access for maximum security. |
| **Updates** | Pin Docker image versions and pull security patches regularly. |
| **Backups** | Back up the `db-data` Docker volume regularly. |

### Updating

```bash
git pull
docker compose down
docker compose up -d --build
```

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

### Account Classification

Accounts are automatically classified as **assets** or **liabilities**
based on their name. Accounts containing "credit card", "loan", or
"prepaid loan fees" are treated as liabilities; everything else is an
asset. To customise this, edit `classifyAccount()` in
`src/lib/csv-parser.ts`.

## ⚠️ `VITE_` Environment Variables Are Public

Vite inlines any variable prefixed with `VITE_` into the JavaScript bundle
at build time. This means values like `VITE_DEMO_EMAIL` and
`VITE_DEMO_PASSWORD` are **visible to anyone** who inspects the built
assets. This is intentional for demo mode, but:

- **Never** put real credentials in `VITE_` variables.
- **Never** set `VITE_DEMO_PASSWORD` to a password you use elsewhere.
- Server-side secrets (`JWT_SECRET`, `SERVICE_ROLE_KEY`) must **only** be
  set in the Docker environment or Edge Function secrets — they are never
  exposed to the browser.

## Running as a Public Demo

If you want to host a read-only public demo:

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
│   ├── AppFooter.tsx     # Shared footer with GitHub & colophon links
│   ├── AuthProvider.tsx  # Auth context
│   └── FinancialReport.tsx  # Printable reports
├── pages/
│   ├── FinancialDashboard.tsx  # Main dashboard
│   ├── Login.tsx         # Login page
│   └── Colophon.tsx      # About/tech stack page
setup/
├── schema.sql            # Database schema
├── create-user.sh        # User creation script
└── nginx.conf            # Production nginx config
```

## Security

See [SECURITY.md](SECURITY.md) for the full security architecture,
responsible disclosure policy, and hardening recommendations.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
