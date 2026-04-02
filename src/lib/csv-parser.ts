import { CSV_COLUMNS, type CSVColumnMap } from "./app-config";

export interface RawTransaction {
  date: string;
  account: string;
  amount: number;
  currency: string;
  category: string;
  counterAccount: string;
  note: string;
  payee: string;
  cleared: boolean;
}

export function parseFinanceCSV(csvText: string, map: CSVColumnMap = CSV_COLUMNS): RawTransaction[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const rows: RawTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < map.minColumns) continue;

    rows.push({
      date: fields[map.date],
      account: fields[map.account],
      amount: parseFloat(fields[map.amount]) || 0,
      currency: fields[map.currency] || "GBP",
      category: fields[map.category],
      counterAccount: fields[map.counterAccount],
      note: fields[map.note],
      payee: fields[map.payee],
      cleared: fields[map.cleared]?.trim() === map.clearedValue,
    });
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Check if an account is illiquid (pension, etc.) */
export function isIlliquidAccount(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("pension");
}

/** Check if an income category is illiquid (pension growth, etc.) */
export function isIlliquidIncome(category: string): boolean {
  const lower = category.toLowerCase();
  return lower.includes("pension growth");
}

/** Classify an account name into asset/liability */
export function classifyAccount(name: string): "asset" | "liability" {
  const lower = name.toLowerCase();
  if (lower.includes("credit card") || lower.includes("loan") || lower.includes("prepaid loan fees")) {
    return "liability";
  }
  return "asset";
}

/** Check if a transaction is a transfer between own accounts */
export function isTransfer(tx: RawTransaction): boolean {
  return !!tx.counterAccount && tx.counterAccount !== "Opening Balance";
}

/** Check if a transaction is an opening balance */
export function isOpeningBalance(tx: RawTransaction): boolean {
  return tx.counterAccount === "Opening Balance";
}

/** Get top-level category from hierarchical category string */
export function topCategory(cat: string): string {
  if (!cat) return "Uncategorised";
  return cat.split(":")[0];
}
