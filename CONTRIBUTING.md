# Contributing to FinViz

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

1. **Clone the repo** and install dependencies:
   ```bash
   git clone <repo-url> && cd finviz
   npm install
   ```

2. **Start the dev server:**
   ```bash
   npm run dev
   ```

3. The app expects a Supabase backend. For local development, either:
   - Use the provided `docker-compose.yml` (see README)
   - Or connect to your own Supabase project via `.env`

## Code Style

- TypeScript strict mode
- Functional React components with hooks
- Tailwind CSS with semantic design tokens (never hardcode colours)
- Small, focused components — one concern per file

## Pull Requests

1. Fork the repo and create a feature branch (`git checkout -b feat/my-feature`)
2. Make your changes with clear commit messages
3. Ensure `npm run build` passes without errors
4. Open a PR describing **what** changed and **why**

## CSV Compatibility

If you're adding support for a new double-entry app's CSV format, update
`src/lib/app-config.ts` with a new column mapping preset rather than
modifying the default. This keeps backward compatibility.

## Reporting Issues

Please include:
- Steps to reproduce
- Expected vs actual behaviour
- Browser and OS version
- Sample CSV (with sensitive data redacted) if relevant

## Disclaimer

This software is for data visualisation only. It does not constitute
financial advice. Contributors are not liable for decisions made based
on the tool's output.
