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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
