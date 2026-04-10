/**
 * Application configuration for self-hosted instances.
 *
 * To customise, edit the values below or override them via environment
 * variables prefixed with VITE_ (e.g. VITE_CURRENCY_CODE=USD).
 */

// ─── Demo Mode ───
// Set VITE_DEMO_MODE=true to show a demo banner on the login page,
// or leave the defaults below for the hosted demo.
export const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE ?? "true") === "true";
export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL ?? "test@test.com";
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "test1234";

// ─── Currency & Locale ───
export const CURRENCY_CODE = import.meta.env.VITE_CURRENCY_CODE ?? "GBP";
export const LOCALE = import.meta.env.VITE_LOCALE ?? "en-GB";

/** Format a number as currency using the configured locale & currency. */
export const fmt = (n: number) =>
  new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY_CODE }).format(n);

/** Format a YYYY-MM string into a short readable month (e.g. "Jan 2025"). */
export const fmtMonth = (m: string) => {
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(mo) - 1]} ${y}`;
};

// ─── CSV Column Mapping ───
// Maps the logical field names used internally to the zero-based column
// indices of your CSV export. Adjust these if your double-entry app uses
// a different column order.

export interface CSVColumnMap {
  date: number;
  account: number;
  amount: number;
  currency: number;
  category: number;
  counterAccount: number;
  note: number;
  payee: number;
  /** Index of the column whose value is checked against `clearedValue`. */
  cleared: number;
  /** The minimum number of columns a row must have to be considered valid. */
  minColumns: number;
  /** Value in the cleared column that means "cleared" (default "*"). */
  clearedValue: string;
}

/**
 * Default column map matching Finances 2 CSV export format:
 *
 *   0: Date, 1: Account, 2: Amount, 3: Currency, 4: Category,
 *   5: Counter Account, 6: Note, 7: Payee, 8: (unused), 9: Cleared
 */
export const CSV_COLUMNS: CSVColumnMap = {
  date: 0,
  account: 1,
  amount: 2,
  currency: 3,
  category: 4,
  counterAccount: 5,
  note: 6,
  payee: 7,
  cleared: 9,
  minColumns: 10,
  clearedValue: "*",
};
